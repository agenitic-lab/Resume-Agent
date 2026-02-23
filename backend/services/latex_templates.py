"""
Built-in LaTeX resume templates for the optimization agent.

Each template defines a LaTeX preamble/style that the LLM should follow
when generating the optimized resume. The LLM uses the template's design,
layout, fonts, packages, margins, section formatting, and visual style.
"""

TEMPLATES = {
    "clean_modern": {
        "id": "clean_modern",
        "name": "Classic Professional",
        "description": "Clean single-column resume with bold section headers and horizontal rules. The most popular ATS-friendly format, widely used across industries.",
        "author": "Jake Gutierrez",
        "source": "https://github.com/jakeryang/resume",
        "preview_color": "#2D3748",
        "tags": ["ats-friendly", "classic", "clean", "popular"],
        "preamble": r"""% Classic Professional Resume Template
\documentclass[letterpaper,11pt]{article}

\usepackage{latexsym}
\usepackage[empty]{fullpage}
\usepackage{titlesec}
\usepackage{marvosym}
\usepackage[usenames,dvipsnames]{color}
\usepackage{verbatim}
\usepackage{enumitem}
\usepackage[hidelinks]{hyperref}
\usepackage{fancyhdr}
\usepackage[english]{babel}
\usepackage{tabularx}
\usepackage{fontawesome5}
\usepackage{multicol}
\setlength{\multicolsep}{-3.0pt}
\setlength{\columnsep}{-1pt}
\input{glyphtounicode}

\pagestyle{fancy}
\fancyhf{}
\fancyfoot{}
\renewcommand{\headrulewidth}{0pt}
\renewcommand{\footrulewidth}{0pt}

\addtolength{\oddsidemargin}{-0.6in}
\addtolength{\evensidemargin}{-0.5in}
\addtolength{\textwidth}{1.19in}
\addtolength{\topmargin}{-.7in}
\addtolength{\textheight}{1.4in}

\urlstyle{same}
\raggedbottom
\raggedright
\setlength{\tabcolsep}{0in}

\titleformat{\section}{
  \vspace{-4pt}\scshape\raggedright\large\bfseries
}{}{0em}{}[\color{black}\titlerule \vspace{-5pt}]

\pdfgentounicode=1

\newcommand{\resumeItem}[1]{
  \item\small{
    {#1 \vspace{-2pt}}
  }
}

\newcommand{\resumeSubheading}[4]{
  \vspace{-2pt}\item
    \begin{tabular*}{1.0\textwidth}[t]{l@{\extracolsep{\fill}}r}
      \textbf{#1} & \textbf{\small #2} \\
      \textit{\small#3} & \textit{\small #4} \\
    \end{tabular*}\vspace{-7pt}
}

\newcommand{\resumeSubSubheading}[2]{
    \item
    \begin{tabular*}{0.97\textwidth}{l@{\extracolsep{\fill}}r}
      \textit{\small#1} & \textit{\small #2} \\
    \end{tabular*}\vspace{-7pt}
}

\newcommand{\resumeProjectHeading}[2]{
    \item
    \begin{tabular*}{1.001\textwidth}{l@{\extracolsep{\fill}}r}
      \small#1 & \textbf{\small #2}\\
    \end{tabular*}\vspace{-7pt}
}

\newcommand{\resumeSubItem}[1]{\resumeItem{#1}\vspace{-4pt}}

\renewcommand\labelitemi{$\vcenter{\hbox{\tiny$\bullet$}}$}
\renewcommand\labelitemii{$\vcenter{\hbox{\tiny$\bullet$}}$}

\newcommand{\resumeSubHeadingListStart}{\begin{itemize}[leftmargin=0.0in, label={}]}
\newcommand{\resumeSubHeadingListEnd}{\end{itemize}}
\newcommand{\resumeItemListStart}{\begin{itemize}}
\newcommand{\resumeItemListEnd}{\end{itemize}\vspace{-5pt}}
""",
    },
    "jake": {
        "id": "jake",
        "name": "Bold Accent",
        "description": "Colorful resume with larger entry headings, underlined project links, multi-column coursework, and inline certification badges.",
        "author": "Abey George",
        "source": "https://github.com/sb2nov/resume",
        "preview_color": "#0E5484",
        "tags": ["modern", "colorful", "bold", "professional"],
        "preamble": r"""% Bold Accent Resume Template
% Author : Abey George
\documentclass[letterpaper,11pt]{article}

\usepackage{latexsym}
\usepackage[empty]{fullpage}
\usepackage{titlesec}
\usepackage{marvosym}
\usepackage[usenames,dvipsnames]{color}
\usepackage{verbatim}
\usepackage{enumitem}
\usepackage[hidelinks]{hyperref}
\usepackage[english]{babel}
\usepackage{tabularx}
\usepackage{fontawesome5}
\usepackage{multicol}
\usepackage{graphicx}
\setlength{\multicolsep}{-3.0pt}
\setlength{\columnsep}{-1pt}
\input{glyphtounicode}

\RequirePackage{tikz}
\RequirePackage{xcolor}
\usetikzlibrary{svg.path}


\definecolor{cvblue}{HTML}{0E5484}
\definecolor{black}{HTML}{130810}
\definecolor{darkcolor}{HTML}{0F4539}
\definecolor{cvgreen}{HTML}{3BD80D}
\definecolor{taggreen}{HTML}{00E278}
\definecolor{SlateGrey}{HTML}{2E2E2E}
\definecolor{LightGrey}{HTML}{666666}
\colorlet{name}{black}
\colorlet{tagline}{darkcolor}
\colorlet{heading}{darkcolor}
\colorlet{headingrule}{cvblue}
\colorlet{accent}{darkcolor}
\colorlet{emphasis}{SlateGrey}
\colorlet{body}{LightGrey}

% Adjust margins
\addtolength{\oddsidemargin}{-0.6in}
\addtolength{\evensidemargin}{-0.5in}
\addtolength{\textwidth}{1.19in}
\addtolength{\topmargin}{-.7in}
\addtolength{\textheight}{1.4in}

\urlstyle{same}

\raggedbottom
\raggedright
\setlength{\tabcolsep}{0in}

% Sections formatting
\titleformat{\section}{
  \vspace{-4pt}\scshape\raggedright\large\bfseries
}{}{0em}{}[\color{black}\titlerule \vspace{-5pt}]

% Ensure that generate pdf is machine readable/ATS parsable
\pdfgentounicode=1

%-------------------------
% Custom commands
\newcommand{\resumeItem}[1]{
  \item\small{
    {#1 \vspace{-2pt}}
  }
}

\newcommand{\classesList}[4]{
    \item\small{
        {#1 #2 #3 #4 \vspace{-2pt}}
  }
}

\newcommand{\resumeSubheading}[4]{
  \vspace{-2pt}\item
    \begin{tabular*}{1.0\textwidth}[t]{l@{\extracolsep{\fill}}r}
      \textbf{\large#1} & \textbf{\small #2} \\
      \textit{\large#3} & \textit{\small #4} \\
      
    \end{tabular*}\vspace{-7pt}
}

\newcommand{\resumeSubSubheading}[2]{
    \item
    \begin{tabular*}{0.97\textwidth}{l@{\extracolsep{\fill}}r}
      \textit{\small#1} & \textit{\small #2} \\
    \end{tabular*}\vspace{-7pt}
}


\newcommand{\resumeProjectHeading}[2]{
    \item
    \begin{tabular*}{1.001\textwidth}{l@{\extracolsep{\fill}}r}
      \small#1 & \textbf{\small #2}\\
    \end{tabular*}\vspace{-7pt}
}

\newcommand{\resumeSubItem}[1]{\resumeItem{#1}\vspace{-4pt}}

\renewcommand\labelitemi{$\vcenter{\hbox{\tiny$\bullet$}}$}
\renewcommand\labelitemii{$\vcenter{\hbox{\tiny$\bullet$}}$}

\newcommand{\resumeSubHeadingListStart}{\begin{itemize}[leftmargin=0.0in, label={}]}
\newcommand{\resumeSubHeadingListEnd}{\end{itemize}}
\newcommand{\resumeItemListStart}{\begin{itemize}}
\newcommand{\resumeItemListEnd}{\end{itemize}\vspace{-5pt}}


\newcommand\sbullet[1][.5]{\mathbin{\vcenter{\hbox{\scalebox{#1}{$\bullet$}}}}}
""",
    },
    "sb2nov": {
        "id": "sb2nov",
        "name": "Modern Boxed",
        "description": "Distinctive layout with gray-boxed section headers, tabular contact header, compact geometry margins, and different font. Uses footnotesize dates for a dense modern look.",
        "author": "Resume Agent",
        "source": "Built-in",
        "preview_color": "#4A5568",
        "tags": ["modern", "compact", "boxed", "ats-optimized"],
        "preamble": r"""% Modern Boxed Resume Template
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

% Compatibility alias: \resumeProjectHeading{2} maps to \resumeProject with empty args 3,4
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
""",
    },
}


def get_all_templates():
    """Return list of template metadata (without full preamble) for UI display."""
    return [
        {
            "id": t["id"],
            "name": t["name"],
            "description": t["description"],
            "author": t["author"],
            "source": t["source"],
            "preview_color": t["preview_color"],
            "tags": t["tags"],
        }
        for t in TEMPLATES.values()
    ]


def get_template_preamble(template_id: str) -> str | None:
    """Return the LaTeX preamble for a given template ID."""
    template = TEMPLATES.get(template_id)
    if template:
        return template["preamble"]
    return None


def get_template_style_instructions(template_id: str, custom_latex: str = None) -> str:
    """
    Generate LLM instructions describing the template style to follow.
    Returns an instruction string for the modification prompt.
    The LLM should output ONLY the document body — the preamble is prepended
    automatically by the modification node.
    """
    if template_id == "custom" and custom_latex:
        return f"""
TEMPLATE STYLE INSTRUCTIONS:
The user has provided a custom LaTeX template. You MUST follow this template's exact design,
layout, fonts, packages, margins, section formatting, and visual style.

The preamble (all packages/commands) will be added automatically — do NOT include any preamble.
Output ONLY the document body content using the macros/commands defined in this template.

Custom Template Preamble (for reference — DO NOT output this, just use its macros):
---
{custom_latex}
---

IMPORTANT: Only generate the document body content. Use the macros from the preamble above.
"""

    template = TEMPLATES.get(template_id)
    if not template:
        return ""

    example_body = TEMPLATE_EXAMPLE_BODIES.get(template_id, "")

    return f"""
TEMPLATE STYLE INSTRUCTIONS (CRITICAL — FOLLOW EXACTLY):
You MUST produce a resume body that looks IDENTICAL in structure to the "{template['name']}" template.

The preamble will be added automatically. Do NOT output any preamble, \\documentclass,
\\usepackage, \\newcommand, \\begin{{document}}, or \\end{{document}}.
Output ONLY the body content between \\begin{{document}} and \\end{{document}}.

Below is the preamble (for reference only — so you know which macros are available):
=== AVAILABLE MACROS (DO NOT OUTPUT — FOR REFERENCE ONLY) ===
{template['preamble']}
=== END REFERENCE ===

=== EXAMPLE DOCUMENT BODY (FOLLOW THIS STRUCTURE EXACTLY) ===
{example_body}
=== END EXAMPLE ===

STRICT RULES:
1. Do NOT output any preamble lines. The preamble is added automatically.
2. Your output MUST follow the EXACT SAME structure as the example body above:
   - Use the SAME header format (centered vs tabularx, icons, underlines).
   - Use the SAME section command (\\section{{}} or \\cvsection{{}}) as shown in the example.
   - Use ALL CAPS section names if the example uses ALL CAPS.
   - Use the SAME macro calls (\\resumeSubheading, \\resumeItem, \\resumeProject, etc.)
     with the SAME number of arguments as shown in the example.
   - Use the SAME list start/end commands as the example.
   - Preserve the SAME spacing commands (\\vspace) as shown.
3. Do NOT invent your own macros or use generic LaTeX instead of the template macros.
4. Do NOT use \\section{{}} if the example uses \\cvsection{{}}.
5. Do NOT use \\resumeProjectHeading if the example uses \\resumeProject.
6. Only replace the CONTENT (names, dates, descriptions) — keep the STRUCTURE identical.
"""


# Complete example document bodies for each template.
# These show the LLM the EXACT structure, macros, and conventions to follow.
TEMPLATE_EXAMPLE_BODIES = {
    "clean_modern": r"""
\begin{center}
    {\Huge \scshape FirstName LastName} \\ \vspace{1pt}
    \small \raisebox{-0.1\height}\faPhone\ 555-123-4567 ~
    \href{mailto:email@example.com}{\raisebox{-0.2\height}\faEnvelope\  \underline{email@example.com}} \\
    \href{https://linkedin.com/in/yourprofile}{\raisebox{-0.2\height}\faLinkedin\ \underline{linkedin.com/in/yourprofile}}  ~
    \href{https://github.com/yourprofile}{\raisebox{-0.2\height}\faGithub\ \underline{github.com/yourprofile}}
    \vspace{-8pt}
\end{center}

\section{Education}
\resumeSubHeadingListStart
    \resumeSubheading
        {University Name}{Start -- End}
        {Degree Name, GPA: X.X/4.0}{City, State}
\resumeSubHeadingListEnd

\section{Experience}
\resumeSubHeadingListStart
    \resumeSubheading
        {Job Title}{Start -- End}
        {Company Name}{City, State}
    \resumeItemListStart
        \resumeItem{Description of achievement with metrics and keywords}
        \resumeItem{Another achievement description}
    \resumeItemListEnd
\resumeSubHeadingListEnd

\section{Projects}
\resumeSubHeadingListStart
    \resumeProjectHeading
        {\textbf{Project Name} $|$ \emph{Tech Stack}}{Year}
    \resumeItemListStart
        \resumeItem{Project description with impact}
    \resumeItemListEnd
\resumeSubHeadingListEnd

\section{Technical Skills}
\begin{itemize}[leftmargin=0.15in, label={}]
    \small{\item{
        \textbf{Languages}{: Language1, Language2, Language3} \\
        \textbf{Frameworks}{: Framework1, Framework2} \\
        \textbf{Tools}{: Tool1, Tool2, Tool3}
    }}
\end{itemize}
""",
    "jake": r"""
\begin{center}
    {\Huge \scshape FirstName LastName} \\ \vspace{1pt}
    City, State \\ \vspace{1pt}
    \small \href{tel:+1234567890}{ \raisebox{-0.1\height}\faPhone\ \underline{+1-555-123-4567} ~} \href{mailto:email@example.com}{\raisebox{-0.2\height}\faEnvelope\  \underline{email@example.com}} ~ 
    \href{https://linkedin.com/in/yourprofile}{\raisebox{-0.2\height}\faLinkedin\ \underline{yourprofile}}  ~
    \href{https://github.com/yourprofile}{\raisebox{-0.2\height}\faGithub\ \underline{yourprofile}}
    \vspace{-8pt}
\end{center}

\section{EDUCATION}
  \resumeSubHeadingListStart
    \resumeSubheading
      {University Name}{Start -- End}
      {Degree Name - \textbf{GPA} - \textbf{X.X/4.0}}{City, State}
  \resumeSubHeadingListEnd

\section{COURSEWORK / SKILLS}
    \begin{multicols}{4}
        \begin{itemize}[itemsep=-2pt, parsep=5pt]
            \item Skill 1
            \item Skill 2
            \item Skill 3
            \item Skill 4
        \end{itemize}
    \end{multicols}
    \vspace*{2.0\multicolsep}

\section{PROJECTS}
    \vspace{-5pt}
    \resumeSubHeadingListStart
       \resumeProjectHeading
          {\textbf{\large{\underline{Project Name}}} $|$ \large{\underline{Tech Stack}}}{Year}
          \resumeItemListStart
            \resumeItem{\normalsize{Description of project with \textbf{key highlights}.}}
          \resumeItemListEnd 
          \vspace{-13pt}
      \resumeProjectHeading
          {\textbf{\large{\underline{Project Name}}} $|$ \large{\underline{Tech Stack}}}{Year}
          \resumeItemListStart
            \resumeItem{\normalsize{Description of project.}}
          \resumeItemListEnd
    \resumeSubHeadingListEnd
\vspace{-12pt}

\section{EXPERIENCE}
  \resumeSubHeadingListStart
    \resumeSubheading
      {Company Name}{Start -- End} 
      {\underline{Job Title}}{City, State}
      \resumeItemListStart
        \resumeItem{\normalsize{Achievement description with \textbf{metrics}.}}
      \resumeItemListEnd  
  \resumeSubHeadingListEnd
\vspace{-12pt}

\section{TECHNICAL SKILLS}
 \begin{itemize}[leftmargin=0.15in, label={}]
    \small{\item{
     \textbf{\normalsize{Languages:}}{ \normalsize{Lang1, Lang2, Lang3}} \\
     \textbf{\normalsize{Developer Tools:}}{ \normalsize{Tool1, Tool2}} \\
     \textbf{\normalsize{Technologies/Frameworks:}}{\normalsize{ Framework1, Framework2}} \\
    }}
 \end{itemize}
 \vspace{-15pt}

\section{CERTIFICATIONS}
$\sbullet[.75] \hspace{0.1cm}$ {Cert 1} \hspace{1.6cm}
$\sbullet[.75] \hspace{0.1cm}$ {Cert 2} \hspace{1.5cm}
$\sbullet[.75] \hspace{0.2cm}${Cert 3}\\
""",
    "sb2nov": r"""
\fontfamily{cmr}\selectfont

\begin{tabularx}{\linewidth}{L r} \\
  \textbf{\Large FirstName LastName} & {\raisebox{0.0\height}{\footnotesize \faPhone}\ +1-555-123-4567}\\
  {Job Title / Role} & \href{mailto:email@example.com}{\raisebox{0.0\height}{\footnotesize \faEnvelope}\ {email@example.com}} \\
  {City, State} & \href{https://github.com/yourprofile}{\raisebox{0.0\height}{\footnotesize \faGithub}\ {GitHub Profile}} \\  
  {} & \href{https://linkedin.com/in/yourprofile}{\raisebox{0.0\height}{\footnotesize \faLinkedin}\ {LinkedIn Profile}}
\end{tabularx}

\cvsection{Education}
\resumeSubHeadingListStart
    \resumeSubheading
      {University Name}{GPA or Percentage}
      {Degree Name}{Start -- End}
\resumeSubHeadingListEnd
\vspace{-5.5mm}

\cvsection{Experience}
\resumeSubHeadingListStart
    \resumeSubheading
      {Job Title}{City, State}
      {Company Name}{Start -- End}
      \vspace{-2.0mm}
      \resumeItemListStart
    \item {Achievement description with metrics and impact.}
    \item {Another achievement description.}
    \resumeItemListEnd
    \vspace{-3.0mm}
\resumeSubHeadingListEnd
\vspace{-5.5mm}

\cvsection{Projects}
\resumeSubHeadingListStart
    \resumeProject
      {Project Name}
      {Tech stack description}
      {Year}
      {}
      \resumeItemListStart
        \item {Project description with key achievements.}
        \item {Another detail about the project.}
    \resumeItemListEnd
    \vspace{-2mm}
\resumeSubHeadingListEnd
\vspace{-8.5mm}

\cvsection{Technical Skills and Interests}
 \begin{itemize}[leftmargin=0.05in, label={}]
    \small{\item{
     \textbf{Languages}{: Lang1, Lang2, Lang3} \\
     \textbf{Frameworks}{: Framework1, Framework2} \\
     \textbf{Tools}{: Tool1, Tool2, Tool3} \\
     \textbf{Cloud/Databases}{: DB1, DB2, Cloud1} \\
     \textbf{Areas of Interest}{: Area1, Area2}
    }}
 \end{itemize}
 \vspace{-16pt}
""",
}
