from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage, AIMessage
from langchain_core.prompts import ChatPromptTemplate
from typing import Generator
import json

from tools.ffmpeg_tools import FFmpegToolKit
from api.schemas import ChatMessage, VideoInfo, WorkflowTask, WorkflowResponse, TaskType
from core.config import Settings


SYSTEM_PROMPT = """你是一个专业的视频处理助手，帮助用户完成视频编辑任务。

你可以使用以下 FFmpeg 工具来处理视频：
1. get_video_info - 获取视频信息
2. convert_video - 视频格式转换
3. compress_video - 视频压缩
4. extract_audio - 提取音频
5. extract_frames - 提取视频帧
6. cut_video - 裁剪视频
7. merge_videos - 合并视频
8. add_subtitle - 添加字幕
9. add_watermark - 添加水印

当前用户选择的视频信息：
{video_info}

请根据用户的需求，提供专业的建议和操作方案。如果用户需要执行操作，请说明需要执行的步骤。"""


class VideoAgent:
    def __init__(self, settings: Settings):
        self.settings = settings
        self.llm = ChatOpenAI(
            api_key=settings.openai_api_key,
            base_url=settings.openai_base_url,
            model=settings.openai_model,
            temperature=0.7,
            streaming=True,
        )
        self.llm_with_tools = self.llm.bind_tools(FFmpegToolKit)

    def _format_video_info(self, video_info: VideoInfo | None) -> str:
        if not video_info:
            return "未选择视频"
        
        info = f"文件名: {video_info.name}\n"
        info += f"路径: {video_info.path}\n"
        info += f"大小: {video_info.size / 1024 / 1024:.2f} MB\n"
        
        if video_info.streams:
            streams = video_info.streams
            if streams.width and streams.height:
                info += f"分辨率: {streams.width}x{streams.height}\n"
            if streams.duration:
                info += f"时长: {streams.duration:.2f} 秒\n"
            if streams.codec:
                info += f"编码: {streams.codec}\n"
            if streams.bitrate:
                info += f"比特率: {streams.bitrate / 1000:.0f} kbps\n"
            if streams.fps:
                info += f"帧率: {streams.fps:.2f} fps\n"
        
        return info

    def chat_stream(
        self,
        message: str,
        video_info: VideoInfo | None,
        history: list[ChatMessage],
    ) -> Generator[str, None, None]:
        messages = [
            SystemMessage(content=SYSTEM_PROMPT.format(
                video_info=self._format_video_info(video_info)
            ))
        ]
        
        for msg in history:
            if msg.role == "user":
                messages.append(HumanMessage(content=msg.content))
            else:
                messages.append(AIMessage(content=msg.content))
        
        messages.append(HumanMessage(content=message))
        
        for chunk in self.llm.stream(messages):
            if chunk.content:
                yield chunk.content

    def chat(
        self,
        message: str,
        video_info: VideoInfo | None,
        history: list[ChatMessage],
    ) -> str:
        messages = [
            SystemMessage(content=SYSTEM_PROMPT.format(
                video_info=self._format_video_info(video_info)
            ))
        ]
        
        for msg in history:
            if msg.role == "user":
                messages.append(HumanMessage(content=msg.content))
            else:
                messages.append(AIMessage(content=msg.content))
        
        messages.append(HumanMessage(content=message))
        
        response = self.llm.invoke(messages)
        return response.content

    def generate_workflow(
        self,
        conversation: list[ChatMessage],
        video_info: VideoInfo | None,
    ) -> WorkflowResponse:
        workflow_prompt = """根据对话历史，生成一个 FFmpeg 工作流任务列表。

对话历史：
{conversation}

当前视频信息：
{video_info}

请以 JSON 格式返回工作流，包含以下字段：
- tasks: 任务列表，每个任务包含：
  - id: 任务ID (task_1, task_2, ...)
  - type: 任务类型 (convert, compress, extract_audio, extract_frame, cut, merge, add_subtitle, add_watermark, custom)
  - description: 任务描述
  - input: 输入文件路径（使用占位符，如 "input.mp4"，系统会自动替换为用户选择的文件）
  - output: 输出文件名（仅需文件名，如 "output.mp4"，系统会自动添加完整路径）
  - args: FFmpeg 输出参数列表（重要规则见下方）
  - filter_complex: 复杂滤镜（可选，仅滤镜表达式，如 "overlay=10:10"，不要包含输入标签）
  - depends_on: 依赖的任务ID列表（可选）
- description: 整体工作流描述

**args 参数格式规则（非常重要）：**
1. args 只包含输出编码选项，不要包含输入相关参数
2. 正确示例: ["-c:v", "libx264", "-crf", "23", "-preset", "fast", "-c:a", "aac"]
3. 错误示例: ["-i", "input.mp4", "-c:v", "libx264"]  # 不要包含 -i 和输入文件
4. 错误示例: ["ffmpeg", "-i", "input", "output"]     # 不要包含 ffmpeg 命令本身
5. 对于视频转换，推荐使用: ["-c:v", "libx264", "-crf", "23", "-preset", "fast", "-c:a", "aac"]
6. 对于压缩，推荐使用: ["-c:v", "libx264", "-crf", "28", "-preset", "medium"]
7. 对于提取音频，推荐使用: ["-vn", "-c:a", "mp3", "-b:a", "192k"]
8. 对于提取帧，推荐使用: []，使用 filter_complex 指定 fps

**filter_complex 规则：**
1. 仅提供滤镜表达式，不要包含输入输出标签
2. 正确示例: "overlay=10:10" 或 "fps=1"
3. 错误示例: "[0:v][1:v]overlay=10:10[out]"  # 不要包含标签

只返回 JSON，不要其他内容。"""

        conversation_text = "\n".join([
            f"{msg.role}: {msg.content}" for msg in conversation
        ])
        
        messages = [
            SystemMessage(content=workflow_prompt.format(
                conversation=conversation_text,
                video_info=self._format_video_info(video_info)
            ))
        ]
        
        response = self.llm.invoke(messages)
        
        try:
            content = response.content
            if content.startswith("```"):
                content = content.split("\n", 1)[1]
                content = content.rsplit("```", 1)[0]
            
            data = json.loads(content.strip())
            
            tasks = [
                WorkflowTask(
                    id=task["id"],
                    type=TaskType(task["type"]),
                    description=task["description"],
                    input=task["input"],
                    output=task["output"],
                    args=task.get("args", []),
                    filter_complex=task.get("filter_complex"),
                    depends_on=task.get("depends_on", []),
                )
                for task in data.get("tasks", [])
            ]
            
            return WorkflowResponse(
                tasks=tasks,
                description=data.get("description", "")
            )
        except (json.JSONDecodeError, KeyError) as e:
            return WorkflowResponse(
                tasks=[],
                description=f"解析工作流失败: {str(e)}"
            )