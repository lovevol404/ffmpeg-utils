# Python AI Backend

FastAPI + LangChain service for AI-powered video workflow generation.

## Overview

Provides REST API endpoints for:
- Chat with video context
- Workflow generation from conversation
- OpenAI-compatible LLM integration

## Structure

```
python/
├── main.py           # FastAPI app entry, uvicorn runner
├── api/
│   ├── routes.py     # REST endpoints (/api/chat, /api/workflow, /api/configure)
│   └── schemas.py    # Pydantic models (ChatRequest, WorkflowResponse, etc.)
├── agents/
│   └── video_agent.py  # LangChain agent with FFmpeg tool binding
├── core/
│   └── config.py     # Settings (OpenAI API key, base URL, model)
└── tools/
    └── ffmpeg_tools.py  # LangChain tools for FFmpeg operations
```

## Commands

```bash
# Dev server (from project root)
npm run dev:python

# Direct uvicorn
cd python && uvicorn main:app --reload --port 8765

# Build with PyInstaller
npm run build:python
```

## API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/health` | GET | Health check |
| `/api/chat` | POST | Stream chat response (SSE) |
| `/api/chat/sync` | POST | Synchronous chat |
| `/api/workflow` | POST | Generate FFmpeg workflow from conversation |
| `/api/configure` | POST | Set API key, base URL, model |
| `/api/status` | GET | Check if AI configured |

## Where to Look

| Task | Location |
|------|----------|
| Add new API endpoint | `api/routes.py` |
| Modify chat behavior | `agents/video_agent.py` |
| Add FFmpeg tool | `tools/ffmpeg_tools.py` |
| Change LLM settings | `core/config.py` |
| Add request/response type | `api/schemas.py` |

## Conventions

### Configuration
- Settings via `pydantic-settings` (reads from `.env` or environment)
- `Settings.from_config()` for runtime configuration from frontend

### Agent Pattern
```python
class VideoAgent:
    def __init__(self, settings: Settings):
        self.llm = ChatOpenAI(
            api_key=settings.openai_api_key,
            base_url=settings.openai_base_url,
            model=settings.openai_model,
        )
```

### Error Handling
- Return `null` / `False` on errors in routes (don't throw)
- Parse JSON workflow output with fallback to empty tasks

## Anti-Patterns

- **DO NOT** hardcode model names — use `settings.openai_model`
- **DO NOT** import `settings` directly — accept as parameter
- **DO NOT** block in streaming endpoints — use generators

## Port Handling

- `main.py` uses `port=0` (OS assigns random port)
- Dev mode: hardcoded `8765` in `scripts/dev.js`
- Production: `pythonService.ts` finds available port (8700-8800)