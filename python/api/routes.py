from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from sse_starlette.sse import EventSourceResponse
from typing import Optional
import json
import logging

logger = logging.getLogger(__name__)

from api.schemas import (
    ChatRequest,
    ChatMessage,
    WorkflowResponse,
    HealthResponse,
    AIConfig,
    TranscribeRequest,
    TranscribeProgressResponse,
    TranscribeResultResponse,
    AvailableModelsResponse,
    WhisperConfigRequest,
    DownloadModelRequest,
    ModelDownloadInfo,
)
from agents.video_agent import VideoAgent
from core.config import Settings

router = APIRouter()

_agent_instance: VideoAgent | None = None


def get_agent(config: AIConfig | None = None) -> VideoAgent:
    global _agent_instance
    
    if config:
        settings = Settings.from_config(
            api_key=config.api_key,
            base_url=config.base_url,
            model=config.model,
        )
        _agent_instance = VideoAgent(settings)
    elif _agent_instance is None:
        raise HTTPException(status_code=400, detail="AI not configured")
    
    return _agent_instance


@router.get("/health", response_model=HealthResponse)
async def health_check():
    return HealthResponse(status="ok")


@router.post("/chat")
async def chat(request: ChatRequest):
    agent = get_agent()
    
    def generate():
        for chunk in agent.chat_stream(
            message=request.message,
            video_info=request.video_info,
            history=request.history,
        ):
            yield json.dumps({"content": chunk})
    
    return EventSourceResponse(generate())


@router.post("/chat/sync")
async def chat_sync(request: ChatRequest) -> ChatMessage:
    agent = get_agent()
    response = agent.chat(
        message=request.message,
        video_info=request.video_info,
        history=request.history,
    )
    return ChatMessage(role="assistant", content=response)


@router.post("/workflow", response_model=WorkflowResponse)
async def generate_workflow(request: list[ChatMessage]):
    agent = get_agent()
    
    video_info = None
    for msg in reversed(request):
        if hasattr(msg, "video_info") and msg.video_info:
            video_info = msg.video_info
            break
    
    return agent.generate_workflow(
        conversation=request,
        video_info=video_info,
    )


@router.post("/configure")
async def configure_ai(config: AIConfig):
    get_agent(config)
    return {"status": "configured"}


@router.get("/status")
async def get_ai_status():
    global _agent_instance
    if _agent_instance is None:
        return {"configured": False}
    return {"configured": True}


@router.post("/transcribe")
async def transcribe_video(request: TranscribeRequest):
    """
    Transcribe audio from video/audio file and generate subtitles.
    Returns SSE stream with progress updates.
    """
    from tools.whisper_tools import transcribe_audio_async
    
    logger.info(f"Transcribe request received: input_path={request.video_path}, "
                f"model_size={request.model_size}, output_format={request.output_format}, "
                f"language={request.language}, model_path={request.model_path}")
    
    async def generate():
        try:
            async for progress in transcribe_audio_async(
                input_path=request.video_path,
                output_path=request.output_path or "",
                language=request.language,
                model_size=request.model_size.value,
                output_format=request.output_format.value,
                model_path=request.model_path,
            ):
                if progress.status == "result" and progress.result:
                    logger.info(f"Transcribe result: success={progress.result.success}, "
                                f"segments={progress.result.segments_count}")
                    yield json.dumps({
                        "type": "result",
                        "data": progress.result.to_dict()
                    })
                else:
                    logger.debug(f"Progress: {progress.status} - {progress.message}")
                    yield json.dumps({
                        "type": "progress",
                        "data": {
                            "status": progress.status,
                            "progress": progress.progress,
                            "current_time": progress.current_time,
                            "total_time": progress.total_time,
                            "message": progress.message,
                        }
                    })
        except Exception as e:
            import traceback
            logger.error(f"Transcribe error: {traceback.format_exc()}")
            yield json.dumps({
                "type": "error",
                "data": {"error": str(e)}
            })
    
    return EventSourceResponse(generate())


@router.get("/models")
async def get_available_models(model_path: Optional[str] = None):
    """
    Get available Whisper models.
    Returns list of models with their availability status.
    """
    from tools.whisper_tools import get_available_models, DEFAULT_MODEL_DIR
    from api.schemas import ModelInfo
    
    models_data = get_available_models(model_path)
    
    models = [ModelInfo(**m) for m in models_data]
    
    return AvailableModelsResponse(
        models=models,
        default_model_dir=DEFAULT_MODEL_DIR
    )


@router.post("/models/download")
async def download_model(request: DownloadModelRequest):
    """
    Download a Whisper model.
    Returns SSE stream with download progress.
    """
    from tools.whisper_tools import download_model_async
    import json
    
    async def generate():
        try:
            async for progress in download_model_async(
                model_size=request.model_size,
                model_path=request.model_path,
            ):
                if progress.get("status") == "result":
                    yield json.dumps({
                        "type": "result",
                        "data": eval(progress["message"])  # Parse the result dict
                    })
                else:
                    yield json.dumps({
                        "type": "progress",
                        "data": progress
                    })
        except Exception as e:
            yield json.dumps({
                "type": "error",
                "data": {"error": str(e)}
            })
    
    return EventSourceResponse(generate())


@router.get("/models/download-info/{model_size}", response_model=ModelDownloadInfo)
async def get_model_download_info(model_size: str):
    """
    Get download URL and instructions for a Whisper model.
    Useful for manual download when automatic download fails.
    """
    from tools.whisper_tools import get_model_download_url
    
    info = get_model_download_url(model_size)
    return ModelDownloadInfo(**info)


@router.get("/cuda-status")
async def get_cuda_status():
    """
    Check CUDA availability for Whisper GPU acceleration.
    Returns CUDA status and installation instructions if not available.
    """
    cuda_available = False
    cuda_version = None
    gpu_name = None
    error_message = None
    install_instructions = None
    
    try:
        import torch
        if torch.cuda.is_available():
            cuda_available = True
            cuda_version = torch.version.cuda
            gpu_name = torch.cuda.get_device_name(0)
        else:
            error_message = "CUDA 运行时不可用"
            install_instructions = get_cuda_install_instructions()
    except ImportError:
        error_message = "PyTorch 未安装 CUDA 版本"
        install_instructions = get_cuda_install_instructions()
    except Exception as e:
        error_message = f"CUDA 检测失败: {str(e)}"
        install_instructions = get_cuda_install_instructions()
    
    return {
        "available": cuda_available,
        "cudaVersion": cuda_version,
        "gpuName": gpu_name,
        "errorMessage": error_message,
        "installInstructions": install_instructions,
    }


def get_cuda_install_instructions() -> dict:
    """
    Get CUDA installation instructions for different platforms.
    """
    import platform
    system = platform.system()
    
    if system == "Windows":
        return {
            "platform": "windows",
            "steps": [
                "1. 安装 NVIDIA 显卡驱动 (最新版本)",
                "2. 安装 CUDA Toolkit 12.x: https://developer.nvidia.com/cuda-downloads",
                "3. 安装 cuDNN: https://developer.nvidia.com/cudnn",
                "4. 重启电脑",
                "5. 重新安装 PyTorch CUDA 版本:",
            ],
            "pytorchCommand": "pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121",
            "downloadUrls": {
                "cudaToolkit": "https://developer.nvidia.com/cuda-downloads",
                "cudnn": "https://developer.nvidia.com/cudnn",
                "pytorch": "https://pytorch.org/get-started/locally/",
            },
            "note": "安装完成后重启应用即可使用 GPU 加速语音识别"
        }
    elif system == "Linux":
        return {
            "platform": "linux",
            "steps": [
                "1. 安装 NVIDIA 显卡驱动",
                "2. 安装 CUDA Toolkit: sudo apt install nvidia-cuda-toolkit",
                "3. 安装 PyTorch CUDA 版本:",
            ],
            "pytorchCommand": "pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121",
            "downloadUrls": {
                "nvidiaDriver": "https://www.nvidia.com/Download/index.aspx",
                "pytorch": "https://pytorch.org/get-started/locally/",
            },
            "note": "安装完成后重启应用即可使用 GPU 加速语音识别"
        }
    else:  # macOS
        return {
            "platform": "macos",
            "steps": [
                "macOS 不支持 CUDA",
                "如需 GPU 加速，请使用 Apple Silicon (M1/M2/M3) 设备",
                "PyTorch 已原生支持 MPS 加速",
            ],
            "pytorchCommand": "pip install torch torchvision torchaudio",
            "note": "Apple Silicon 设备会自动使用 MPS 加速"
        }