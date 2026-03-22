from langchain_core.tools import tool
from typing import Optional
import json


@tool
def get_video_info(video_path: str) -> str:
    """获取视频文件的基本信息，包括分辨率、时长、编码格式等。
    
    Args:
        video_path: 视频文件的完整路径
    """
    return json.dumps({
        "action": "get_video_info",
        "video_path": video_path
    })


@tool
def convert_video(
    input_path: str,
    output_path: str,
    format: str = "mp4",
    codec: Optional[str] = None,
    bitrate: Optional[str] = None,
    resolution: Optional[str] = None,
) -> str:
    """将视频转换为指定格式。
    
    Args:
        input_path: 输入视频路径
        output_path: 输出视频路径
        format: 输出格式 (mp4, avi, mkv, webm 等)
        codec: 视频编码器 (h264, h265, vp9 等)
        bitrate: 目标比特率 (如 "2M", "5M")
        resolution: 目标分辨率 (如 "1920x1080", "1280x720")
    """
    return json.dumps({
        "action": "convert_video",
        "input_path": input_path,
        "output_path": output_path,
        "format": format,
        "codec": codec,
        "bitrate": bitrate,
        "resolution": resolution,
    })


@tool
def compress_video(
    input_path: str,
    output_path: str,
    quality: str = "medium",
    target_size_mb: Optional[float] = None,
) -> str:
    """压缩视频以减小文件大小。
    
    Args:
        input_path: 输入视频路径
        output_path: 输出视频路径
        quality: 质量等级 (high, medium, low)
        target_size_mb: 目标文件大小 (MB)
    """
    return json.dumps({
        "action": "compress_video",
        "input_path": input_path,
        "output_path": output_path,
        "quality": quality,
        "target_size_mb": target_size_mb,
    })


@tool
def extract_audio(
    input_path: str,
    output_path: str,
    format: str = "mp3",
    bitrate: str = "192k",
) -> str:
    """从视频中提取音频。
    
    Args:
        input_path: 输入视频路径
        output_path: 输出音频路径
        format: 音频格式 (mp3, aac, wav, flac 等)
        bitrate: 音频比特率 (如 "128k", "192k", "320k")
    """
    return json.dumps({
        "action": "extract_audio",
        "input_path": input_path,
        "output_path": output_path,
        "format": format,
        "bitrate": bitrate,
    })


@tool
def extract_frames(
    input_path: str,
    output_dir: str,
    fps: Optional[float] = None,
    start_time: Optional[float] = None,
    duration: Optional[float] = None,
    image_format: str = "png",
) -> str:
    """从视频中提取帧图像。
    
    Args:
        input_path: 输入视频路径
        output_dir: 输出图片目录
        fps: 提取帧率 (如 1 表示每秒1帧)
        start_time: 开始时间 (秒)
        duration: 持续时间 (秒)
        image_format: 图片格式 (png, jpg)
    """
    return json.dumps({
        "action": "extract_frames",
        "input_path": input_path,
        "output_dir": output_dir,
        "fps": fps,
        "start_time": start_time,
        "duration": duration,
        "image_format": image_format,
    })


@tool
def cut_video(
    input_path: str,
    output_path: str,
    start_time: float,
    end_time: float,
) -> str:
    """裁剪视频片段。
    
    Args:
        input_path: 输入视频路径
        output_path: 输出视频路径
        start_time: 开始时间 (秒)
        end_time: 结束时间 (秒)
    """
    return json.dumps({
        "action": "cut_video",
        "input_path": input_path,
        "output_path": output_path,
        "start_time": start_time,
        "end_time": end_time,
    })


@tool
def merge_videos(
    input_paths: list[str],
    output_path: str,
) -> str:
    """合并多个视频文件。
    
    Args:
        input_paths: 输入视频路径列表
        output_path: 输出视频路径
    """
    return json.dumps({
        "action": "merge_videos",
        "input_paths": input_paths,
        "output_path": output_path,
    })


@tool
def add_subtitle(
    input_path: str,
    subtitle_path: str,
    output_path: str,
    font_size: int = 24,
) -> str:
    """给视频添加字幕。
    
    Args:
        input_path: 输入视频路径
        subtitle_path: 字幕文件路径 (srt, ass 格式)
        output_path: 输出视频路径
        font_size: 字体大小
    """
    return json.dumps({
        "action": "add_subtitle",
        "input_path": input_path,
        "subtitle_path": subtitle_path,
        "output_path": output_path,
        "font_size": font_size,
    })


@tool
def add_watermark(
    input_path: str,
    watermark_path: str,
    output_path: str,
    position: str = "bottom_right",
    opacity: float = 0.8,
) -> str:
    """给视频添加水印。
    
    Args:
        input_path: 输入视频路径
        watermark_path: 水印图片路径
        output_path: 输出视频路径
        position: 水印位置 (top_left, top_right, bottom_left, bottom_right, center)
        opacity: 水印透明度 (0.0-1.0)
    """
    return json.dumps({
        "action": "add_watermark",
        "input_path": input_path,
        "watermark_path": watermark_path,
        "output_path": output_path,
        "position": position,
        "opacity": opacity,
    })


FFmpegToolKit = [
    get_video_info,
    convert_video,
    compress_video,
    extract_audio,
    extract_frames,
    cut_video,
    merge_videos,
    add_subtitle,
    add_watermark,
]