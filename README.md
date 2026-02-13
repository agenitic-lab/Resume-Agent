# Resume Agent - AI-Powered Resume Optimization

An intelligent resume optimization system built with **LangGraph** that automatically analyzes, scores, and improves resumes to match job descriptions using multi-agent workflows.

## 🎯 Features

- **🤖 LangGraph Agent Workflow**: Conditional multi-step agent with iterative optimization
- **📊 ATS Scoring**: Comprehensive resume scoring algorithm (keywords, skills, format, sections)
- **🎯 Job-Resume Fit Analysis**: Intelligent gating to determine if optimization will help
- **🔄 Iterative Improvements**: Automatically refines resume until target score or max iterations
- **📝 LaTeX Support**: Generates professional LaTeX resumes
- **📄 PDF Processing**: Extracts text from PDF resumes
- **🔐 User Authentication**: JWT-based auth with encrypted API key storage
- **💾 Run History**: Persistent storage of all optimization runs
- **🎨 Modern UI**: React frontend with real-time progress tracking

## 🏗️ Architecture

### Backend Stack
- **Framework**: FastAPI (Python 3.11+)
- **Agent**: LangGraph + Groq (Llama 3.3)
- **Database**: PostgreSQL (via Supabase)
- **Auth**: JWT with bcrypt password hashing
- **PDF**: pdfplumber for text extraction
- **LaTeX**: External compilation service

### Frontend Stack
- **Framework**: React 18 + Vite
- **Routing**: React Router v6
- **HTTP**: Axios
- **Styling**: Tailwind CSS
- **Notifications**: react-hot-toast

### Agent Workflow

```
┌─────────────────────┐
│ Extract Job Reqs    │ - Parse job description
└──────────┬──────────┘
           │
┌──────────▼──────────┐
│ Analyze Resume      │ - Identify strengths/gaps
└──────────┬──────────┘
           │
┌──────────▼──────────┐
│ Fit Check (Gate)    │ - Deterministic fit assessment
└──────────┬──────────┘
           │
    ┌──────▼──────┐
    │ Poor Fit?   │
    └──┬───────┬──┘
       │       │
    Yes│       │No
       │       │
    ┌──▼───┐  │
    │ END  │  │
    └──────┘  │
              │
         ┌────▼─────────┐
         │ Score Resume │
         └────┬─────────┘
              │
    ┌─────────▼──────────┐
    │ Plan Improvements  │ ◄─────┐
    └─────────┬──────────┘       │
              │                  │
    ┌─────────▼──────────┐       │
    │ Modify Resume      │       │
    └─────────┬──────────┘       │
              │                  │
    ┌─────────▼──────────┐       │
    │ Rescore Modified   │       │
    └─────────┬──────────┘       │
              │                  │
         ┌────▼─────┐            │
         │Continue? │────Yes─────┘
         └────┬─────┘
              │No
         ┌────▼────┐
         │   END   │
         └─────────┘
```

**Stop Conditions**:
- Max iterations reached (default: 3)
- Target score achieved (default: 75)
- Improvement gain too small (default: <1 point)

## 📁 Project Structure

```
Resume-Agent/
├── backend/
│   ├── agent/                  # LangGraph agent core
│   │   ├── nodes/             # Individual agent nodes
│   │   ├── state.py           # Agent state definition
│   │   └── workflow.py        # LangGraph workflow assembly
│   ├── api/                   # FastAPI routes
│   ├── auth/                  # JWT utilities
│   ├── core/                  # Security
│   ├── database/              # SQLAlchemy models
│   ├── schemas/               # Pydantic models
│   ├── services/              # External services
│   ├── tests/                 # All tests
│   ├── config.py              # Centralized configuration
│   └── main.py                # App entry point
│
├── frontend/
│   └── src/
│       ├── components/
│       ├── pages/
│       └── services/
│
└── resume-agent-guide/        # 21-day development guide
```

## 🚀 Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+
- PostgreSQL (via Supabase recommended)
- **Groq API Key** - Free tier available at [console.groq.com/keys](https://console.groq.com/keys)

### Get Your Groq API Key

1. Visit [https://console.groq.com/keys](https://console.groq.com/keys)
2. Sign in or create a free account
3. Click "Create API Key"
4. Copy your API key (starts with `gsk_`)
5. Add it to Settings page in the web app, or set `GROQ_API_KEY` in backend `.env`

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # Edit with your values
python -m uvicorn main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## 📖 Configuration

See `backend/.env.example` for all required environment variables.

Key settings in `backend/config.py`:
- Agent parameters (iterations, scores, thresholds)
- LLM model selection
- Service timeouts

## 🧪 Testing

```bash
cd backend
pytest                     # Run all tests
pytest tests/agent/        # Agent tests only
pytest tests/api/          # API tests only
```

## 📚 Documentation

- **API Docs**: http://localhost:8000/docs (when running)
- **Development Guide**: See `resume-agent-guide/` for day-by-day implementation details
- **Architecture**: See workflow diagram above

## 🤝 Team

Built by Shabas, Sinan, and Marva - A 21-day Agile sprint learning LangGraph and agentic AI.

## 📄 License

MIT License
