"""
Whisper-based audio transcription tools for subtitle generation.
Uses faster-whisper for efficient local transcription.
"""

import os
import tempfile
import asyncio
import logging
from typing import Optional, Generator, AsyncGenerator, Tuple
from dataclasses import dataclass
from enum import Enum

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

_whisper_model_cache = None


def get_ffmpeg_paths() -> Tuple[Optional[str], Optional[str]]:
    """
    Get FFmpeg and FFprobe paths from environment variables.
    Returns (ffmpeg_path, ffprobe_path) tuple.
    """
    ffmpeg_path = os.environ.get('FFMPEG_PATH')
    ffprobe_path = os.environ.get('FFPROBE_PATH')
    return ffmpeg_path, ffprobe_path


AUDIO_EXTENSIONS = {'.mp3', '.wav', '.flac', '.aac', '.ogg', '.m4a', '.wma', '.ape', '.opus', '.aiff'}

def is_audio_file(file_path: str) -> bool:
    """
    Check if the file is an audio file based on extension.
    """
    ext = os.path.splitext(file_path)[1].lower()
    return ext in AUDIO_EXTENSIONS


# Default model download directory (Hugging Face cache)
DEFAULT_MODEL_DIR = os.path.join(os.path.expanduser("~"), ".cache", "huggingface", "hub")

# Hugging Face model repository for faster-whisper
WHISPER_MODEL_REPO = "Systran/faster-whisper-{size}"
HUGGINGFACE_URL = "https://huggingface.co/{repo}/tree/main"


def get_model_download_url(model_size: str) -> dict:
    """
    Get download URL and info for a Whisper model.
    
    Args:
        model_size: Model size (tiny/base/small/medium/large-v3)
    
    Returns:
        Dict with download URL and instructions
    """
    repo_id = WHISPER_MODEL_REPO.format(size=model_size)
    huggingface_url = HUGGINGFACE_URL.format(repo=repo_id)
    
    # Model sizes for reference
    model_sizes = {
        "tiny": "~75MB",
        "base": "~150MB", 
        "small": "~500MB",
        "medium": "~1.5GB",
        "large-v3": "~3GB",
    }
    
    return {
        "model_size": model_size,
        "huggingface_url": huggingface_url,
        "repo_id": repo_id,
        "estimated_size": model_sizes.get(model_size, "Unknown"),
        "instructions": {
            "method1": f"访问 {huggingface_url} 下载所有文件到本地目录",
            "method2": f"使用 huggingface-cli: huggingface-cli download {repo_id} --local-dir ./whisper-{model_size}",
            "method3": f"使用 git: git clone https://huggingface.co/{repo_id} whisper-{model_size}",
        }
    }


class WhisperModelSize(str, Enum):
    tiny = "tiny"
    base = "base"
    small = "small"
    medium = "medium"
    large_v3 = "large-v3"


class SubtitleFormat(str, Enum):
    srt = "srt"
    vtt = "vtt"
    ass = "ass"


@dataclass
class TranscribeProgress:
    status: str  # "loading_model" | "extracting_audio" | "transcribing" | "saving" | "result"
    progress: float  # 0.0 - 1.0
    current_time: float = 0.0  # Current processing time in seconds
    total_time: float = 0.0  # Total audio duration in seconds
    message: str = ""
    result: Optional["TranscribeResult"] = None  # Final result when status == "result"


@dataclass
class TranscribeResult:
    success: bool
    output_path: Optional[str] = None
    language: Optional[str] = None
    language_probability: Optional[float] = None
    duration: Optional[float] = None
    segments_count: int = 0
    error: Optional[str] = None
    
    def to_dict(self) -> dict:
        return {
            "success": self.success,
            "outputPath": self.output_path,
            "language": self.language,
            "languageProbability": self.language_probability,
            "duration": self.duration,
            "segmentsCount": self.segments_count,
            "error": self.error,
        }


def resolve_model_path(model_size: str, model_path: Optional[str] = None) -> str:
    """
    Resolve the model path for faster-whisper.
    
    Args:
        model_size: Model size name (tiny/base/small/medium/large-v3)
        model_path: Optional custom model root directory path
    
    Returns:
        Path or model identifier to load
    """
    logger.info(f"resolve_model_path: model_size={model_size}, model_path={model_path}")
    
    if not model_path or not os.path.isdir(model_path):
        logger.info(f"model_path is empty or not a directory, using default: {model_size}")
        return model_size
    
    logger.info(f"Checking model_path directory: {model_path}")
    
    if os.path.exists(os.path.join(model_path, "model.bin")) or \
       os.path.exists(os.path.join(model_path, "config.json")):
        logger.info(f"Found model directly in model_path: {model_path}")
        return model_path
    
    possible_subdirs = [
        os.path.join(model_path, f"faster-whisper-{model_size}"),
        os.path.join(model_path, model_size),
        os.path.join(model_path, f"models--Systran--faster-whisper-{model_size}"),
    ]
    
    if model_size == "large-v3":
        possible_subdirs.insert(1, os.path.join(model_path, "large-v3"))
    
    for subdir in possible_subdirs:
        logger.info(f"Checking subdir: {subdir}, exists={os.path.isdir(subdir)}")
        if os.path.isdir(subdir):
            has_model_bin = os.path.exists(os.path.join(subdir, "model.bin"))
            has_config = os.path.exists(os.path.join(subdir, "config.json"))
            logger.info(f"  model.bin: {has_model_bin}, config.json: {has_config}")
            if has_model_bin or has_config:
                logger.info(f"Found model in subdir: {subdir}")
                return subdir
    
    logger.info(f"No model found in model_path, falling back to: {model_size}")
    return model_size


def get_whisper_model(model_size: str = "base", model_path: Optional[str] = None):
    """
    Lazy load Whisper model.
    
    Args:
        model_size: Model size (tiny/base/small/medium/large-v3)
        model_path: Optional custom model directory path
    
    Returns:
        WhisperModel instance
    """
    global _whisper_model_cache
    
    resolved_path = resolve_model_path(model_size, model_path)
    cache_key = (model_size, model_path)
    
    if _whisper_model_cache is None or _whisper_model_cache[0] != cache_key:
        from faster_whisper import WhisperModel
        
        device = "cpu"
        compute_type = "int8"
        
        try:
            import torch
            if torch.cuda.is_available():
                device = "cuda"
                compute_type = "float16"
                logger.info("CUDA available, using GPU")
            else:
                logger.info("CUDA not available, using CPU")
        except ImportError:
            logger.info("PyTorch not installed or CUDA not available, using CPU")
        
        logger.info(f"Loading WhisperModel from: {resolved_path}, device={device}, compute_type={compute_type}")
        
        _whisper_model_cache = (cache_key, WhisperModel(
            resolved_path,
            device=device,
            compute_type=compute_type
        ))
        logger.info(f"WhisperModel loaded successfully from: {resolved_path}")
    return _whisper_model_cache[1]


def get_available_models(model_path: Optional[str] = None) -> list[dict]:
    """
    Get list of available Whisper models.
    
    Args:
        model_path: Optional custom model root directory path
    
    Returns:
        List of available models with their info
    """
    models = []
    model_sizes = ["tiny", "base", "small", "medium", "large-v3"]
    
    if model_path and os.path.isdir(model_path):
        for size in model_sizes:
            possible_paths = [
                os.path.join(model_path, f"faster-whisper-{size}"),
                os.path.join(model_path, size),
                os.path.join(model_path, f"models--Systran--faster-whisper-{size}"),
            ]
            
            if size == "large-v3":
                possible_paths.insert(1, os.path.join(model_path, "large-v3"))
            
            found = False
            for path in possible_paths:
                if os.path.isdir(path):
                    if os.path.exists(os.path.join(path, "model.bin")) or \
                       os.path.exists(os.path.join(path, "config.json")):
                        models.append({
                            "size": size,
                            "path": path,
                            "available": True,
                            "source": "local"
                        })
                        found = True
                        break
            
            if not found:
                models.append({
                    "size": size,
                    "path": None,
                    "available": False,
                    "source": "download"
                })
    else:
        cache_dir = DEFAULT_MODEL_DIR
        for size in model_sizes:
            hf_cache_path = os.path.join(cache_dir, f"models--Systran--faster-whisper-{size}")
            if os.path.isdir(hf_cache_path):
                models.append({
                    "size": size,
                    "path": hf_cache_path,
                    "available": True,
                    "source": "cache"
                })
            else:
                models.append({
                    "size": size,
                    "path": None,
                    "available": False,
                    "source": "download"
                })
    
    return models


def download_model(
    model_size: str,
    model_path: Optional[str] = None,
    progress_callback=None,
) -> dict:
    """
    Download a Whisper model.
    
    Args:
        model_size: Model size to download (tiny/base/small/medium/large-v3)
        model_path: Optional custom model root directory (subdirectory will be created for each model)
        progress_callback: Optional callback for progress updates
    
    Returns:
        Result with success status and model path
    """
    try:
        if progress_callback:
            progress_callback({"status": "starting", "progress": 0.0, "message": f"Starting download for {model_size} model..."})
        
        from faster_whisper import download_model as fw_download_model
        
        actual_output_dir = None
        if model_path:
            os.makedirs(model_path, exist_ok=True)
            actual_output_dir = os.path.join(model_path, f"faster-whisper-{model_size}")
            os.makedirs(actual_output_dir, exist_ok=True)
        
        if progress_callback:
            progress_callback({"status": "downloading", "progress": 0.1, "message": "Downloading model files..."})
        
        actual_path = fw_download_model(model_size, output_dir=actual_output_dir)
        
        if progress_callback:
            progress_callback({"status": "completed", "progress": 1.0, "message": f"Model {model_size} downloaded successfully!"})
        
        return {
            "success": True,
            "modelSize": model_size,
            "path": str(actual_path) if actual_path else None
        }
    
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }


async def download_model_async(
    model_size: str,
    model_path: Optional[str] = None,
) -> AsyncGenerator[dict, None]:
    """
    Async wrapper for download_model using queue-based progress.
    Yields progress updates and final result.
    """
    import concurrent.futures
    import queue
    
    progress_queue = queue.Queue()
    
    def progress_callback(progress: dict):
        progress_queue.put(progress)
    
    def run_download():
        result = download_model(model_size, model_path, progress_callback)
        progress_queue.put(None)  # Signal completion
        return result
    
    loop = asyncio.get_event_loop()
    
    # Start download in executor
    with concurrent.futures.ThreadPoolExecutor(max_workers=1) as executor:
        future = loop.run_in_executor(executor, run_download)
        
        # Yield progress updates
        while True:
            # Check for progress updates
            try:
                item = progress_queue.get_nowait()
                if item is None:
                    break
                yield item
            except queue.Empty:
                await asyncio.sleep(0.1)
                continue
        
        # Get final result
        result = await future
        yield {"status": "result", "progress": 1.0, "message": str(result)}


def format_time_srt(seconds: float) -> str:
    """Format time for SRT subtitle format (HH:MM:SS,mmm)."""
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    millis = int((seconds % 1) * 1000)
    return f"{hours:02d}:{minutes:02d}:{secs:02d},{millis:03d}"


def format_time_vtt(seconds: float) -> str:
    """Format time for WebVTT subtitle format (HH:MM:SS.mmm)."""
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    millis = int((seconds % 1) * 1000)
    return f"{hours:02d}:{minutes:02d}:{secs:02d}.{millis:03d}"


def format_time_ass(seconds: float) -> str:
    """Format time for ASS subtitle format (H:MM:SS.cc)."""
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    centis = int((seconds % 1) * 100)
    return f"{hours}:{minutes:02d}:{secs:02d}.{centis:02d}"


def extract_audio(video_path: str, audio_path: str) -> Tuple[bool, str]:
    """Extract audio from video file using ffmpeg.
    
    Returns:
        Tuple of (success, error_message). error_message is empty string on success.
    """
    import ffmpeg
    
    if not os.path.exists(video_path):
        return False, f"Video file not found: {video_path}"
    
    ffmpeg_path, _ = get_ffmpeg_paths()
    
    try:
        stream = (
            ffmpeg
            .input(video_path)
            .output(audio_path, ac=1, ar=16000, format='wav')
            .overwrite_output()
        )
        if ffmpeg_path:
            stream.run(quiet=True, capture_stdout=True, capture_stderr=True, cmd=ffmpeg_path)
        else:
            stream.run(quiet=True, capture_stdout=True, capture_stderr=True)
        
        if not os.path.exists(audio_path):
            return False, "Audio file was not created - video may have no audio stream"
        
        file_size = os.path.getsize(audio_path)
        if file_size == 0:
            return False, "Audio file is empty (0 bytes) - video may have no audio stream"
        
        logger.info(f"Audio extracted successfully: {audio_path} ({file_size} bytes)")
        return True, ""
        
    except ffmpeg.Error as e:
        error_msg = e.stderr.decode() if e.stderr else str(e)
        logger.error(f"FFmpeg error during audio extraction: {error_msg}")
        return False, f"FFmpeg error: {error_msg}"
    except Exception as e:
        logger.error(f"Unexpected error during audio extraction: {str(e)}")
        return False, f"Unexpected error: {str(e)}"


def write_srt(output_path: str, segments) -> None:
    """Write segments to SRT format."""
    with open(output_path, "w", encoding="utf-8") as f:
        for i, segment in enumerate(segments, 1):
            f.write(f"{i}\n")
            f.write(f"{format_time_srt(segment.start)} --> {format_time_srt(segment.end)}\n")
            text = segment.text.strip()
            f.write(f"{text}\n\n")


def write_vtt(output_path: str, segments) -> None:
    """Write segments to WebVTT format."""
    with open(output_path, "w", encoding="utf-8") as f:
        f.write("WEBVTT\n\n")
        for segment in segments:
            f.write(f"{format_time_vtt(segment.start)} --> {format_time_vtt(segment.end)}\n")
            text = segment.text.strip()
            f.write(f"{text}\n\n")


def write_ass(output_path: str, segments) -> None:
    """Write segments to ASS format with default styling."""
    with open(output_path, "w", encoding="utf-8") as f:
        # ASS header
        f.write("[Script Info]\n")
        f.write("Title: Subtitles\n")
        f.write("ScriptType: v4.00+\n")
        f.write("PlayResX: 1920\n")
        f.write("PlayResY: 1080\n")
        f.write("\n")
        f.write("[V4+ Styles]\n")
        f.write("Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\n")
        f.write("Style: Default,Arial,48,&H00FFFFFF,&H000000FF,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,2,2,2,10,10,10,1\n")
        f.write("\n")
        f.write("[Events]\n")
        f.write("Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n")
        
        for segment in segments:
            start = format_time_ass(segment.start)
            end = format_time_ass(segment.end)
            text = segment.text.strip().replace("\n", "\\N")
            f.write(f"Dialogue: 0,{start},{end},Default,,0,0,0,,{text}\n")


def transcribe_audio(
    input_path: str,
    output_path: str,
    language: Optional[str] = None,
    model_size: str = "base",
    output_format: str = "srt",
    model_path: Optional[str] = None,
    progress_callback=None,
) -> Generator[TranscribeProgress, None, None]:
    """
    Transcribe audio from video or audio file and generate subtitles.
    
    Args:
        input_path: Path to input video or audio file
        output_path: Path to output subtitle file
        language: Language code (None for auto-detect, "zh", "en", "ja", etc.)
        model_size: Whisper model size (tiny/base/small/medium/large-v3)
        output_format: Output format (srt/vtt/ass)
        model_path: Optional custom model directory path
        progress_callback: Optional callback for progress updates
    
    Yields:
        TranscribeProgress objects during processing
    
    Returns:
        TranscribeResult with final status
    """
    audio_path = None
    is_audio = is_audio_file(input_path)
    
    logger.info(f"Starting transcription: input={input_path}, model={model_size}, format={output_format}, is_audio={is_audio}")
    
    if not os.path.exists(input_path):
        error_msg = f"File not found: {input_path}"
        logger.error(error_msg)
        yield TranscribeProgress(
            status="result",
            progress=1.0,
            result=TranscribeResult(success=False, error=error_msg)
        )
        return
    
    if not output_path:
        base_name = os.path.splitext(os.path.basename(input_path))[0]
        input_dir = os.path.dirname(input_path)
        output_path = os.path.join(input_dir, f"{base_name}.{output_format}")
    
    logger.info(f"Output path: {output_path}")
    
    try:
        if is_audio:
            audio_path = input_path
            logger.info(f"Input is audio file, skipping extraction")
        else:
            yield TranscribeProgress(
                status="extracting_audio",
                progress=0.0,
                message="Extracting audio from video..."
            )
            
            with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
                audio_path = tmp.name
            
            logger.info(f"Created temp audio file: {audio_path}")
            
            success, error_msg = extract_audio(input_path, audio_path)
            if not success:
                logger.error(f"Audio extraction failed: {error_msg}")
                yield TranscribeProgress(
                    status="result",
                    progress=1.0,
                    result=TranscribeResult(success=False, error=f"音频提取失败: {error_msg}")
                )
                return
        
        yield TranscribeProgress(
            status="loading_model",
            progress=0.1 if not is_audio else 0.0,
            message=f"Loading Whisper {model_size} model..."
        )
        
        logger.info(f"Loading Whisper model: size={model_size}, model_path={model_path}")
        
        try:
            model = get_whisper_model(model_size, model_path)
            logger.info("Model loaded successfully")
        except Exception as e:
            error_msg = f"模型加载失败: {str(e)}"
            logger.error(error_msg)
            yield TranscribeProgress(
                status="result",
                progress=1.0,
                result=TranscribeResult(success=False, error=error_msg)
            )
            return
        
        yield TranscribeProgress(
            status="transcribing",
            progress=0.2 if not is_audio else 0.1,
            message="Transcribing audio..."
        )
        
        try:
            import wave
            with wave.open(audio_path, 'r') as wav_file:
                frames = wav_file.getnframes()
                rate = wav_file.getframerate()
                duration = frames / float(rate)
            logger.info(f"Audio duration: {duration:.2f}s, sample rate: {rate}Hz")
        except Exception as e:
            logger.warning(f"Could not read WAV header: {e}, will get duration from transcription")
            duration = 0
        
        logger.info(f"Starting transcription with language={language}")
        segments_gen, info = model.transcribe(
            audio_path,
            language=language,
            task="transcribe",
        )
        
        logger.info(f"Detected language: {info.language} (probability: {info.language_probability:.2f})")
        
        if duration == 0:
            duration = info.duration or 0
        
        segments = []
        for segment in segments_gen:
            segments.append(segment)
            if duration > 0:
                transcribe_progress = (0.2 if not is_audio else 0.1) + 0.7 * (segment.end / duration)
            else:
                transcribe_progress = 0.5
            
            yield TranscribeProgress(
                status="transcribing",
                progress=min(transcribe_progress, 0.9),
                current_time=segment.end,
                total_time=duration,
                message=f"Transcribing: {segment.end:.1f}s / {duration:.1f}s"
            )
        
        logger.info(f"Transcription complete: {len(segments)} segments found")
        
        yield TranscribeProgress(
            status="saving",
            progress=0.95,
            message="Saving subtitle file..."
        )
        
        if not output_path.endswith(f".{output_format}"):
            output_path = f"{output_path}.{output_format}"
        
        logger.info(f"Writing subtitle file: {output_path}")
        
        if output_format == "srt":
            write_srt(output_path, segments)
        elif output_format == "vtt":
            write_vtt(output_path, segments)
        elif output_format == "ass":
            write_ass(output_path, segments)
        else:
            write_srt(output_path, segments)
        
        logger.info(f"Subtitle file saved successfully")
        
        yield TranscribeProgress(
            status="completed",
            progress=1.0,
            message="Transcription completed!"
        )
        
        if len(segments) == 0:
            logger.warning("No speech segments detected")
            yield TranscribeProgress(
                status="result",
                progress=1.0,
                result=TranscribeResult(
                    success=False,
                    output_path=output_path,
                    error="未检测到语音。文件可能没有可识别的语音内容，或者音频质量太差。"
                )
            )
        else:
            logger.info(f"Success: language={info.language}, segments={len(segments)}")
            yield TranscribeProgress(
                status="result",
                progress=1.0,
                result=TranscribeResult(
                    success=True,
                    output_path=output_path,
                    language=info.language,
                    language_probability=info.language_probability,
                    duration=info.duration,
                    segments_count=len(segments)
                )
            )
    
    except Exception as e:
        import traceback
        error_detail = traceback.format_exc()
        logger.error(f"Transcription error: {error_detail}")
        yield TranscribeProgress(
            status="result",
            progress=1.0,
            result=TranscribeResult(success=False, error=f"转录过程出错: {str(e)}")
        )
    
    finally:
        if not is_audio and audio_path and os.path.exists(audio_path):
            try:
                os.unlink(audio_path)
            except:
                pass


async def transcribe_audio_async(
    input_path: str,
    output_path: str,
    language: Optional[str] = None,
    model_size: str = "base",
    output_format: str = "srt",
    model_path: Optional[str] = None,
) -> AsyncGenerator[TranscribeProgress, None]:
    """
    Async wrapper for transcribe_audio.
    
    Yields progress updates. The final yield contains status="result" with the result.
    """
    
    def _next_item(gen):
        """Helper to safely get next item from generator, catching StopIteration internally."""
        try:
            return next(gen)
        except StopIteration:
            return None
    
    loop = asyncio.get_event_loop()
    
    gen = transcribe_audio(
        input_path=input_path,
        output_path=output_path,
        language=language,
        model_size=model_size,
        output_format=output_format,
        model_path=model_path,
    )
    
    while True:
        progress = await loop.run_in_executor(None, lambda: _next_item(gen))
        if progress is None:
            break
        yield progress