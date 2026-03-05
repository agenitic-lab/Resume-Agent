
# Resume optimization API endpoints

import logging
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse, Response
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List
import uuid
import json
import asyncio
import io
from datetime import datetime
from queue import Queue, Empty

logger = logging.getLogger(__name__)

from database.connection import get_db
from database.models import User
from database.models.run import ResumeRun
from auth.dependencies import get_current_user
from schemas.agent import OptimizeRequest, OptimizeResponse, RunListItem, RunDetailResponse
from core.security import decrypt_api_key
from services.latex_templates import get_all_templates, get_template_preamble
from services.latex_service import compile_latex, LaTeXCompilationError

# Import agent workflow using proper package path
try:
    from agent.workflow import run_optimization, run_optimization_with_events
except ImportError as e:
    # Fallback for testing/development if workflow not found
    logger.warning("Could not import run_optimization from agent.workflow: %s", e)
    def run_optimization(**kwargs):
        raise NotImplementedError("Workflow module not available")
    def run_optimization_with_events(**kwargs):
        raise NotImplementedError("Workflow module not available")

router = APIRouter(prefix="/api/agent", tags=["agent"])


import os as _os


def _get_global_default_template() -> str | None:
    """Read admin-set global default template ID from the database."""
    try:
        from database.connection import SessionLocal
        from database.models.system_setting import SystemSetting
        db = SessionLocal()
        try:
            row = db.query(SystemSetting).filter(SystemSetting.key == "default_template").first()
            if row and row.value:
                return row.value.get("template_id")
            return None
        finally:
            db.close()
    except Exception:
        return None


def _resolve_template(user) -> tuple:
    """Resolve the user's template preference to (template_id, custom_latex).
    
    For custom templates (custom_0, custom_1, custom_2), looks up the latex
    from the user's custom_templates JSON array. For builtin templates,
    returns (template_id, None). Falls back to admin-set global default.
    """
    template_id = getattr(user, 'default_template', None)

    # Fall back to admin-set global default if user has no preference
    if not template_id:
        global_default = _get_global_default_template()
        if global_default:
            return global_default, None
        return None, None
    
    if template_id.startswith("custom_"):
        try:
            idx = int(template_id.replace("custom_", ""))
            custom_templates = getattr(user, 'custom_templates', None) or []
            if 0 <= idx < len(custom_templates):
                return "custom", custom_templates[idx].get("latex", "")
        except (ValueError, IndexError):
            pass
        legacy = getattr(user, 'custom_template_latex', None)
        if legacy:
            return "custom", legacy
        return None, None
    
    return template_id, None


# --- Template catalog endpoint ---
@router.get("/templates", summary="List available LaTeX templates")
def list_templates():
    return {"templates": get_all_templates()}


# --- Per-template sample bodies for preview ---
# Each template gets its own body showcasing its unique layout and features.
SAMPLE_BODIES = {
    "clean_modern": r"""
\begin{document}

\begin{center}
    {\Huge \scshape Alex Johnson} \\ \vspace{1pt}
    \small \raisebox{-0.1\height}\faPhone\ 555-123-4567 ~
    \href{mailto:alex.johnson@email.com}{\raisebox{-0.2\height}\faEnvelope\  \underline{alex.johnson@email.com}} \\
    \href{https://linkedin.com/in/alexjohnson}{\raisebox{-0.2\height}\faLinkedin\ \underline{linkedin.com/in/alexjohnson}}  ~
    \href{https://github.com/alexjohnson}{\raisebox{-0.2\height}\faGithub\ \underline{github.com/alexjohnson}}
    \vspace{-8pt}
\end{center}

\section{Education}
\resumeSubHeadingListStart
    \resumeSubheading
        {University of California, Berkeley}{Aug 2018 -- May 2022}
        {B.S. in Computer Science, GPA: 3.8/4.0}{Berkeley, CA}
\resumeSubHeadingListEnd

\section{Experience}
\resumeSubHeadingListStart
    \resumeSubheading
        {Senior Software Engineer}{Jan 2024 -- Present}
        {Tech Corp Inc.}{San Francisco, CA}
    \resumeItemListStart
        \resumeItem{Architected and deployed a high-throughput microservices platform processing 2M+ daily API requests, reducing system latency by 40\% through event-driven design and Redis caching}
        \resumeItem{Led migration of monolithic application to Kubernetes-orchestrated microservices, achieving 99.99\% uptime and enabling horizontal scaling across 3 cloud regions}
        \resumeItem{Mentored team of 5 junior engineers, establishing code review standards that reduced production bugs by 35\%}
    \resumeItemListEnd

    \resumeSubheading
        {Software Engineer}{Jun 2022 -- Dec 2023}
        {StartupXYZ}{San Francisco, CA}
    \resumeItemListStart
        \resumeItem{Built real-time data pipeline using Apache Kafka and Python, processing 500K events/hour for analytics dashboard used by 200+ enterprise clients}
        \resumeItem{Developed RESTful APIs using FastAPI with PostgreSQL, implementing JWT authentication and role-based access control serving 50K+ monthly active users}
        \resumeItem{Optimized database queries and implemented connection pooling, reducing average response time from 800ms to 120ms}
    \resumeItemListEnd
\resumeSubHeadingListEnd

\section{Projects}
\resumeSubHeadingListStart
    \resumeProjectHeading
        {\textbf{AI Resume Optimizer} $|$ \emph{Python, LangGraph, FastAPI, React}}{2024}
    \resumeItemListStart
        \resumeItem{Built an AI-powered resume optimization tool using LangGraph agents to analyze job descriptions and tailor resumes, increasing interview callback rates by 60\%}
        \resumeItem{Implemented real-time streaming updates via Server-Sent Events for live optimization progress feedback}
    \resumeItemListEnd
    \resumeProjectHeading
        {\textbf{Cloud Infrastructure Monitor} $|$ \emph{Go, Prometheus, Grafana, Docker}}{2023}
    \resumeItemListStart
        \resumeItem{Designed monitoring solution tracking 100+ metrics across distributed systems with custom alerting rules}
    \resumeItemListEnd
\resumeSubHeadingListEnd

\section{Technical Skills}
\begin{itemize}[leftmargin=0.15in, label={}]
    \small{\item{
        \textbf{Languages}{: Python, JavaScript/TypeScript, Go, SQL, Java, C++} \\
        \textbf{Frameworks}{: FastAPI, React, Node.js, Django, Flask, LangChain} \\
        \textbf{Tools \& Platforms}{: AWS, Docker, Kubernetes, PostgreSQL, Redis, Git, CI/CD, Terraform}
    }}
\end{itemize}

\end{document}
""",
    "jake": r"""
\begin{document}

\begin{center}
    {\Huge \scshape Alex Johnson} \\ \vspace{1pt}
    San Francisco, CA \\ \vspace{1pt}
    \small \href{tel:+15551234567}{ \raisebox{-0.1\height}\faPhone\ \underline{+1-555-123-4567} ~} \href{mailto:alex.johnson@email.com}{\raisebox{-0.2\height}\faEnvelope\  \underline{alex.johnson@email.com}} ~ 
    \href{https://linkedin.com/in/alexjohnson}{\raisebox{-0.2\height}\faLinkedin\ \underline{alexjohnson}}  ~
    \href{https://github.com/alexjohnson}{\raisebox{-0.2\height}\faGithub\ \underline{alexjohnson}}
    \vspace{-8pt}
\end{center}

\section{EDUCATION}
  \resumeSubHeadingListStart
    \resumeSubheading
      {University of California, Berkeley}{Aug 2018 -- May 2022}
      {B.S. in Computer Science - \textbf{GPA} - \textbf{3.8/4.0}}{Berkeley, CA}
  \resumeSubHeadingListEnd

\section{COURSEWORK / SKILLS}
    \begin{multicols}{4}
        \begin{itemize}[itemsep=-2pt, parsep=5pt]
            \item Data Structures \& Algorithms
            \item Operating Systems
            \item Cloud Computing
            \item Database Systems
            \item Machine Learning
            \item Software Engineering
            \item Network Security
            \item Web Development
        \end{itemize}
    \end{multicols}
    \vspace*{2.0\multicolsep}

\section{PROJECTS}
    \vspace{-5pt}
    \resumeSubHeadingListStart
       \resumeProjectHeading
          {\textbf{\large{\underline{AI Resume Optimizer}}} $|$ \large{\underline{Python, FastAPI, React}}}{2024}
          \resumeItemListStart
            \resumeItem{\normalsize{Built an AI-powered resume optimization tool using \textbf{LangGraph agents} to analyze job descriptions.}}
            \resumeItem{\normalsize{Implemented real-time streaming updates via Server-Sent Events for live progress feedback.}}
          \resumeItemListEnd 
          \vspace{-13pt}
          
      \resumeProjectHeading
          {\textbf{\large{\underline{Cloud Infrastructure Monitor}}} $|$ \large{\underline{Go, Prometheus, Docker}}}{2023}
          \resumeItemListStart
            \resumeItem{\normalsize{Designed monitoring solution tracking \textbf{100+ metrics} with custom alerting rules.}}
          \resumeItemListEnd
          
    \resumeSubHeadingListEnd
\vspace{-12pt}

\section{EXPERIENCE}
  \resumeSubHeadingListStart

    \resumeSubheading
      {Tech Corp Inc.}{Jan 2024 -- Present} 
      {\underline{Senior Software Engineer}}{San Francisco, CA}
      \resumeItemListStart
        \resumeItem{\normalsize{Architected microservices platform processing \textbf{2M+ daily API requests}, reducing latency by 40\%.}}
        \resumeItem{\normalsize{Led migration to Kubernetes achieving \textbf{99.99\% uptime} across 3 cloud regions.}}
        \resumeItem{\normalsize{Mentored team of 5 junior engineers, establishing code review standards.}}
      \resumeItemListEnd  

    \resumeSubheading
      {StartupXYZ}{Jun 2022 -- Dec 2023} 
      {\underline{Software Engineer}}{San Francisco, CA}
      \resumeItemListStart
        \resumeItem{\normalsize{Built real-time data pipeline using Apache Kafka processing \textbf{500K events/hour}.}}
        \resumeItem{\normalsize{Developed RESTful APIs with FastAPI and PostgreSQL serving \textbf{50K+ users}.}}
      \resumeItemListEnd  
  \resumeSubHeadingListEnd
\vspace{-12pt}

\section{TECHNICAL SKILLS}
 \begin{itemize}[leftmargin=0.15in, label={}]
    \small{\item{
     \textbf{\normalsize{Languages:}}{ \normalsize{Python, JavaScript, Go, SQL, Java, C++}} \\
     \textbf{\normalsize{Developer Tools:}}{ \normalsize{VS Code, Docker, Kubernetes, Git, Terraform}} \\
     \textbf{\normalsize{Technologies/Frameworks:}}{\normalsize{ FastAPI, React, Node.js, Django, PostgreSQL, Redis, AWS}} \\
    }}
 \end{itemize}
 \vspace{-15pt}

\section{CERTIFICATIONS}

$\sbullet[.75] \hspace{0.1cm}$ {AWS Solutions Architect} \hspace{1.6cm}
$\sbullet[.75] \hspace{0.1cm}$ {Kubernetes Administrator} \hspace{1.5cm}
$\sbullet[.75] \hspace{0.2cm}${Google Cloud Professional}\\

$\sbullet[.75] \hspace{0.2cm}${Docker Certified Associate} \hspace{1cm}
$\sbullet[.75] \hspace{0.1cm}$ {Terraform Associate} \hspace{2.0cm}
$\sbullet[.75] \hspace{0.2cm}${MongoDB Developer} \\

\end{document}
""",
    "sb2nov": r"""
\begin{document}
\fontfamily{cmr}\selectfont

\begin{tabularx}{\linewidth}{L r} \\
  \textbf{\Large Alex Johnson} & {\raisebox{0.0\height}{\footnotesize \faPhone}\ +1-555-123-4567}\\
  {Software Engineer} & \href{mailto:alex.johnson@email.com}{\raisebox{0.0\height}{\footnotesize \faEnvelope}\ {alex.johnson@email.com}} \\
  {San Francisco, CA} & \href{https://github.com/alexjohnson}{\raisebox{0.0\height}{\footnotesize \faGithub}\ {GitHub Profile}} \\  
  {} & \href{https://linkedin.com/in/alexjohnson}{\raisebox{0.0\height}{\footnotesize \faLinkedin}\ {LinkedIn Profile}}
\end{tabularx}

\cvsection{Education}
\resumeSubHeadingListStart
    \resumeSubheading
      {University of California, Berkeley}{GPA: 3.8/4.0}
      {B.S. in Computer Science}{2018 -- 2022}
\resumeSubHeadingListEnd
\vspace{-5.5mm}

\cvsection{Experience}
\resumeSubHeadingListStart
    \resumeSubheading
      {Senior Software Engineer}{San Francisco, CA}
      {Tech Corp Inc.}{Jan 2024 -- Present}
      \vspace{-2.0mm}
      \resumeItemListStart
    \item {Architected and deployed a high-throughput microservices platform processing 2M+ daily API requests, reducing system latency by 40\% through event-driven design.}
    \item {Led migration of monolithic application to Kubernetes-orchestrated microservices, achieving 99.99\% uptime and enabling horizontal scaling.}
    \item {Mentored team of 5 junior engineers, establishing code review standards that reduced production bugs by 35\%.}
    \resumeItemListEnd
    
    \vspace{-3.0mm}
    
    \resumeSubheading
      {Software Engineer}{San Francisco, CA}
      {StartupXYZ}{Jun 2022 -- Dec 2023}
      \vspace{-2.0mm}
      \resumeItemListStart
    \item {Built real-time data pipeline using Apache Kafka and Python, processing 500K events/hour for analytics dashboard.}
    \item {Developed RESTful APIs using FastAPI with PostgreSQL, implementing JWT authentication serving 50K+ users.}
    \resumeItemListEnd
    
    \vspace{-3.0mm}
      
\resumeSubHeadingListEnd
\vspace{-5.5mm}

\cvsection{Projects}
\resumeSubHeadingListStart
    \resumeProject
      {AI Resume Optimizer}
      {Python, LangGraph, FastAPI, React}
      {2024}
      {}

      \resumeItemListStart
        \item {Built an AI-powered resume optimization tool using LangGraph agents to analyze job descriptions and tailor resumes.}
        \item {Implemented real-time streaming updates via Server-Sent Events for live optimization progress feedback.}
    \resumeItemListEnd
    \vspace{-2mm}
    
    \resumeProject
      {Cloud Infrastructure Monitor}
      {Go, Prometheus, Grafana, Docker}
      {2023}
      {}

      \resumeItemListStart
        \item {Designed monitoring solution tracking 100+ metrics across distributed systems with custom alerting rules.}
    \resumeItemListEnd
      
\resumeSubHeadingListEnd
\vspace{-8.5mm}

\cvsection{Technical Skills and Interests}
 \begin{itemize}[leftmargin=0.05in, label={}]
    \small{\item{
     \textbf{Languages}{: Python, JavaScript/TypeScript, Go, SQL, Java, C++} \\
     \textbf{Frameworks}{: FastAPI, React, Node.js, Django, Flask, LangChain} \\
     \textbf{Cloud/Databases}{: AWS, PostgreSQL, Redis, MongoDB, Firebase} \\
     \textbf{Tools}{: Docker, Kubernetes, Git, CI/CD, Terraform} \\
     \textbf{Areas of Interest}{: Distributed Systems, Cloud Architecture, Machine Learning}
    }}
 \end{itemize}
 \vspace{-16pt}

\end{document}
""",
}


@router.get(
    "/template-preview/{template_id}",
    summary="Get a compiled PDF preview of a built-in template with sample data",
    responses={200: {"content": {"application/pdf": {}}}},
)
def get_template_preview(template_id: str):
    preamble = get_template_preamble(template_id)
    if not preamble:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Template '{template_id}' not found",
        )

    # Use template-specific sample body (falls back to clean_modern)
    sample_body = SAMPLE_BODIES.get(template_id, SAMPLE_BODIES["clean_modern"])
    full_latex = preamble.strip() + "\n" + sample_body.strip() + "\n"

    try:
        pdf_bytes = compile_latex(full_latex)
    except LaTeXCompilationError as e:
        logger.error("Failed to compile template preview for %s: %s", template_id, e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to compile template preview. Please try again.",
        )
    except Exception as e:
        logger.exception("Unexpected error generating template preview for %s", template_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unexpected error generating preview. Please try again.",
        )

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"inline; filename={template_id}_preview.pdf",
            "Cache-Control": "public, max-age=86400",
        },
    )


@router.post("/run", response_model=OptimizeResponse)
def run_agent_workflow(
    request: OptimizeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Run agent optimization workflow
    # Check if user has set their API key
    if not current_user.encrypted_api_key:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Set your API key in Settings before running optimization.",
        )

    try:
        user_llm_api_key = decrypt_api_key(current_user.encrypted_api_key)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Stored API key is invalid. Please set your API key again in Settings.",
        )

    try:
        # Generate run ID
        run_id = f"run-{uuid.uuid4()}"
        
        # Skip template when user provided raw LaTeX
        if request.input_type == "latex":
            template_id, custom_latex = None, None
        else:
            template_id, custom_latex = _resolve_template(current_user)
        
        logger.info("Starting optimization run: %s for user %s", run_id, current_user.id)
        
        # Run the agent workflow
        result = run_optimization(
            job_description=request.job_description,
            resume=request.resume,
            user_id=str(current_user.id),
            user_llm_api_key=user_llm_api_key,
            run_id=run_id,
            template_id=template_id,
            custom_template_latex=custom_latex,
        )
        
        logger.info("Agent completed: %s", result['final_status'])
        
        # Save to database (AG-37)
        # Store all results in result_json JSONB field
        db_run = ResumeRun(
            user_id=current_user.id,
            job_description=request.job_description,
            original_resume_text=request.resume,
            status=result.get("final_status", "completed"),
            cover_letter=result.get("cover_letter"),  # Save to dedicated column
            result_json=result  # Store the entire result in JSONB
        )
        
        db.add(db_run)
        db.commit()
        db.refresh(db_run)
        
        # Return response
        return OptimizeResponse(
            run_id=str(db_run.id),
            user_id=str(current_user.id),
            job_description=request.job_description,
            original_resume=request.resume,
            modified_resume=result.get("modified_resume"),
            cover_letter=result.get("cover_letter"),  # Include in response
            ats_score_before=result.get("ats_score_before", 0.0),
            ats_score_after=result.get("ats_score_after"),
            improvement_delta=result.get("improvement_delta"),
            ats_breakdown_before=result.get("ats_breakdown_before"),
            ats_breakdown_after=result.get("ats_breakdown_after"),
            iteration_count=result.get("iteration_count", 0),
            final_status=result.get("final_status", "completed"),
            fit_decision=result.get("fit_decision", "unknown"),
            fit_reason=result.get("fit_reason"),
            fit_confidence=result.get("fit_confidence"),
            job_requirements=result.get("job_requirements"),
            resume_analysis=result.get("resume_analysis"),
            improvement_plan=result.get("improvement_plan"),
            decision_log=result.get("decision_log"),
            score_history=result.get("score_history"),
            latex_compilation_status=result.get("latex_compilation_status"),
            latex_compilation_error=result.get("latex_compilation_error"),
        )
        
    except Exception as e:
        # Log error and return user-friendly message
        logger.exception("Agent optimization error for user %s", current_user.id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Optimization failed. Please try again or check your API key."
        )


# --- SSE Streaming Endpoint ---
# Human-readable node descriptions for live status updates
NODE_DESCRIPTIONS = {
    "extract_requirements": {
        "label": "Extracting Job Requirements",
        "detail": "Parsing the job description to identify required skills, keywords, and experience levels",
    },
    "analyze_resume": {
        "label": "Analyzing Resume",
        "detail": "Evaluating your resume for strengths, weaknesses, and missing keywords",
    },
    "check_fit": {
        "label": "Checking Job Fit",
        "detail": "Assessing how well your profile matches the job requirements",
    },
    "score_initial": {
        "label": "Scoring Original Resume",
        "detail": "Calculating ATS compatibility score for your current resume",
    },
    "plan_improvements": {
        "label": "Planning Improvements",
        "detail": "Strategizing targeted changes to boost ATS score and keyword alignment",
    },
    "modify_resume": {
        "label": "Optimizing Resume",
        "detail": "Rewriting and restructuring your resume with improved phrasing and keywords",
    },
    "score_modified": {
        "label": "Re-scoring Resume",
        "detail": "Evaluating the optimized resume to measure improvement",
    },
    "generate_cover_letter": {
        "label": "Generating Cover Letter",
        "detail": "Creating a tailored cover letter based on your optimized resume",
    },
}


@router.post("/run/stream", summary="Run optimization with SSE streaming events")
def run_agent_workflow_stream(
    request: OptimizeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not current_user.encrypted_api_key:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Set your API key in Settings before running optimization.",
        )

    try:
        user_llm_api_key = decrypt_api_key(current_user.encrypted_api_key)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Stored API key is invalid. Please set your API key again in Settings.",
        )

    # Skip template when user provided raw LaTeX
    if request.input_type == "latex":
        template_id, custom_latex = None, None
    else:
        template_id, custom_latex = _resolve_template(current_user)

    run_id = f"run-{uuid.uuid4()}"
    event_queue = Queue()

    def event_callback(event_type, data):
        node = data.get("node", "")
        desc = NODE_DESCRIPTIONS.get(node, {})
        enriched = {
            **data,
            "label": desc.get("label", node),
            "detail": desc.get("detail", ""),
        }
        event_queue.put((event_type, enriched))

    def generate_events():
        import threading

        result_holder = [None]
        error_holder = [None]

        def run_workflow():
            try:
                result = run_optimization_with_events(
                    job_description=request.job_description,
                    resume=request.resume,
                    user_id=str(current_user.id),
                    user_llm_api_key=user_llm_api_key,
                    run_id=run_id,
                    event_callback=event_callback,
                    template_id=template_id,
                    custom_template_latex=custom_latex,
                )
                result_holder[0] = result
            except Exception as e:
                error_holder[0] = str(e)
            finally:
                event_queue.put(("__done__", {}))

        thread = threading.Thread(target=run_workflow, daemon=True)
        thread.start()

        # Stream events as SSE
        while True:
            try:
                event_type, data = event_queue.get(timeout=120)
            except Empty:
                # Send keep-alive to prevent timeout
                yield "event: keepalive\ndata: {}\n\n"
                continue

            if event_type == "__done__":
                break

            try:
                payload = json.dumps(data, default=str)
                yield f"event: {event_type}\ndata: {payload}\n\n"
            except (TypeError, ValueError) as e:
                # If serialization fails, send a simplified event
                yield f"event: {event_type}\ndata: {{\"node\": \"{data.get('node', 'unknown')}\"}}\n\n"

        # Wait for thread to finish
        thread.join(timeout=5)

        if error_holder[0]:
            error_payload = json.dumps({"message": error_holder[0]})
            yield f"event: error\ndata: {error_payload}\n\n"
            return

        result = result_holder[0]
        if result is None:
            yield f"event: error\ndata: {{\"message\": \"No result returned\"}}\n\n"
            return

        # Save to database
        try:
            db_run = ResumeRun(
                user_id=current_user.id,
                job_description=request.job_description,
                original_resume_text=request.resume,
                status=result.get("final_status", "completed"),
                cover_letter=result.get("cover_letter"),
                result_json=result,
            )
            db.add(db_run)
            db.commit()
            db.refresh(db_run)

            final_data = {
                "result": {
                    "run_id": str(db_run.id),
                    "user_id": str(current_user.id),
                    "job_description": request.job_description,
                    "original_resume": request.resume,
                    "modified_resume": result.get("modified_resume"),
                    "cover_letter": result.get("cover_letter"),
                    "ats_score_before": result.get("ats_score_before", 0.0),
                    "ats_score_after": result.get("ats_score_after"),
                    "improvement_delta": result.get("improvement_delta"),
                    "ats_breakdown_before": result.get("ats_breakdown_before"),
                    "ats_breakdown_after": result.get("ats_breakdown_after"),
                    "iteration_count": result.get("iteration_count", 0),
                    "final_status": result.get("final_status", "completed"),
                    "fit_decision": result.get("fit_decision", "unknown"),
                    "fit_reason": result.get("fit_reason"),
                    "fit_confidence": result.get("fit_confidence"),
                    "job_requirements": result.get("job_requirements"),
                    "resume_analysis": result.get("resume_analysis"),
                    "improvement_plan": result.get("improvement_plan"),
                    "decision_log": result.get("decision_log"),
                    "score_history": result.get("score_history"),
                    "latex_compilation_status": result.get("latex_compilation_status"),
                    "latex_compilation_error": result.get("latex_compilation_error"),
                }
            }
            yield f"event: completed\ndata: {json.dumps(final_data, default=str)}\n\n"
        except Exception as e:
            logger.exception("Failed to save optimization results for user %s", current_user.id)
            error_payload = json.dumps({"message": "Failed to save results. Please try again."})
            yield f"event: error\ndata: {error_payload}\n\n"

    return StreamingResponse(
        generate_events(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/runs/{run_id}", response_model=RunDetailResponse)
def get_run(
    run_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Get single run by ID
    run = db.query(ResumeRun).filter(ResumeRun.id == run_id).first()
    
    if not run:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Run not found"
        )
        
    # Check ownership
    if str(run.user_id) != str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view this run"
        )
    
    # Extract data from result_json
    result_json = run.result_json or {}
    ats_score_before = result_json.get("ats_score_before", 0.0)
    ats_score_after = result_json.get("ats_score_after", 0.0)
    improvement_delta = result_json.get("improvement_delta", 0.0)
    modified_resume = result_json.get("modified_resume", "")
    job_requirements = result_json.get("job_requirements")
    resume_analysis = result_json.get("resume_analysis")
    improvement_plan = result_json.get("improvement_plan")
    
    # Convert enum to string value if needed
    final_status = run.status.value if hasattr(run.status, 'value') else str(run.status)
        
    return RunDetailResponse(
        id=str(run.id),
        run_id=str(run.id),
        user_id=str(run.user_id),
        created_at=run.created_at,
        completed_at=run.updated_at,
        
        job_description=run.job_description,
        original_resume=run.original_resume_text,
        modified_resume=modified_resume,
        
        ats_score_before=ats_score_before,
        ats_score_after=ats_score_after,
        improvement_delta=improvement_delta,
        ats_breakdown_before=result_json.get("ats_breakdown_before"),
        ats_breakdown_after=result_json.get("ats_breakdown_after"),
        
        iteration_count=result_json.get("iteration_count", 0),
        final_status=final_status,
        fit_decision=result_json.get("fit_decision", "unknown"),
        fit_reason=result_json.get("fit_reason"),
        fit_confidence=result_json.get("fit_confidence"),
        
        job_requirements=job_requirements,
        resume_analysis=resume_analysis,
        improvement_plan=improvement_plan,
        decision_log=result_json.get("decision_log"),
        score_history=result_json.get("score_history"),
        cover_letter=result_json.get("cover_letter"),
        latex_compilation_status=result_json.get("latex_compilation_status"),
        latex_compilation_error=result_json.get("latex_compilation_error"),
    )


@router.get("/runs", response_model=List[RunListItem])
def get_user_runs(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    limit: int = 10,
    skip: int = 0
):
    # Get user's run history with pagination
    runs = db.query(ResumeRun)\
        .filter(ResumeRun.user_id == current_user.id)\
        .order_by(desc(ResumeRun.created_at))\
        .offset(skip)\
        .limit(limit)\
        .all()
        
    result_list = []
    for run in runs:
        # Extract scores from result_json if available
        result_json = run.result_json or {}
        ats_score_before = result_json.get("ats_score_before")
        ats_score_after = result_json.get("ats_score_after")
        
        # Calculate improvement delta if both scores are available
        improvement_delta = None
        if ats_score_before is not None and ats_score_after is not None:
            improvement_delta = ats_score_after - ats_score_before
        
        # Truncate job description safely
        job_desc = run.job_description or ""
        truncated_job_desc = job_desc[:100] + "..." if len(job_desc) > 100 else job_desc
        
        result_list.append(
            RunListItem(
                id=str(run.id),
                created_at=run.created_at,
                job_description=truncated_job_desc,
                ats_score_before=ats_score_before,
                ats_score_after=ats_score_after,
                improvement_delta=improvement_delta,
                status=run.status.value if hasattr(run.status, 'value') else str(run.status)
            )
        )
    
    return result_list


@router.delete("/runs/{run_id}")
def delete_run(
    run_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Delete a specific run by ID
    run = db.query(ResumeRun).filter(ResumeRun.id == run_id).first()
    
    if not run:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Run not found"
        )
        
    # Check ownership
    if str(run.user_id) != str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete this run"
        )
    
    # Delete the run
    db.delete(run)
    db.commit()
    
    return {"message": "Run deleted successfully"}
