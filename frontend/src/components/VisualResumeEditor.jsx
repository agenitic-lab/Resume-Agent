import React, { useState, useCallback, useMemo } from 'react';

// ─── LaTeX structure helpers ────────────────────────────────────────────────

function splitPreambleAndBody(latex) {
    const beginIdx = latex.indexOf('\\begin{document}');
    const endIdx = latex.indexOf('\\end{document}');
    if (beginIdx === -1 || endIdx === -1) return { preamble: '', body: latex, suffix: '' };
    return {
        preamble: latex.substring(0, beginIdx + '\\begin{document}'.length),
        body: latex.substring(beginIdx + '\\begin{document}'.length, endIdx),
        suffix: latex.substring(endIdx),
    };
}

function extractSections(body) {
    const sections = [];
    // Match any section-like command: \section, \section*, \cvsection, \subsection, \ressection, etc.
    const sectionRegex = /\\(?:\w*[Ss]ection\w*)\*?\s*(?:\[[^\]]*\])?\{([^}]*)\}/g;
    const matches = [...body.matchAll(sectionRegex)];

    const headerEnd = matches.length > 0 ? matches[0].index : body.length;
    const headerRaw = body.substring(0, headerEnd);
    if (headerRaw.trim()) {
        sections.push({ type: 'header', raw: headerRaw });
    }

    for (let i = 0; i < matches.length; i++) {
        const start = matches[i].index;
        const end = i + 1 < matches.length ? matches[i + 1].index : body.length;
        const sectionTitle = matches[i][1]
            .replace(/\\textls\[.*?\]\{(.*?)\}/g, '$1')
            .replace(/[{}]/g, '')
            .trim();
        const raw = body.substring(start, end);
        sections.push({ type: 'section', title: sectionTitle, raw });
    }

    // If no sections found at all, treat the entire body as one editable block
    if (sections.length === 0 && body.trim()) {
        sections.push({ type: 'header', raw: body });
    }

    return sections;
}

// ─── Universal text extraction (strips LaTeX, always returns content) ────────

function stripLatex(text) {
    let t = text;
    // Remove comments
    t = t.replace(/%[^\n]*/g, '');
    // Remove common environments
    t = t.replace(/\\begin\{[^}]*\}|\\end\{[^}]*\}/g, '');
    // Remove spacing/layout
    t = t.replace(/\\(?:vspace|hspace|vfill|hfill|medskip|smallskip|bigskip|newpage|clearpage)\b\{?[^}]*\}?/g, '');
    // Unwrap formatting macros (keep inner text)
    const unwrap = [
        'textbf', 'textit', 'emph', 'underline', 'normalsize', 'small',
        'large', 'Large', 'LARGE', 'huge', 'Huge', 'scshape', 'mdseries',
        'bfseries', 'itshape', 'textrm', 'textsf', 'texttt', 'textsc',
    ];
    for (const cmd of unwrap) {
        const re = new RegExp(`\\\\${cmd}\\{([^}]*)\\}`, 'g');
        t = t.replace(re, '$1');
    }
    // href → keep display text
    t = t.replace(/\\href\{[^}]*\}\{([^}]*)\}/g, '$1');
    // fa icons → remove
    t = t.replace(/\\fa[A-Za-z]+\*?\s*/g, '');
    // resume macros → remove command, keep content from braces
    t = t.replace(/\\(?:resumeSubheading|resumeItem|resumeProjectHeading|resumeProject|resumeSubHeadingListStart|resumeSubHeadingListEnd|resumeItemListStart|resumeItemListEnd)\s*/g, '');
    // Remaining commands without braces
    t = t.replace(/\\[a-zA-Z@]+\s*/g, '');
    // Remove stray braces
    t = t.replace(/[{}]/g, '');
    // Clean special chars
    t = t.replace(/[$~|]/g, ' ');
    t = t.replace(/\\\\/g, '\n');
    // Collapse whitespace
    t = t.replace(/[ \t]+/g, ' ');
    t = t.replace(/\n\s*\n+/g, '\n');
    return t.trim();
}

// ─── Structured parsers ─────────────────────────────────────────────────────

function parseHeader(raw) {
    const fields = {};

    // Name: try multiple patterns (common resume templates)
    const namePatterns = [
        /\\(?:Huge|Large|LARGE)\s*(?:\\scshape\s*)?(?:\\mdseries\s*)?(?:\\bfseries\s*)?([^}\\]+)/,
        /\\name\{([^}]+)\}/,
        /\\begin\{center\}[^]*?\\(?:Huge|Large|LARGE|huge)\s*(?:\\textbf\{)?([A-Z][A-Za-z .-]+)/,
        /\\centerline\{\\(?:Huge|Large|huge)\s*(?:\\textbf\{)?([A-Z][A-Za-z .-]+)/,
    ];
    for (const pattern of namePatterns) {
        const m = raw.match(pattern);
        if (m) { fields.name = m[1].replace(/[{}]/g, '').trim(); break; }
    }

    // Phone
    const phonePatterns = [
        /\\faPhone[*]?\s*(?:\\?\s*)([+\d\s().-]+)/,
        /\\phone\{([^}]+)\}/,
        /(?:Phone|Tel|Mobile)[:\s]*([+\d\s().-]{7,})/i,
    ];
    for (const pattern of phonePatterns) {
        const m = raw.match(pattern);
        if (m) { fields.phone = m[1].trim(); break; }
    }

    // Email
    const emailPatterns = [
        /\\faEnvelope[*]?\s*(?:\\?\s*)(?:\\underline\{)?([^}\\,\s]+@[^}\\,\s]+)/,
        /\\href\{mailto:([^}]*)\}/,
        /\\email\{([^}]+)\}/,
        /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/,
    ];
    for (const pattern of emailPatterns) {
        const m = raw.match(pattern);
        if (m) { fields.email = m[1].trim(); break; }
    }

    // Location
    const locationPatterns = [
        /\\small\s+([A-Z][^\\]+?)\s*\\\\/,
        /\\address\{([^}]+)\}/,
        /\{([A-Za-z][A-Za-z ,]+(?:,\s*[A-Z]{2,}))\}/,
    ];
    for (const pattern of locationPatterns) {
        const m = raw.match(pattern);
        if (m) { fields.location = m[1].trim(); break; }
    }

    const linkedinMatch = raw.match(/\\href\{(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/([^}]*)\}/);
    if (linkedinMatch) fields.linkedin = linkedinMatch[1].trim();

    const githubMatch = raw.match(/\\href\{(?:https?:\/\/)?(?:www\.)?github\.com\/([^}]*)\}/);
    if (githubMatch) fields.github = githubMatch[1].trim();

    return fields;
}

function applyHeaderChanges(raw, field, value) {
    let updated = raw;
    switch (field) {
        case 'name':
            updated = updated.replace(
                /(\\(?:Huge|Large|LARGE)\s*(?:\\scshape\s*)?(?:\\mdseries\s*)?(?:\\bfseries\s*)?)[^}\\]+/,
                `$1${value}`
            );
            break;
        case 'phone':
            updated = updated.replace(/(\\faPhone[*]?\s*(?:\\?\s*))([+\d\s().-]+)/, `$1${value}`);
            updated = updated.replace(/(\\href\{tel:)[^}]*/, `$1${value}`);
            break;
        case 'email':
            updated = updated.replace(
                /(\\faEnvelope[*]?\s*(?:\\?\s*)(?:\\underline\{)?)[^}\\,\s]+@[^}\\,\s]+/,
                `$1${value}`
            );
            updated = updated.replace(/(\\href\{mailto:)[^}]*/, `$1${value}`);
            break;
        case 'location': {
            const locRegex = /\\small\s+([A-Z][^\\]+?)\s*\\\\/;
            if (locRegex.test(updated)) {
                updated = updated.replace(locRegex, `\\small ${value} \\\\`);
            }
            break;
        }
    }
    return updated;
}

function parseBullets(raw) {
    const bullets = [];
    // \resumeItem{...} with optional \normalsize{}
    const itemRegex = /\\resumeItem\{((?:[^{}]|\{(?:[^{}]|\{[^{}]*\})*\})*)\}/g;
    let match;
    while ((match = itemRegex.exec(raw)) !== null) {
        let text = match[1].trim();
        text = text.replace(/^\\normalsize\{([\s\S]*)\}$/, '$1').trim();
        if (text) bullets.push(text);
    }
    if (bullets.length === 0) {
        // sb2nov and other \item patterns
        const altRegex = /\\item\s*\{?((?:[^{}]|\{(?:[^{}]|\{[^{}]*\})*\})+)\}?\s*/g;
        while ((match = altRegex.exec(raw)) !== null) {
            const text = match[1].trim();
            if (text && !text.startsWith('\\textbf') && !text.startsWith('\\resumeSub') && text.length > 3) {
                bullets.push(text);
            }
        }
    }
    return bullets;
}

function parseExperience(raw) {
    const entries = [];
    const subheadingRegex = /\\resumeSubheading\s*\{((?:[^{}]|\{[^{}]*\})*)\}\s*\{((?:[^{}]|\{[^{}]*\})*)\}\s*\{((?:[^{}]|\{[^{}]*\})*)\}\s*\{((?:[^{}]|\{[^{}]*\})*)\}/g;
    let match;
    while ((match = subheadingRegex.exec(raw)) !== null) {
        const afterMatch = raw.substring(match.index + match[0].length);
        const nextSubheading = afterMatch.search(/\\resumeSubheading/);
        const block = nextSubheading > -1 ? afterMatch.substring(0, nextSubheading) : afterMatch;
        const bullets = parseBullets(block);

        const arg1 = match[1].replace(/\\underline\{(.*?)\}/g, '$1').trim();
        const arg2 = match[2].trim();
        const arg3 = match[3].replace(/\\underline\{(.*?)\}/g, '$1').trim();
        const arg4 = match[4].trim();

        const datePattern = /\d{4}|present|current/i;
        let title, company, dates, extra;
        if (datePattern.test(arg2)) {
            title = arg1; dates = arg2; company = arg3; extra = arg4;
        } else if (datePattern.test(arg4)) {
            title = arg3 || arg1; company = arg1; dates = arg4; extra = arg2;
        } else {
            title = arg1; company = arg3; dates = arg2; extra = arg4;
        }
        entries.push({ title, company, dates, extra, bullets });
    }
    return entries;
}

function parseProjects(raw) {
    const entries = [];
    const projRegex = /\\resumeProjectHeading\s*\{((?:[^{}]|\{(?:[^{}]|\{[^{}]*\})*\})*)\}\s*\{((?:[^{}]|\{[^{}]*\})*)\}/g;
    let match;
    while ((match = projRegex.exec(raw)) !== null) {
        let titleBlock = match[1];
        const titleMatch = titleBlock.match(/\\textbf\{(?:\\large\{)?(?:\\underline\{)?([\s\S]*?)(?:\}\}|\})\}?/);
        const toolsMatch = titleBlock.match(/\\emph\{([\s\S]*?)\}/);
        const title = titleMatch ? titleMatch[1].trim() : stripLatex(titleBlock).trim();
        const tools = toolsMatch ? toolsMatch[1].trim() : '';

        const afterMatch = raw.substring(match.index + match[0].length);
        const nextProj = afterMatch.search(/\\resumeProjectHeading|\\resumeSubHeadingListEnd/);
        const block = nextProj > -1 ? afterMatch.substring(0, nextProj) : afterMatch;
        const bullets = parseBullets(block);
        entries.push({ title, tools, bullets });
    }
    if (entries.length === 0) {
        const altRegex = /\\resumeProject\s*\{((?:[^{}]|\{[^{}]*\})*)\}\s*\{((?:[^{}]|\{[^{}]*\})*)\}/g;
        while ((match = altRegex.exec(raw)) !== null) {
            const title = match[1].trim();
            const tools = match[2].trim();
            const afterMatch = raw.substring(match.index + match[0].length);
            const nextProj = afterMatch.search(/\\resumeProject|\\resumeSubHeadingListEnd/);
            const block = nextProj > -1 ? afterMatch.substring(0, nextProj) : afterMatch;
            const bullets = parseBullets(block);
            entries.push({ title, tools, bullets });
        }
    }
    return entries;
}

function parseEducation(raw) {
    const entries = [];
    const subheadingRegex = /\\resumeSubheading\s*\{((?:[^{}]|\{[^{}]*\})*)\}\s*\{((?:[^{}]|\{[^{}]*\})*)\}\s*\{((?:[^{}]|\{[^{}]*\})*)\}\s*\{((?:[^{}]|\{[^{}]*\})*)\}/g;
    let match;
    while ((match = subheadingRegex.exec(raw)) !== null) {
        const school = match[1].trim();
        const dates = (match[2] || match[4]).trim();
        const degree = match[3].trim();
        entries.push({ school, degree, dates });
    }
    return entries;
}

function parseSkills(raw) {
    // Try multiple patterns for skill extraction
    const patterns = [
        /\\textbf\{(?:\\normalsize\{)?(?:Technical\s*)?Skills:?\}?\}?\{?:?\s*([\s\S]*?)(?:\}?\s*\\\\|\}?\s*$)/,
        /\\item\{[\s\S]*?\\textbf\{[^}]*\}\{?:?\s*([\s\S]*?)\}/,
        /Skills[:\s]*([\s\S]*?)(?:\\\\|$)/i,
    ];
    for (const pattern of patterns) {
        const match = raw.match(pattern);
        if (match) {
            return match[1].replace(/\\normalsize\{|\}/g, '').trim();
        }
    }
    return '';
}

function parseSummary(raw) {
    const match = raw.match(/\\section\{[^}]*\}[\s\S]*?\\small\{([\s\S]*?)\}/);
    if (match) return match[1].trim();
    const fallback = raw.match(/\\section\{[^}]*\}\s*([\s\S]*?)(?:\\vspace|$)/);
    if (fallback) return fallback[1].replace(/\\small\{?|\}$/g, '').trim();
    return '';
}

// ─── Reconstruct helpers ────────────────────────────────────────────────────

function replaceBullet(sectionRaw, bulletIndex, newValue) {
    let count = 0;
    let updated = sectionRaw.replace(
        /\\resumeItem\{((?:[^{}]|\{(?:[^{}]|\{[^{}]*\})*\})*)\}/g,
        (fullMatch) => {
            if (count === bulletIndex) {
                count++;
                if (fullMatch.includes('\\normalsize')) {
                    return `\\resumeItem{\\normalsize{${newValue}}}`;
                }
                return `\\resumeItem{${newValue}}`;
            }
            count++;
            return fullMatch;
        }
    );
    if (count === 0) {
        count = 0;
        updated = sectionRaw.replace(
            /\\item\s*\{((?:[^{}]|\{(?:[^{}]|\{[^{}]*\})*\})*)\}/g,
            (fullMatch) => {
                if (count === bulletIndex) {
                    count++;
                    return `\\item {${newValue}}`;
                }
                count++;
                return fullMatch;
            }
        );
    }
    return updated;
}

function replaceSubheadingField(sectionRaw, entryIndex, field, newValue) {
    let count = 0;
    return sectionRaw.replace(
        /\\resumeSubheading\s*\{((?:[^{}]|\{[^{}]*\})*)\}\s*\{((?:[^{}]|\{[^{}]*\})*)\}\s*\{((?:[^{}]|\{[^{}]*\})*)\}\s*\{((?:[^{}]|\{[^{}]*\})*)\}/g,
        (fullMatch, a1, a2, a3, a4) => {
            if (count === entryIndex) {
                count++;
                const args = [a1, a2, a3, a4];
                const datePattern = /\d{4}|present|current/i;
                const isDateInArg2 = datePattern.test(a2);

                switch (field) {
                    case 'title':
                        if (isDateInArg2) args[0] = a1.includes('\\underline') ? `\\underline{${newValue}}` : newValue;
                        else args[2] = a3.includes('\\underline') ? `\\underline{${newValue}}` : newValue;
                        break;
                    case 'company':
                        if (isDateInArg2) args[2] = newValue;
                        else args[0] = newValue;
                        break;
                    case 'dates':
                        if (isDateInArg2) args[1] = newValue;
                        else args[3] = newValue;
                        break;
                    case 'school': args[0] = newValue; break;
                    case 'degree': args[2] = newValue; break;
                }
                return `\\resumeSubheading\n        {${args[0]}}{${args[1]}}\n        {${args[2]}}{${args[3]}}`;
            }
            count++;
            return fullMatch;
        }
    );
}

function replaceSkills(sectionRaw, newValue) {
    let updated = sectionRaw.replace(
        /(\\textbf\{(?:\\normalsize\{)?(?:Technical\s*)?Skills:?\}?\}?\{?:?\s*)([\s\S]*?)((?:\}?\s*\\\\|\}?\s*$))/,
        (_, prefix, _old, suffix) => {
            if (prefix.includes('\\normalsize')) return `${prefix}\\normalsize{${newValue}}${suffix}`;
            return `${prefix}${newValue}${suffix}`;
        }
    );
    if (updated === sectionRaw) {
        updated = sectionRaw.replace(
            /(\\textbf\{[^}]*\}\{:\s*)([\s\S]*?)(\})/,
            `$1${newValue}$3`
        );
    }
    return updated;
}

function applySummaryChange(raw, value) {
    let updated = raw.replace(
        /(\\section\{[^}]*\}[\s\S]*?\\small\{)([\s\S]*?)(\})/,
        `$1${value}$3`
    );
    if (updated === raw) {
        updated = raw.replace(
            /(\\section\{[^}]*\}\s*)([\s\S]*?)(\\vspace)/,
            `$1${value}\n$3`
        );
    }
    return updated;
}

function identifySectionType(title) {
    const t = title.toUpperCase().replace(/\\TEXTLS.*?\{(.*?)\}/gi, '$1');
    if (/SUMMAR|OBJECTIVE|PROFILE/i.test(t)) return 'summary';
    if (/EDUCAT/i.test(t)) return 'education';
    if (/EXPERI|EMPLOY|WORK\s*HIST/i.test(t)) return 'experience';
    if (/PROJECT/i.test(t)) return 'projects';
    if (/SKILL|TECH|COMPETENC/i.test(t)) return 'skills';
    if (/CERTIF|AWARD|HONOR|ACHIEV/i.test(t)) return 'certifications';
    return 'custom';
}

// ─── UI Components ──────────────────────────────────────────────────────────

const SECTION_ICONS = {
    header: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
    ),
    summary: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
    ),
    experience: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
    ),
    education: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5zm0 7l-9-5 9-5 9 5-9 5z" />
        </svg>
    ),
    projects: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
        </svg>
    ),
    skills: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
    ),
    certifications: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
        </svg>
    ),
    custom: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
        </svg>
    ),
};

function SectionCard({ title, type, children, defaultOpen = true }) {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <div className="border border-gray-100 rounded-2xl overflow-hidden bg-white shadow-sm">
            <button
                onClick={() => setOpen(!open)}
                className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-gray-50/80 transition-colors"
            >
                <div className="flex items-center gap-2.5">
                    <span className="text-brand-primary">{SECTION_ICONS[type] || SECTION_ICONS.custom}</span>
                    <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">{title}</span>
                </div>
                <svg
                    className={`w-3.5 h-3.5 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                </svg>
            </button>
            {open && <div className="px-5 pb-5 space-y-3">{children}</div>}
        </div>
    );
}

function FieldInput({ label, value, onChange, multiline = false, placeholder, rows = 3 }) {
    const baseCls = "w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary/40 outline-none transition-all placeholder:text-gray-400";
    return (
        <div className="space-y-1">
            {label && <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{label}</label>}
            {multiline ? (
                <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
                    rows={rows} className={`${baseCls} resize-none`} />
            ) : (
                <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className={baseCls} />
            )}
        </div>
    );
}

function FallbackContent({ raw, sectionIndex, updateSection }) {
    const [showSource, setShowSource] = useState(false);
    const textContent = useMemo(() => stripLatex(raw), [raw]);

    // If stripped content is empty, always show raw LaTeX source
    const effectiveShowSource = showSource || !textContent;

    return (
        <div className="space-y-2">
            {textContent && (
                <button
                    onClick={() => setShowSource(!showSource)}
                    className="text-[9px] font-bold text-gray-400 uppercase tracking-widest hover:text-brand-primary transition-colors"
                >
                    {showSource ? 'Visual View' : 'Edit Source'}
                </button>
            )}
            {effectiveShowSource ? (
                <FieldInput
                    label="LaTeX Source"
                    value={raw}
                    multiline
                    rows={Math.min(12, Math.max(4, raw.split('\n').length))}
                    placeholder="LaTeX source code"
                    onChange={v => updateSection(sectionIndex, v)}
                />
            ) : (
                <FieldInput
                    label="Content"
                    value={textContent}
                    multiline
                    rows={4}
                    placeholder="Section content"
                    onChange={v => {
                        const oldText = textContent;
                        const lines = oldText.split('\n');
                        const newLines = v.split('\n');
                        let updated = raw;
                        for (let i = 0; i < Math.min(lines.length, newLines.length); i++) {
                            if (lines[i] !== newLines[i] && lines[i].trim()) {
                                updated = updated.replace(lines[i].trim(), newLines[i].trim());
                            }
                        }
                        updateSection(sectionIndex, updated);
                    }}
                />
            )}
        </div>
    );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function VisualResumeEditor({ latexCode, onChange, onRecompile, isCompiling }) {
    const [viewMode, setViewMode] = useState('visual'); // 'visual' | 'source'
    const { preamble, body, suffix } = useMemo(() => splitPreambleAndBody(latexCode), [latexCode]);
    const sections = useMemo(() => extractSections(body), [body]);

    const updateSection = useCallback((sectionIndex, newRaw) => {
        const updatedSections = sections.map((s, i) => i === sectionIndex ? { ...s, raw: newRaw } : s);
        const newBody = updatedSections.map(s => s.raw).join('');
        onChange(preamble + newBody + suffix);
    }, [sections, preamble, suffix, onChange]);

    const handleCopy = () => {
        navigator.clipboard.writeText(latexCode);
    };

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between px-1 mb-3 shrink-0">
                <div className="flex items-center gap-2">
                    {/* Mode toggle */}
                    <div className="flex bg-gray-100 rounded-lg p-0.5">
                        <button
                            onClick={() => setViewMode('visual')}
                            className={`px-2.5 py-1 rounded-md text-[9px] font-bold uppercase tracking-widest transition-all ${
                                viewMode === 'visual'
                                    ? 'bg-white text-brand-primary shadow-sm'
                                    : 'text-gray-400 hover:text-gray-600'
                            }`}
                        >
                            Visual
                        </button>
                        <button
                            onClick={() => setViewMode('source')}
                            className={`px-2.5 py-1 rounded-md text-[9px] font-bold uppercase tracking-widest transition-all ${
                                viewMode === 'source'
                                    ? 'bg-white text-brand-primary shadow-sm'
                                    : 'text-gray-400 hover:text-gray-600'
                            }`}
                        >
                            Source
                        </button>
                    </div>
                </div>
                <button
                    onClick={handleCopy}
                    className="text-brand-primary hover:text-brand-hover text-[9px] font-bold uppercase tracking-widest flex items-center gap-1.5 transition-colors border border-brand-primary/20 px-2.5 py-1 rounded-lg bg-brand-primary/5 hover:bg-brand-primary/10"
                >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Copy LaTeX
                </button>
            </div>

            {/* Source mode — full LaTeX editor (Overleaf-style fallback) */}
            {viewMode === 'source' ? (
                <div className="flex-1 flex flex-col min-h-0">
                    <textarea
                        value={latexCode}
                        onChange={e => onChange(e.target.value)}
                        className="flex-1 w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 font-mono leading-relaxed focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary/40 outline-none transition-all resize-none min-h-0"
                        spellCheck={false}
                    />
                </div>
            ) : (
                /* Visual mode — structured editor */
                <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 min-h-0">
                    {sections.map((section, idx) => {
                    if (section.type === 'header') {
                        const fields = parseHeader(section.raw);
                        const hasFields = Object.keys(fields).length > 0;
                        return (
                            <SectionCard key={idx} title="Contact Info" type="header">
                                {hasFields ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {fields.name !== undefined && (
                                            <FieldInput label="Full Name" value={fields.name}
                                                onChange={v => updateSection(idx, applyHeaderChanges(section.raw, 'name', v))} />
                                        )}
                                        {fields.phone !== undefined && (
                                            <FieldInput label="Phone" value={fields.phone}
                                                onChange={v => updateSection(idx, applyHeaderChanges(section.raw, 'phone', v))} />
                                        )}
                                        {fields.email !== undefined && (
                                            <FieldInput label="Email" value={fields.email}
                                                onChange={v => updateSection(idx, applyHeaderChanges(section.raw, 'email', v))} />
                                        )}
                                        {fields.location !== undefined && (
                                            <FieldInput label="Location" value={fields.location}
                                                onChange={v => updateSection(idx, applyHeaderChanges(section.raw, 'location', v))} />
                                        )}
                                    </div>
                                ) : (
                                    <FallbackContent raw={section.raw} sectionIndex={idx} updateSection={updateSection} />
                                )}
                            </SectionCard>
                        );
                    }

                    const sType = identifySectionType(section.title);

                    if (sType === 'summary') {
                        const summaryText = parseSummary(section.raw);
                        return (
                            <SectionCard key={idx} title={section.title || "Summary"} type="summary">
                                {summaryText ? (
                                    <FieldInput label="Professional Summary" value={summaryText} multiline rows={4}
                                        onChange={v => updateSection(idx, applySummaryChange(section.raw, v))} />
                                ) : (
                                    <FallbackContent raw={section.raw} sectionIndex={idx} updateSection={updateSection} />
                                )}
                            </SectionCard>
                        );
                    }

                    if (sType === 'experience') {
                        const entries = parseExperience(section.raw);
                        return (
                            <SectionCard key={idx} title={section.title || "Experience"} type="experience">
                                {entries.length > 0 ? entries.map((entry, ei) => (
                                    <div key={ei} className="border border-gray-100 rounded-xl p-3.5 space-y-2.5 bg-gray-50/50">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                            <FieldInput label="Job Title" value={entry.title}
                                                onChange={v => updateSection(idx, replaceSubheadingField(section.raw, ei, 'title', v))} />
                                            <FieldInput label="Company" value={entry.company}
                                                onChange={v => updateSection(idx, replaceSubheadingField(section.raw, ei, 'company', v))} />
                                        </div>
                                        <FieldInput label="Dates" value={entry.dates}
                                            onChange={v => updateSection(idx, replaceSubheadingField(section.raw, ei, 'dates', v))} />
                                        {entry.bullets.length > 0 && (
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Bullet Points</label>
                                                {entry.bullets.map((b, bi) => (
                                                    <textarea key={bi} value={b}
                                                        onChange={e => {
                                                            const globalBi = bi + entries.slice(0, ei).reduce((sum, e2) => sum + e2.bullets.length, 0);
                                                            updateSection(idx, replaceBullet(section.raw, globalBi, e.target.value));
                                                        }}
                                                        rows={2}
                                                        className="w-full px-3.5 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-800 focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary/40 outline-none transition-all resize-none"
                                                    />
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )) : (
                                    <FallbackContent raw={section.raw} sectionIndex={idx} updateSection={updateSection} />
                                )}
                            </SectionCard>
                        );
                    }

                    if (sType === 'education') {
                        const entries = parseEducation(section.raw);
                        return (
                            <SectionCard key={idx} title={section.title || "Education"} type="education">
                                {entries.length > 0 ? entries.map((entry, ei) => (
                                    <div key={ei} className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                                        <FieldInput label="School" value={entry.school}
                                            onChange={v => updateSection(idx, replaceSubheadingField(section.raw, ei, 'school', v))} />
                                        <FieldInput label="Degree" value={entry.degree}
                                            onChange={v => updateSection(idx, replaceSubheadingField(section.raw, ei, 'degree', v))} />
                                        <FieldInput label="Dates" value={entry.dates}
                                            onChange={v => updateSection(idx, replaceSubheadingField(section.raw, ei, 'dates', v))} />
                                    </div>
                                )) : (
                                    <FallbackContent raw={section.raw} sectionIndex={idx} updateSection={updateSection} />
                                )}
                            </SectionCard>
                        );
                    }

                    if (sType === 'projects') {
                        const entries = parseProjects(section.raw);
                        return (
                            <SectionCard key={idx} title={section.title || "Projects"} type="projects">
                                {entries.length > 0 ? entries.map((entry, pi) => (
                                    <div key={pi} className="border border-gray-100 rounded-xl p-3.5 space-y-2.5 bg-gray-50/50">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                            <FieldInput label="Project Name" value={entry.title}
                                                onChange={v => {
                                                    let updated = section.raw;
                                                    let count = 0;
                                                    updated = updated.replace(
                                                        /\\textbf\{(?:\\large\{)?(?:\\underline\{)?([\s\S]*?)(?:\}\}|\})\}?/g,
                                                        (m, old) => {
                                                            if (count === pi) { count++; return m.replace(old, v); }
                                                            count++;
                                                            return m;
                                                        }
                                                    );
                                                    updateSection(idx, updated);
                                                }} />
                                            <FieldInput label="Technologies" value={entry.tools}
                                                onChange={v => {
                                                    let updated = section.raw;
                                                    let count = 0;
                                                    updated = updated.replace(
                                                        /\\emph\{([\s\S]*?)\}/g,
                                                        (m) => {
                                                            if (count === pi) { count++; return `\\emph{${v}}`; }
                                                            count++;
                                                            return m;
                                                        }
                                                    );
                                                    updateSection(idx, updated);
                                                }} />
                                        </div>
                                        {entry.bullets.length > 0 && (
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Bullet Points</label>
                                                {entry.bullets.map((b, bi) => (
                                                    <textarea key={bi} value={b}
                                                        onChange={e => {
                                                            const globalBi = bi + entries.slice(0, pi).reduce((sum, e2) => sum + e2.bullets.length, 0);
                                                            updateSection(idx, replaceBullet(section.raw, globalBi, e.target.value));
                                                        }}
                                                        rows={2}
                                                        className="w-full px-3.5 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-800 focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary/40 outline-none transition-all resize-none"
                                                    />
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )) : (
                                    <FallbackContent raw={section.raw} sectionIndex={idx} updateSection={updateSection} />
                                )}
                            </SectionCard>
                        );
                    }

                    if (sType === 'skills') {
                        const skillsText = parseSkills(section.raw);
                        return (
                            <SectionCard key={idx} title={section.title || "Skills"} type="skills">
                                {skillsText ? (
                                    <FieldInput label="Skills (comma-separated)" value={skillsText}
                                        onChange={v => updateSection(idx, replaceSkills(section.raw, v))} />
                                ) : (
                                    <FallbackContent raw={section.raw} sectionIndex={idx} updateSection={updateSection} />
                                )}
                            </SectionCard>
                        );
                    }

                    // Custom / certifications / awards  — always show content via fallback
                    return (
                        <SectionCard key={idx} title={section.title} type={sType} defaultOpen={false}>
                            <FallbackContent raw={section.raw} sectionIndex={idx} updateSection={updateSection} />
                        </SectionCard>
                    );
                })}
                </div>
            )}

            {/* Sticky recompile button */}
            <div className="pt-3 border-t border-gray-100 shrink-0 mt-2">
                <button
                    onClick={onRecompile}
                    disabled={isCompiling}
                    className={`w-full py-3 rounded-xl text-sm font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${isCompiling
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-brand-primary text-white hover:bg-brand-hover shadow-lg shadow-brand-primary/10 active:scale-[0.98]'
                        }`}
                >
                    {isCompiling ? (
                        <>
                            <div className="w-4 h-4 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
                            Updating Preview...
                        </>
                    ) : (
                        <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            Update Preview
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
