# Resiko - AI-Powered Resume Optimization Platform

An intelligent resume optimization platform built with **LangGraph** that analyzes, scores, and improves resumes to match job descriptions using multi-agent workflows. Includes a full admin dashboard, support ticketing, and resume builder.

## Features

### Core Optimization
- **LangGraph Agent Workflow**: 8-node conditional multi-step agent with iterative optimization
- **ATS Scoring**: Composite scoring algorithm across keywords (40pts), skills (30pts), format (15pts), and sections (15pts)
- **Job-Resume Fit Analysis**: Deterministic keyword/skill matching gate (no LLM cost) with configurable thresholds
- **Iterative Improvements**: Automatically refines resume until target score (default: 75), max iterations (default: 3), or gain plateau (<1 point)
- **LaTeX Resume Generation**: Produces professional LaTeX resumes using 3 built-in templates (Classic Professional, Minimalist, Two-Column Compact)
- **PDF Processing**: Extracts text from uploaded PDF resumes via pdfplumber (max 5MB, mobile-friendly MIME handling)
- **Real-time Streaming**: Live agent progress via Server-Sent Events (SSE) with per-node status updates
- **Decision Log**: Full agent decision trail with score history tracked across iterations

### Cover Letter Generation
- Automatically generates a tailored cover letter (120-150 words) after resume optimization using the final optimized resume and job description

### Missing Skills Analyzer
- **Multi-JD Skills Gap Analysis**: Upload a resume and up to 20 job descriptions to get a deduplicated, categorized list of missing skills
- **Skill Categories**: Results grouped into Programming Languages, Frameworks & Libraries, Cloud & DevOps, Databases, Tools & Platforms, and Soft Skills
- **Rate-Limit Aware**: Gracefully handles Groq API TPM and daily rate limits
- **Persistent History**: All missing skills analysis runs saved with expandable detail view

### Resume Builder
- **Form-Based Builder**: Build a resume from scratch with contact info, experience, education, projects, and skills sections
- **AI-Generated Content**: AI writes ATS-optimized bullet points for experience and projects, and a professional summary tailored to the target job field
- **9 HTML Resume Templates**: `accent`, `centered`, `classic`, `diamond`, `executive`, `minimal`, `serifpro`, `sharp`, `twocol`
- **PDF Export**: Renders the chosen HTML template to PDF via WeasyPrint
- **Smart Suggestions**: Field-aware skill chip suggestions and job title autocomplete

### LaTeX Template System
- **3 Built-in LaTeX Templates**: Classic Professional (`clean_modern`), Minimalist (`jake`), Two-Column Compact (`sb2nov`)
- **Template Preferences**: Users can set and persist a default LaTeX template for all optimizations
- **Custom Templates**: Upload up to 3 personal LaTeX templates per user
- **Template Preview**: Live PDF preview of any template directly in the browser

### Authentication & User Management
- **Google OAuth**: Sign in with Google (ID token verification, auto-account creation)
- **JWT Dual-Token Architecture**: Short-lived access tokens (15min) + long-lived refresh tokens (7 days) via HttpOnly cookies
- **Encrypted API Key Storage**: User Groq API keys stored with Fernet encryption in the database
- **Role-Based Access Control**: User and admin roles with route-level enforcement
- **Run History**: Persistent storage of all optimization runs with scores and results

### Admin Dashboard
- **User Management**: Search, paginate, change roles, block/unblock users, mark as test user
- **System Metrics**: User growth charts, optimization run analytics, failure tracking (via Recharts)
- **Activity Logs**: Global and per-user activity tracking with detail views
- **Template Management**: CRUD operations on system templates, set defaults
- **Support Ticket Management**: View, reply, update status, mark read/unread, delete tickets
- **Maintenance Mode**: Toggle system-wide maintenance that blocks regular users (admins/test users bypass)

### Support System
- **Support Ticket Form**: Users can submit tickets (auto-populates user data if logged in)
- **Email Notifications**: SMTP integration sends notification to support team + acknowledgment to user
- **Admin Reply**: Support team can reply to tickets via admin panel (sends email to user)

### UI / UX
- **Dark / Light Theme**: System-aware theme toggle with localStorage persistence
- **Inline PDF Viewer**: View compiled PDFs within the app with mobile fallback (download/open buttons)
- **Visual LaTeX Editor**: Full-featured LaTeX editor with live preview and formatting toolbar
- **Responsive Layout**: Sidebar + dashboard layout, mobile hamburger menu
- **Animations**: Framer Motion transitions, particle background effects
- **Toast Notifications**: Contextual success/error feedback via react-hot-toast
- **Confirm Dialogs**: Reusable confirmation modals with Escape key support

## Architecture

### Backend Stack
- **Framework**: FastAPI (Python 3.11+)
- **Agent**: LangGraph + Groq (llama-3.3-70b-versatile)
- **Database**: PostgreSQL + SQLAlchemy ORM
- **Auth**: JWT (PyJWT) + bcrypt + Google OAuth (google-auth)
- **Encryption**: Fernet (cryptography) for API key storage at rest
- **PDF Extraction**: pdfplumber
- **Resume PDF Generation**: WeasyPrint (HTML templates via Jinja2)
- **LaTeX Compilation**: External service (latex.ytotech.com)
- **Email**: SMTP (Zoho/Gmail) for support notifications
- **Streaming**: Server-Sent Events (SSE) for real-time agent progress
- **Deployment**: Docker + Gunicorn (2 Uvicorn workers, 180s timeout)

### Frontend Stack
- **Framework**: React 19 + Vite 7
- **Routing**: React Router v7
- **HTTP**: Axios (with response caching and automatic token refresh)
- **Styling**: Tailwind CSS 4
- **UI Components**: Radix UI primitives, Lucide React icons
- **Charts**: Recharts (admin metrics)
- **Animations**: Framer Motion
- **Auth**: @react-oauth/google
- **Notifications**: react-hot-toast
- **SEO**: react-helmet-async
- **Dates**: date-fns
- **Theme**: Dark/light mode with ThemeContext + localStorage

### Agent Workflow

```
┌─────────────────────┐
│ Extract Job Reqs    │ - Parse job description (LLM, temp=0)
└──────────┬──────────┘
           │
┌──────────▼──────────┐
│ Analyze Resume      │ - Identify strengths/gaps (LLM, temp=0)
└──────────┬──────────┘
           │
┌──────────▼──────────┐
│ Fit Check (Gate)    │ - Keyword/skill matching (NO LLM)
└──────────┬──────────┘
           │
    ┌──────▼──────┐
    │ Poor Fit?   │  Thresholds: poor(<0.15), partial(<0.40), good(>=0.40)
    └──┬───────┬──┘
       │       │
    Yes│       │No
       │       │
    ┌──▼───┐  │
    │ END  │  │
    └──────┘  │
              │
         ┌────▼─────────┐
         │ Score Resume │  ATS scoring (keywords 40 + skills 30 + format 15 + sections 15)
         └────┬─────────┘
              │
    ┌─────────▼──────────┐
    │ Plan Improvements  │ ◄─────┐
    └─────────┬──────────┘       │
              │                  │
    ┌─────────▼──────────┐       │
    │ Modify Resume      │       │  LaTeX output with template preamble injection
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
    │ Generate Cover     │ - Cover letter from final resume
    │ Letter             │
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

### Database Models

| Model | Purpose |
|---|---|
| **User** | Accounts, roles, encrypted API keys, template preferences, custom templates (JSONB) |
| **Run** (ResumeRun) | Optimization runs with status, scores, results (JSONB), cover letter |
| **Resume** | Resume builder drafts with structured contact/experience/education/projects/skills (JSONB) |
| **MissingSkillsRun** | Skills gap analysis results with resume snippet and JD counts |
| **SupportTicket** | Support requests with read/unread tracking and reply status |
| **SystemSetting** | Key-value store for system-wide settings (maintenance mode, admin defaults) |

## Project Structure

```
Resume-Agent/
├── backend/
│   ├── agent/                  # LangGraph agent core
│   │   ├── nodes/             # Individual agent nodes
│   │   │   ├── cover_letter.py      # Cover letter generation
│   │   │   ├── fit_check.py         # Job-resume fit gate (deterministic)
│   │   │   ├── job_requirements.py  # JD extraction
│   │   │   ├── modification.py      # Resume rewriting (LaTeX output)
│   │   │   ├── planning.py          # Improvement planning
│   │   │   ├── rescore.py           # Re-scoring after edit
│   │   │   ├── resume_analysis.py   # Strengths/gaps analysis
│   │   │   └── scoring.py           # ATS scoring algorithm
│   │   ├── state.py           # Agent state definition (TypedDict)
│   │   └── workflow.py        # LangGraph workflow + SSE streaming
│   ├── api/
│   │   ├── middleware/        # Auth middleware (dependencies)
│   │   └── routes/
│   │       ├── admin.py       # Admin endpoints (users, tickets, metrics, maintenance)
│   │       ├── agent.py       # Optimization, run history, templates, missing skills
│   │       ├── auth.py        # Google OAuth, token refresh, logout
│   │       ├── latex.py       # LaTeX compilation endpoint
│   │       ├── pdf.py         # PDF text extraction
│   │       ├── resume_builder.py  # Resume CRUD + AI generation
│   │       ├── support.py     # Support ticket creation
│   │       └── user.py        # User profile, settings, API key, template preferences
│   ├── auth/                  # JWT utilities + Google OAuth
│   │   ├── jwt.py             # Access/refresh token creation & validation
│   │   └── dependencies.py    # FastAPI Depends (get_current_user, get_current_admin)
│   ├── core/                  # Security (Fernet encryption)
│   ├── database/
│   │   ├── migrations/        # Schema migrations
│   │   └── models/            # SQLAlchemy models
│   │       ├── user.py             # User model
│   │       ├── run.py              # ResumeRun model
│   │       ├── resume.py           # Resume + ResumeTemplate models
│   │       ├── missing_skills_run.py  # MissingSkillsRun model
│   │       ├── support.py          # SupportTicket model
│   │       └── system_setting.py   # SystemSetting model
│   ├── schemas/               # Pydantic request/response models
│   │   ├── agent.py           # Optimization request/response
│   │   ├── auth.py            # Auth + API key schemas
│   │   ├── google.py          # Google OAuth schemas
│   │   ├── resume_builder.py  # Resume builder schemas
│   │   ├── run.py             # Run schemas
│   │   └── support.py         # Support ticket schemas
│   ├── services/
│   │   ├── ai_resume_generator.py  # AI bullet/summary generation
│   │   ├── email.py                # SMTP email service (support tickets)
│   │   ├── latex_service.py        # LaTeX compilation client
│   │   ├── latex_templates.py      # Built-in LaTeX template library
│   │   ├── pdf_service.py          # PDF text extraction
│   │   └── template_renderer.py    # Jinja2 HTML template renderer (WeasyPrint)
│   ├── templates/             # HTML resume templates for Resume Builder
│   │   └── (accent, centered, classic, diamond, executive,
│   │       minimal, serifpro, sharp, twocol).html
│   ├── tests/                 # Backend tests (pytest)
│   │   ├── api/               # Auth, middleware, endpoint tests
│   │   └── agent/             # Workflow, node, state flow tests
│   ├── Dockerfile             # Multi-stage Docker build (Python 3.11-slim)
│   ├── config.py              # Centralized configuration
│   └── main.py                # App entry point (CORS, routes, health checks)
│
├── frontend/
│   └── src/
│       ├── components/        # Shared UI components
│       │   ├── DashboardLayout.jsx      # Sidebar + content wrapper
│       │   ├── Sidebar.jsx              # Navigation menu with admin sections
│       │   ├── Navbar.jsx               # Public page navigation
│       │   ├── ProtectedRoute.jsx       # Auth guard with role-based redirect
│       │   ├── PdfViewer.jsx            # Inline PDF viewer + mobile fallback
│       │   ├── VisualResumeEditor.jsx   # LaTeX editor with live preview
│       │   ├── ConfirmDialog.jsx        # Confirmation modal
│       │   ├── Toast.jsx                # Toast notification component
│       │   ├── ThemeToggle.jsx          # Dark/light mode switch
│       │   └── ui/                      # Radix UI primitives (button, card, input, skeleton)
│       ├── context/
│       │   └── ThemeContext.jsx          # Global theme state + localStorage
│       ├── lib/
│       │   └── utils.js                 # clsx + tailwind-merge utility
│       ├── pages/
│       │   ├── Home.jsx                 # Marketing landing page
│       │   ├── Auth.jsx                 # Google OAuth login
│       │   ├── Dashboard.jsx            # User stats (runs, avg improvement, best score)
│       │   ├── NewOptimization.jsx      # 4-step optimization wizard with streaming
│       │   ├── OptimizationResults.jsx  # Results + score chart + cover letter + PDF
│       │   ├── RunHistory.jsx           # Tabbed history (resumes, optimizations, skill gaps)
│       │   ├── ResumeBuilder.jsx        # Form-based resume builder with AI
│       │   ├── Templates.jsx            # LaTeX template browser & custom templates
│       │   ├── MissingSkills.jsx        # Skills gap analyzer
│       │   ├── MissingSkillsHistory.jsx # History of gap analyses
│       │   ├── Settings.jsx             # API key management + logout
│       │   ├── Support.jsx              # Support ticket form
│       │   ├── AdminDashboard.jsx       # Admin wrapper + maintenance toggle
│       │   ├── AdminMetrics.jsx         # System metrics with charts
│       │   ├── AdminUsers.jsx           # User management table
│       │   ├── AdminActivity.jsx        # Activity logs
│       │   ├── AdminTemplates.jsx       # Template management
│       │   ├── AdminSupport.jsx         # Support ticket management
│       │   ├── Maintenance.jsx          # Maintenance mode page (particle animation)
│       │   └── NotFound.jsx             # 404 page
│       └── services/
│           └── api.js                   # Axios client (caching, token refresh, streaming)
│
├── tests/
│   └── robot/                 # Robot Framework E2E tests (UI + API)
│
├── .github/
│   └── workflows/
│       ├── backend-ci.yml     # PR checks: flake8 lint + pytest (with PostgreSQL service)
│       ├── frontend-ci.yml    # PR/push checks: lint + build
│       └── backend-deploy.yml # Deploy: Docker build → GHCR → Azure App Service
│
├── DEVELOPMENT.md             # Troubleshooting (cache, migrations, deployment)
├── GOOGLE_OAUTH_SETUP.md      # Google OAuth configuration guide
└── README.md
```

## API Endpoints

### Authentication (`/api/auth`)

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | `/api/auth/google` | - | Google OAuth sign-in/sign-up |
| GET | `/api/auth/me` | Required | Get current user profile |
| GET | `/api/auth/check` | Required | Check auth status |
| POST | `/api/auth/refresh` | - | Refresh access token via cookie |
| POST | `/api/auth/logout` | - | Clear auth cookies |

### User (`/api/user`)

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | `/api/user/me` | Required | Get user info |
| GET | `/api/user/profile` | Required | Get profile with stats |
| GET | `/api/user/status` | Optional | Service status |
| GET | `/api/user/api-key/status` | Required | Check if API key is set |
| POST | `/api/user/api-key` | Required | Store encrypted Groq API key |
| DELETE | `/api/user/api-key` | Required | Delete API key |
| GET | `/api/user/template-preference` | Required | Get template choice + custom templates |
| POST | `/api/user/template-preference` | Required | Set default template |
| POST | `/api/user/custom-template` | Required | Add custom LaTeX template (max 3) |
| PUT | `/api/user/custom-template/{index}` | Required | Update custom template |
| DELETE | `/api/user/custom-template/{index}` | Required | Delete custom template |
| DELETE | `/api/user/template-preference` | Required | Reset to default template |

### Agent (`/api/agent`)

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | `/api/agent/templates` | - | List available LaTeX templates |
| GET | `/api/agent/template-preview/{id}` | - | PDF preview of template |
| POST | `/api/agent/run` | Required | Run optimization (blocking) |
| POST | `/api/agent/run/stream` | Required | Run optimization with SSE streaming |
| GET | `/api/agent/runs` | Required | List user's runs (paginated) |
| GET | `/api/agent/runs/{run_id}` | Required | Get single run detail |
| DELETE | `/api/agent/runs/{run_id}` | Required | Delete run |
| POST | `/api/agent/missing-skills` | Required | Analyze missing skills across JDs |

### Resume Builder (`/api/resume`)

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | `/api/resume/list` | Required | List saved resume drafts |
| POST | `/api/resume/create` | Required | Create/save resume draft |
| POST | `/api/resume/analyze` | Required | AI ATS analysis |
| POST | `/api/resume/optimize` | Required | AI bullet optimization |

### Other

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | `/api/latex/compile` | - | Compile LaTeX to PDF |
| POST | `/api/pdf/extract` | - | Extract text from PDF upload |
| POST | `/api/support` | Optional | Create support ticket |

### Admin (`/api/admin`)

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | `/api/admin/users` | Admin | List users (paginated, searchable) |
| PUT | `/api/admin/users/{id}/role` | Admin | Change user role |
| PUT | `/api/admin/users/{id}/block` | Admin | Block/unblock user |
| PUT | `/api/admin/users/{id}/test` | Admin | Mark as test user |
| GET | `/api/admin/support` | Admin | List support tickets |
| GET | `/api/admin/support/{id}` | Admin | View ticket details |
| PUT | `/api/admin/support/{id}/status` | Admin | Update ticket status |
| POST | `/api/admin/support/{id}/reply` | Admin | Reply to ticket (sends email) |
| GET | `/api/admin/stats` | Admin | System statistics |

## Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+
- PostgreSQL
- **Groq API Key** (free tier at [console.groq.com/keys](https://console.groq.com/keys))
- *(Optional)* Google OAuth Client ID for Google Sign-In -- see [`GOOGLE_OAUTH_SETUP.md`](GOOGLE_OAUTH_SETUP.md)

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

The frontend proxies `/api` requests to the backend via Vite config.

## Configuration

See `backend/.env.example` for all required environment variables.

Key settings managed in `backend/config.py`:

### Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET_KEY` | JWT signing secret |
| `ENCRYPTION_KEY` | Fernet key for encrypting stored API keys |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `LATEX_COMPILE_URL` | External LaTeX compiler URL (default: latex.ytotech.com) |
| `ALLOWED_ORIGINS` | Comma-separated CORS allowed origins |
| `SMTP_HOST` | SMTP server for support emails |
| `SMTP_PORT` | SMTP port (465 for SSL, 587 for STARTTLS) |
| `SMTP_USER` | SMTP account email |
| `SMTP_PASSWORD` | SMTP password |
| `VITE_API_PROXY_TARGET` | *(frontend `.env`)* Backend URL for Vite proxy |
| `VITE_GOOGLE_CLIENT_ID` | *(frontend `.env`)* Google OAuth client ID |

### Agent Tuning

| Setting | Default | Description |
|---|---|---|
| `MAX_ITERATIONS` | 3 | Max optimization iterations |
| `TARGET_SCORE` | 75.0 | Target ATS score to stop |
| `MIN_ITERATION_GAIN` | 1.0 | Minimum score improvement per iteration |
| `FIT_THRESHOLD_POOR` | 0.15 | Below this = poor fit (rejected) |
| `FIT_THRESHOLD_PARTIAL` | 0.40 | Below this = partial fit |
| `DEFAULT_TEMPERATURE` | 0.2 | LLM temperature |
| `MAX_TOKENS` | 4000 | Max tokens per LLM call |

## Infrastructure

| Service | Provider | Purpose |
|---------|----------|---------|
| **Backend Hosting** | Azure App Service (B1) | Docker container running FastAPI + Gunicorn |
| **Frontend Hosting** | Vercel | SPA deployment with SPA rewrites, security headers, asset caching |
| **Database** | PostgreSQL (managed) | Primary data store via SQLAlchemy ORM |
| **Container Registry** | GitHub Container Registry (`ghcr.io`) | Docker image storage for backend deployments |
| **CI/CD** | GitHub Actions | 3 workflows: backend CI, frontend CI, backend deploy |
| **LLM API** | Groq (llama-3.3-70b-versatile) | Resume analysis, planning, modification, cover letter |
| **Authentication** | Google OAuth 2.0 | User sign-in via Google ID token verification |
| **Email** | Zoho SMTP (`smtp.zoho.in`) | Support ticket notifications and replies |
| **LaTeX Compilation** | latex.ytotech.com | External PDF compilation service |
| **Domain** | `resiko.app` | Production domain with cookie support across subdomains |

## Deployment

### Backend (Docker + Azure)

The backend includes a multi-stage Dockerfile (`python:3.11-slim`) optimized for Azure App Service B1 tier (1 vCPU / 1.75GB RAM):

```bash
# Build and run locally
docker build -t resiko-backend ./backend
docker run -p 8000:8000 --env-file backend/.env resiko-backend
```

GitHub Actions (`backend-deploy.yml`) automates:
1. Run tests with PostgreSQL 16 service container
2. Build Docker image
3. Push to GitHub Container Registry (`ghcr.io`)
4. Deploy to Azure Web App via `azure/webapps-deploy@v3`

Production server: Gunicorn with 2 Uvicorn workers, 180s timeout, 5s keep-alive.

### Frontend (Vercel)

The frontend is deployed via Vercel's GitHub integration with `vercel.json` configuration:
- SPA routing (all routes rewrite to `/`)
- Security headers (`X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`)
- Asset caching: 1-year immutable cache for static assets
- GitHub Actions (`frontend-ci.yml`) runs lint and build checks on PRs

## Testing

### Backend (pytest)

```bash
cd backend
pytest                     # Run all tests
pytest tests/agent/        # Agent tests only
pytest tests/api/          # API tests only
```

### Robot Framework (E2E)

```bash
cd tests/robot
robot ui_tests.robot       # UI automation
robot api_tests.robot      # API automation
```

See `tests/robot/README.md` for setup instructions.

### CI/CD

- **backend-ci.yml**: Runs flake8 lint + pytest on PRs touching `backend/`
- **frontend-ci.yml**: Runs lint + build on PRs/pushes touching `frontend/`
- **backend-deploy.yml**: Full deploy pipeline on pushes to main

## Documentation

- **API Docs**: http://localhost:8000/docs (Swagger UI, when running locally)
- **Google OAuth Setup**: [`GOOGLE_OAUTH_SETUP.md`](GOOGLE_OAUTH_SETUP.md)
- **Troubleshooting**: [`DEVELOPMENT.md`](DEVELOPMENT.md) for cache clearing, migration issues, deployment notes

## Team

Built by [Shabas](https://github.com/ShabasRahman7), [Sinan](https://github.com/sinan-prvt), and [Marva](https://github.com/marvakt)

## License

MIT License
