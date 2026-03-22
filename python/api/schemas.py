from pydantic import BaseModel, Field
from typing import Optional, Union
from enum import Enum


class MessageRole(str, Enum):
    user = "user"
    assistant = "assistant"
    system = "system"


class ChatMessage(BaseModel):
    role: MessageRole
    content: str


class VideoStreamInfo(BaseModel):
    codec: Optional[str] = None
    width: Optional[int] = None
    height: Optional[int] = None
    duration: Optional[float] = None
    bitrate: Optional[int] = None
    fps: Optional[float] = None


class VideoInfo(BaseModel):
    path: str
    name: str
    size: int
    streams: Optional[VideoStreamInfo] = None


class ChatRequest(BaseModel):
    message: str
    video_info: Optional[VideoInfo] = None
    history: list[ChatMessage] = []


class AIConfig(BaseModel):
    api_key: str = Field(alias="apiKey")
    base_url: str = Field(default="https://api.openai.com/v1", alias="baseUrl")
    model: str = "gpt-4"

    class Config:
        populate_by_name = True


class TaskType(str, Enum):
    convert = "convert"
    compress = "compress"
    extract_audio = "extract_audio"
    extract_frame = "extract_frame"
    cut = "cut"
    merge = "merge"
    add_subtitle = "add_subtitle"
    add_watermark = "add_watermark"
    custom = "custom"


class WorkflowTask(BaseModel):
    id: str
    type: TaskType
    description: str
    input: Union[str, list[str]]
    output: str
    args: list[str] = []
    filter_complex: Optional[str] = None
    depends_on: list[str] = []


class WorkflowResponse(BaseModel):
    tasks: list[WorkflowTask]
    description: str


class HealthResponse(BaseModel):
    status: str


# Transcription schemas for subtitle generation

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


class TranscribeRequest(BaseModel):
    video_path: str = Field(alias="videoPath")
    output_path: Optional[str] = Field(default=None, alias="outputPath")
    language: Optional[str] = None  # None = auto-detect, "zh", "en", "ja", etc.
    model_size: WhisperModelSize = Field(default=WhisperModelSize.base, alias="modelSize")
    output_format: SubtitleFormat = Field(default=SubtitleFormat.srt, alias="outputFormat")
    model_path: Optional[str] = Field(default=None, alias="modelPath")  # Custom model directory

    class Config:
        populate_by_name = True


class TranscribeProgressResponse(BaseModel):
    status: str  # "extracting_audio" | "loading_model" | "transcribing" | "saving" | "completed" | "result"
    progress: float  # 0.0 - 1.0
    current_time: float = 0.0  # Current processing time in seconds
    total_time: float = 0.0  # Total audio duration in seconds
    message: str = ""


class TranscribeResultResponse(BaseModel):
    success: bool
    output_path: Optional[str] = Field(default=None, alias="outputPath")
    language: Optional[str] = None
    language_probability: Optional[float] = Field(default=None, alias="languageProbability")
    duration: Optional[float] = None
    segments_count: int = Field(default=0, alias="segmentsCount")
    error: Optional[str] = None

    class Config:
        populate_by_name = True


class ModelInfo(BaseModel):
    size: str
    path: Optional[str] = None
    available: bool
    source: str  # "local", "cache", "download"


class AvailableModelsResponse(BaseModel):
    models: list[ModelInfo]
    default_model_dir: str


class WhisperConfigRequest(BaseModel):
    model_path: Optional[str] = Field(default=None, alias="modelPath")

    class Config:
        populate_by_name = True


class DownloadModelRequest(BaseModel):
    model_size: str = Field(alias="modelSize")
    model_path: Optional[str] = Field(default=None, alias="modelPath")

    class Config:
        populate_by_name = True


class DownloadModelProgress(BaseModel):
    status: str  # "starting" | "downloading" | "completed" | "result"
    progress: float
    message: str


class DownloadModelResult(BaseModel):
    success: bool
    model_size: Optional[str] = Field(default=None, alias="modelSize")
    path: Optional[str] = None
    error: Optional[str] = None

    class Config:
        populate_by_name = True


class ModelDownloadInfo(BaseModel):
    model_size: str = Field(alias="modelSize")
    huggingface_url: str = Field(alias="huggingfaceUrl")
    repo_id: str = Field(alias="repoId")
    estimated_size: str = Field(alias="estimatedSize")
    instructions: dict[str, str]

    class Config:
        populate_by_name = True