#!/usr/bin/env python3
"""Test compiling the exact LaTeX the LLM generated to find the error."""
import httpx
import json

COMPILE_URL = "https://latex.ytotech.com/builds/sync"

latex_code = r"""% Modern Boxed Resume Template
\documentclass[a4paper,11pt]{article}
\usepackage{latexsym}
\usepackage{xcolor}
\usepackage{float}
\usepackage{ragged2e}
\usepackage[empty]{fullpage}
\usepackage{wrapfig}
\usepackage{tabularx}
\usepackage{titlesec}
\usepackage{geometry}
\usepackage{marvosym}
\usepackage{verbatim}
\usepackage{enumitem}
\usepackage[hidelinks]{hyperref}
\usepackage{fancyhdr}
\usepackage{fontawesome5}
\usepackage{multicol}
\usepackage{graphicx}
\usepackage{lmodern}
\usepackage[T1]{fontenc}
\setlength{\multicolsep}{0pt} 
\pagestyle{fancy}
\fancyhf{} % clear all header and footer fields
\fancyfoot{}
\renewcommand{\headrulewidth}{0pt}
\renewcommand{\footrulewidth}{0pt}
\geometry{left=1.4cm, top=0.8cm, right=1.2cm, bottom=1cm}
% Adjust margins
%\addtolength{\oddsidemargin}{-0.5in}
%\addtolength{\evensidemargin}{-0.5in}
%\addtolength{\textwidth}{1in}
\usepackage[most]{tcolorbox}
\tcbset{
	frame code={},
	center title,
	left=0pt,
	right=0pt,
	top=0pt,
	bottom=0pt,
	colback=gray!20,
	colframe=white,
	width=\dimexpr\textwidth\relax,
	enlarge left by=-2mm,
	boxsep=4pt,
	arc=0pt,outer arc=0pt,
}

\urlstyle{same}

\raggedright
\setlength{\tabcolsep}{0in}

% Sections formatting
\titleformat{\section}{
  \vspace{-4pt}\scshape\raggedright\large
}{}{0em}{}[\color{black}\titlerule \vspace{-7pt}]

%-------------------------
% Custom commands
\newcommand{\resumeItem}[2]{\item{\textbf{#1}{\hspace{0.5mm}#2 \vspace{-0.5mm}}}}

\newcommand{\resumePOR}[3]{
\vspace{0.5mm}\item
    \begin{tabular*}{0.97\textwidth}[t]{l@{\extracolsep{\fill}}r}
        \textbf{#1}\hspace{0.3mm}#2 & \textit{\small{#3}} 
    \end{tabular*}
    \vspace{-2mm}
}

\newcommand{\resumeSubheading}[4]{
\vspace{0.5mm}\item
    \begin{tabular*}{0.98\textwidth}[t]{l@{\extracolsep{\fill}}r}
        \textbf{#1} & \textit{\footnotesize{#4}} \\
        \textit{\footnotesize{#3}} &  \footnotesize{#2}\\
    \end{tabular*}
    \vspace{-2.4mm}
}

\newcommand{\resumeProject}[4]{
\vspace{0.5mm}\item
    \begin{tabular*}{0.98\textwidth}[t]{l@{\extracolsep{\fill}}r}
        \textbf{#1} & \textit{\footnotesize{#3}} \\
        \footnotesize{\textit{#2}} & \footnotesize{#4}
    \end{tabular*}
    \vspace{-2.4mm}
}

% Compatibility alias
\newcommand{\resumeProjectHeading}[2]{
\vspace{0.5mm}\item
    \begin{tabular*}{0.98\textwidth}[t]{l@{\extracolsep{\fill}}r}
        \small#1 & \textbf{\small #2}\\
    \end{tabular*}
    \vspace{-2.4mm}
}

\newcommand{\resumeSubItem}[2]{\resumeItem{#1}{#2}\vspace{-4pt}}
% \renewcommand{\labelitemii}{$\circ$}
\renewcommand{\labelitemi}{$\vcenter{\hbox{\tiny$\bullet$}}$}
\newcommand{\resumeSubHeadingListStart}{\begin{itemize}[leftmargin=*,labelsep=0mm]}
\newcommand{\resumeHeadingSkillStart}{\begin{itemize}[leftmargin=*,itemsep=1.7mm, rightmargin=2ex]}
\newcommand{\resumeItemListStart}{\begin{justify}\begin{itemize}[leftmargin=3ex, rightmargin=2ex, noitemsep,labelsep=1.2mm,itemsep=0mm]\small}
\newcommand{\resumeSubHeadingListEnd}{\end{itemize}\vspace{2mm}}
\newcommand{\resumeHeadingSkillEnd}{\end{itemize}\vspace{-2mm}}
\newcommand{\resumeItemListEnd}{\end{itemize}\end{justify}\vspace{-2mm}}
\newcommand{\cvsection}[1]{%
\vspace{2mm}
\begin{tcolorbox}
    \textbf{\large #1}
\end{tcolorbox}
    \vspace{-4mm}
}
\newcolumntype{L}{>{\raggedright\arraybackslash}X}%
\newcolumntype{R}{>{\raggedleft\arraybackslash}X}%
\newcolumntype{C}{>{\centering\arraybackslash}X}%

\begin{document}
\fontfamily{cmr}\selectfont

\begin{tabularx}{\linewidth}{L r} \\
  \textbf{\Large Shabas Rahman} & {\raisebox{0.0\height}{\footnotesize \faPhone}\ +91-8281993581}\\
  {Python Backend Developer (Django, DRF)} & \href{mailto:shabasrahman.77@gmail.com}{\raisebox{0.0\height}{\footnotesize \faEnvelope}\ {shabasrahman.77@gmail.com}} \\
  {City, State} & \href{https://github.com/ShabasRahman7}{\raisebox{0.0\height}{\footnotesize \faGithub}\ {ShabasRahman7}} \\  
  {} & \href{https://www.linkedin.com/in/shabas-rahman}{\raisebox{0.0\height}{\footnotesize \faLinkedin}\ {Shabas Rahman}}
\end{tabularx}

\cvsection{SUMMARY}
\resumeSubHeadingListStart
    \small{Python Backend Developer with hands-on experience building backend systems using Django and Django REST Framework, leveraging Cloud and DevOps skills. Experienced in Django ORM, SQL-based data modeling, RESTful APIs, asynchronous background jobs, unit testing, and real-time updates. Proficient in Linux system administration and version control with Git.}
\resumeSubHeadingListEnd
\vspace{-5.5mm}

\cvsection{EDUCATION}
\resumeSubHeadingListStart
    \resumeSubheading
      {University of Calicut}{First Class}
      {Bachelor of Computer Applications (BCA)}{2022 -- 2025}
\resumeSubHeadingListEnd
\vspace{-5.5mm}

\cvsection{EXPERIENCE}
\resumeSubHeadingListStart
    \resumeSubheading
      {Backend Developer Intern}{Bridgeon Solutions}
      {May 2025 -- Present}{}
      \vspace{-2.0mm}
      \resumeItemListStart
    \item {\small{Completed hands-on backend development training using Python, Django, and Django REST Framework in an industry-style environment, utilizing Linux and Git for version control.}}
    \item {\small{Developed, tested, and debugged REST APIs using Django ORM and DRF viewsets, with a focus on Cloud-based deployment and DevOps practices.}}
    \item {\small{Collaborated with peers using Git, pull requests, and code reviews while working in Linux-based development environments.}}
    \resumeItemListEnd
    \vspace{-3.0mm}
\resumeSubHeadingListEnd
\vspace{-5.5mm}

\cvsection{PROJECTS}
\resumeSubHeadingListStart
    \resumeProject
      {Zenith -- Code Security \& Analysis Platform}
      {Django, DRF, Celery, FastAPI, React, AWS}
      {2025}{}
      \resumeItemListStart
        \item {\small{Built a multi-tenant platform with Django and DRF, enforcing data isolation using ORM-level filtering and role-based access control, and leveraging Cloud services like AWS.}}
        \item {\small{Implemented event-driven code scanning using GitHub OAuth and webhooks to trigger asynchronous scan jobs on repository pushes, utilizing Docker for containerization.}}
        \item {\small{Designed background processing with Celery and Redis, exposing real-time scan progress via Django Channels and WebSockets, and ensuring seamless Cloud-based deployment.}}
    \resumeItemListEnd
    \vspace{-2mm}
    \resumeProject
      {Strive -- Sports E-commerce Platform}
      {Django, DRF, React, PostgreSQL, AWS}
      {2025}{}
      \resumeItemListStart
        \item {\small{Developed a monolithic e-commerce application with Django and DRF, supporting products, orders, carts, and user management, with a focus on Cloud-based deployment and scalability.}}
        \item {\small{Implemented JWT-based authentication for secure, stateless communication with a React and Tailwind CSS frontend, ensuring a seamless user experience.}}
    \resumeItemListEnd
    \vspace{-2mm}
\resumeSubHeadingListEnd
\vspace{-8.5mm}

\cvsection{TECHNICAL SKILLS AND INTERESTS}
 \begin{itemize}[leftmargin=0.05in, label={}]
    \small{\item{
     \textbf{Languages}{: Python, JavaScript} \\
     \textbf{Frameworks}{: Django, Django REST Framework, FastAPI} \\
     \textbf{Databases}{: PostgreSQL, Redis, MySQL, SQL} \\
     \textbf{Cloud}{: AWS, Azure} \\
     \textbf{DevOps}{: Docker, Kubernetes, Git, Azure DevOps} \\
     \textbf{Operating Systems}{: Linux, Ubuntu} \\
     \textbf{Areas of Interest}{: Cloud Computing, DevOps, Backend Development}
    }}
 \end{itemize}
 \vspace{-16pt}
\end{document}
"""

resp = httpx.post(
    COMPILE_URL,
    json={"compiler": "pdflatex", "resources": [{"main": True, "content": latex_code}]},
    timeout=60.0,
)

if resp.status_code in range(200, 300):
    print(f"SUCCESS: PDF size = {len(resp.content)} bytes")
else:
    print(f"FAILED: status {resp.status_code}")
    # Parse the error to find the actual LaTeX error
    try:
        data = resp.json()
        log = data.get("log_files", {}).get("__main_document__.log", "")
        # Find error lines
        lines = log.split("\n")
        for i, line in enumerate(lines):
            if "!" in line or "Error" in line.lower() or "undefined" in line.lower() or "missing" in line.lower():
                # Print context around the error  
                start = max(0, i-2)
                end = min(len(lines), i+5)
                for j in range(start, end):
                    marker = ">>>" if j == i else "   "
                    print(f"{marker} {lines[j]}")
                print("---")
    except Exception as e:
        print(f"Could not parse error: {e}")
        print(resp.text[:2000])
