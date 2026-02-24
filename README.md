# Resume Agent - AI-Powered Resume Optimization

An intelligent resume optimization system built with **LangGraph** that automatically analyzes, scores, and improves resumes to match job descriptions using multi-agent workflows.

## 🎯 Features

### Core Optimization
- **🤖 LangGraph Agent Workflow**: Conditional multi-step agent with iterative optimization
- **📊 ATS Scoring**: Comprehensive resume scoring algorithm (keywords, skills, format, sections)
- **🎯 Job-Resume Fit Analysis**: Intelligent gating to determine if optimization will help
- **🔄 Iterative Improvements**: Automatically refines resume until target score or max iterations
- **📝 LaTeX Support**: Generates professional LaTeX resumes with multiple built-in templates
- **📄 PDF Processing**: Extracts text from PDF resumes for analysis
- **📡 Real-time Streaming**: Live agent progress via Server-Sent Events (SSE)
- **🗂️ Decision Log**: Step-by-step agent decision trail visible in optimization results

### Cover Letter
- **✉️ AI Cover Letter Generation**: Automatically generates a tailored, professional cover letter after resume optimization using the final optimized resume and job description

### Missing Skills Analyzer
- **🔍 Multi-JD Skills Gap Analysis**: Upload a resume and up to 20 job descriptions to get a deduplicated, categorized list of missing skills
- **🏷️ Skill Categories**: Results grouped into Programming Languages, Frameworks & Libraries, Cloud & DevOps, Databases, Tools & Platforms, and Soft Skills
- **⚡ Rate-Limit Aware**: Gracefully handles Groq API TPM and daily rate limits
- **📜 Missing Skills History**: Persistent history of all missing skills analysis runs with expandable detail view

### Resume Builder
- **🏗️ Form-Based Resume Builder**: Build a resume from scratch by filling in contact info, experience, education, projects, and skills
- **🤖 AI-Generated Content**: AI writes ATS-optimized bullet points for experience and projects, and a professional summary — all tailored to the target job field
- **🎨 9 HTML Resume Templates**: Choose from `accent`, `centered`, `classic`, `diamond`, `executive`, `minimal`, `serifpro`, `sharp`, and `twocol` layouts
- **📥 PDF Download**: Renders the chosen HTML template to PDF via WeasyPrint for download
- **💡 Smart Suggestions**: Field-aware skill chip suggestions and job title autocomplete

### LaTeX Template System
- **📐 Multiple Built-in LaTeX Templates**: Several polished LaTeX resume templates (Classic Professional, Modern Two-Column, Minimalist, and more)
- **⭐ Template Preferences**: Users can set and persist a default LaTeX template for all optimizations
- **🛠️ Custom Templates**: Upload up to 3 personal LaTeX templates for use during optimization
- **👁️ Template Preview**: Live PDF preview of any template directly in the browser via the Templates page

### Authentication & User Management
- **🔐 JWT Authentication**: Email/password registration and login with bcrypt password hashing
- **🌐 Google OAuth**: Sign in with Google (Google ID token verification)
- **🔑 Encrypted API Key Storage**: Groq API keys stored encrypted in the database per user
- **💾 Run History**: Persistent storage of all optimization runs with scores and results

### UI / UX
- **🌗 Dark / Light Theme**: System-aware theme toggle with localStorage persistence
- **📄 Inline PDF Viewer**: View compiled PDFs directly within the app without downloading
- **📱 Responsive Layout**: Sidebar + dashboard layout built with Tailwind CSS
- **🔔 Toast Notifications**: Contextual success/error feedback via react-hot-toast

## 🏗️ Architecture

### Backend Stack
- **Framework**: FastAPI (Python 3.11+)
- **Agent**: LangGraph + Groq (Llama 3.3 / llama-3.3-70b-versatile)
- **Database**: PostgreSQL (via Supabase) + SQLAlchemy ORM
- **Auth**: JWT with bcrypt password hashing + Google OAuth (ID token verification)
- **PDF Extraction**: pdfplumber
- **Resume PDF Generation**: WeasyPrint (HTML → PDF)
- **LaTeX Compilation**: External compilation service
- **Streaming**: Server-Sent Events (SSE) for real-time agent progress
- **AI Generation**: OpenAI-compatible Groq client for bullets, summaries, skills gap

### Frontend Stack
- **Framework**: React 18 + Vite
- **Routing**: React Router v6
- **HTTP**: Axios + Fetch API
- **Styling**: Tailwind CSS
- **Notifications**: react-hot-toast
- **Theme**: Dark/light mode with ThemeContext + localStorage persistence
- **PDF Viewing**: Inline PDF viewer component

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
    ┌─────────▼──────────┐
    │ Generate Cover     │ - Personalized cover letter
    │ Letter             │   from final optimized resume
    └─────────┬──────────┘
              │
         ┌────▼────┐
         │   END   │
         └─────────┘
```

Each step emits a real-time **SSE event** to the frontend for live progress display.

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
│   │   │   ├── cover_letter.py      # Cover letter generation
│   │   │   ├── fit_check.py         # Job-resume fit gate
│   │   │   ├── job_requirements.py  # JD extraction
│   │   │   ├── modification.py      # Resume rewriting
│   │   │   ├── planning.py          # Improvement planning
│   │   │   ├── rescore.py           # Re-scoring after edit
│   │   │   ├── resume_analysis.py   # Strengths/gaps analysis
│   │   │   └── scoring.py           # ATS scoring
│   │   ├── state.py           # Agent state definition
│   │   └── workflow.py        # LangGraph workflow + SSE streaming
│   ├── api/
│   │   ├── middleware/        # Auth middleware
│   │   └── routes/
│   │       ├── agent.py       # Optimization, run history, templates
│   │       ├── auth.py        # JWT + Google OAuth endpoints
│   │       ├── latex.py       # LaTeX compilation endpoint
│   │       ├── missing_skills.py  # Skills gap analyzer
│   │       ├── pdf.py         # PDF text extraction
│   │       ├── resume_builder.py  # Resume CRUD + AI generation
│   │       └── user.py        # User profile & settings
│   ├── auth/                  # JWT + Google OAuth utilities
│   ├── core/                  # Security (encryption)
│   ├── database/
│   │   ├── migrations/        # Schema migrations
│   │   └── models/            # SQLAlchemy models (User, ResumeRun, Resume, MissingSkillsRun)
│   ├── schemas/               # Pydantic request/response models
│   ├── services/
│   │   ├── ai_resume_generator.py  # AI bullet/summary generation
│   │   ├── latex_service.py        # LaTeX compilation client
│   │   ├── latex_templates.py      # Built-in LaTeX template library
│   │   ├── pdf_service.py          # PDF utilities
│   │   └── template_renderer.py    # Jinja2 HTML template renderer (WeasyPrint)
│   ├── templates/             # HTML resume templates for Resume Builder
│   │   └── (accent, centered, classic, diamond, executive,
│   │       minimal, serifpro, sharp, twocol).html
│   ├── tests/                 # All backend tests
│   ├── config.py              # Centralized configuration
│   └── main.py                # App entry point
│
├── frontend/
│   └── src/
│       ├── components/        # Shared UI components
│       │   ├── DashboardLayout.jsx
│       │   ├── PdfViewer.jsx       # Inline PDF viewer
│       │   ├── Sidebar.jsx
│       │   ├── ThemeToggle.jsx     # Dark/light mode switch
│       │   └── ui/                 # Headless UI primitives
│       ├── context/
│       │   └── ThemeContext.jsx    # Global theme state
│       ├── pages/
│       │   ├── Dashboard.jsx
│       │   ├── Home.jsx
│       │   ├── Login.jsx / Register.jsx
│       │   ├── MissingSkills.jsx        # Skills gap analyzer
│       │   ├── MissingSkillsHistory.jsx # History of gap analyses
│       │   ├── NewOptimization.jsx
│       │   ├── OptimizationResults.jsx  # Results + cover letter + PDF
│       │   ├── ResumeBuilder.jsx        # Form-based resume builder
│       │   ├── RunHistory.jsx
│       │   ├── Settings.jsx
│       │   └── Templates.jsx            # LaTeX template browser & preferences
│       └── services/
│           └── api.js          # Axios API client
│
└── tests/
    └── robot/                 # Robot Framework E2E tests
```

## 🚀 Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+
- PostgreSQL (via Supabase recommended)
- **Groq API Key** - Free tier available at [console.groq.com/keys](https://console.groq.com/keys)
- *(Optional)* Google OAuth Client ID for Google Sign-In — see [`GOOGLE_OAUTH_SETUP.md`](GOOGLE_OAUTH_SETUP.md)

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

### Environment Variables (highlights)

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `SECRET_KEY` | JWT signing secret |
| `GROQ_API_KEY` | Default Groq API key (users can also set their own in Settings) |
| `ENCRYPTION_KEY` | Fernet key for encrypting stored API keys |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID (optional — enables Google Sign-In) |
| `LATEX_COMPILE_URL` | URL of the external LaTeX compilation service |
| `VITE_API_URL` | *(frontend `.env`)* Backend base URL for the React app |

## 🧪 Testing

```bash
cd backend
pytest                     # Run all tests
pytest tests/agent/        # Agent tests only
pytest tests/api/          # API tests only
```

Robot Framework E2E tests (API + UI) are in `tests/robot/`. See `tests/robot/README.md` for setup instructions.

## 📚 Documentation

- **API Docs**: http://localhost:8000/docs (when running)
- **Google OAuth Setup**: See [`GOOGLE_OAUTH_SETUP.md`](GOOGLE_OAUTH_SETUP.md)
- **Troubleshooting**: See [`DEVELOPMENT.md`](DEVELOPMENT.md) for common issues and solutions
- **Architecture**: See workflow diagram above

## 🤝 Team

Built by Shabas, Sinan, and Marva 

## 📄 License

MIT License
