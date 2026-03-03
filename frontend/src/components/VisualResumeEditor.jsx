import React, { useState, useCallback, useMemo } from 'react';

// Parses LaTeX content into structured sections that users can edit visually.
// Handles all three template variants (clean_modern, jake, sb2nov) since they
// share the same \section{} / \resumeSubheading / \resumeItem patterns.

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
    // split on \section or \cvsection
    const sectionRegex = /\\(?:section|cvsection)\{([^}]*)\}/g;
    const matches = [...body.matchAll(sectionRegex)];

    // everything before the first section is the header block
    const headerEnd = matches.length > 0 ? matches[0].index : body.length;
    sections.push({ type: 'header', raw: body.substring(0, headerEnd) });

    for (let i = 0; i < matches.length; i++) {
        const start = matches[i].index;
        const end = i + 1 < matches.length ? matches[i + 1].index : body.length;
        const sectionTitle = matches[i][1].replace(/\\textls\[.*?\]\{(.*?)\}/g, '$1').replace(/[{}]/g, '').trim();
        const raw = body.substring(start, end);
        sections.push({ type: 'section', title: sectionTitle, raw });
    }
    return sections;
}

// --- Header parsing ---
function parseHeader(raw) {
    const fields = {};
    // name: {\Huge \scshape NAME} or {\Large NAME} or \textbf{\Large NAME}
    const nameMatch = raw.match(/\\(?:Huge|Large)\s*(?:\\scshape\s*)?([^}\\]+)/);
    if (nameMatch) fields.name = nameMatch[1].trim();

    const phoneMatch = raw.match(/\\faPhone[*]?\s*(?:\\?\s*)([+\d\s().-]+)/);
    if (phoneMatch) fields.phone = phoneMatch[1].trim();

    const emailMatch = raw.match(/\\faEnvelope[*]?\s*(?:\\?\s*)(?:\\underline\{)?([^}\\]+)/);
    if (emailMatch) fields.email = emailMatch[1].trim();

    const locationMatch = raw.match(/\\small\s+([A-Z][^\\]+?)\s*\\\\/);
    if (!locationMatch) {
        const locAlt = raw.match(/\{([A-Za-z][A-Za-z ,]+(?:,\s*[A-Z]{2,}))\}/);
        if (locAlt) fields.location = locAlt[1].trim();
    } else {
        fields.location = locationMatch[1].trim();
    }

    return fields;
}

function applyHeaderChanges(raw, field, value) {
    let updated = raw;
    switch (field) {
        case 'name': {
            updated = updated.replace(
                /(\\(?:Huge|Large)\s*(?:\\scshape\s*)?)[^}\\]+/,
                `$1${value}`
            );
            break;
        }
        case 'phone': {
            updated = updated.replace(
                /(\\faPhone[*]?\s*(?:\\?\s*))([+\d\s().-]+)/,
                `$1${value}`
            );
            // also fix the tel: href
            updated = updated.replace(
                /(\\href\{tel:)[^}]*/,
                `$1${value}`
            );
            break;
        }
        case 'email': {
            updated = updated.replace(
                /(\\faEnvelope[*]?\s*(?:\\?\s*)(?:\\underline\{)?)[^}\\]+/,
                `$1${value}`
            );
            updated = updated.replace(
                /(\\href\{mailto:)[^}]*/,
                `$1${value}`
            );
            break;
        }
    }
    return updated;
}

// --- Summary parsing ---
function parseSummary(raw) {
    // matches the text content within the summary section
    const match = raw.match(/\\section\{[^}]*\}[\s\S]*?\\small\{([\s\S]*?)\}/);
    if (match) return match[1].trim();
    // fallback: text between section header and vspace
    const fallback = raw.match(/\\section\{[^}]*\}\s*([\s\S]*?)(?:\\vspace|$)/);
    if (fallback) return fallback[1].replace(/\\small\{?|\}$/g, '').trim();
    return '';
}

function applySummaryChange(raw, value) {
    // replace the summary text content
    let updated = raw.replace(
        /(\\section\{[^}]*\}[\s\S]*?\\small\{)([\s\S]*?)(\})/,
        `$1${value}$3`
    );
    if (updated === raw) {
        // fallback for templates without \small{}
        updated = raw.replace(
            /(\\section\{[^}]*\}\s*)([\s\S]*?)(\\vspace)/,
            `$1${value}\n$3`
        );
    }
    return updated;
}

// --- Bullet points parsing ---
function parseBullets(raw) {
    const bullets = [];
    // \resumeItem{...} or \resumeItem{\normalsize{...}}
    const itemRegex = /\\resumeItem\{(?:\\normalsize\{)?([\s\S]*?)(?:\}\}|\})\s*(?=\\resumeItem|\\resumeItemListEnd|$)/g;
    let match;
    while ((match = itemRegex.exec(raw)) !== null) {
        bullets.push(match[1].trim());
    }
    if (bullets.length === 0) {
        // sb2nov uses \item {...}
        const altRegex = /\\item\s*\{([\s\S]*?)\}\s*(?=\\item|\\resumeItemListEnd|$)/g;
        while ((match = altRegex.exec(raw)) !== null) {
            const text = match[1].trim();
            if (text && !text.startsWith('\\textbf') && !text.startsWith('\\textit')) {
                bullets.push(text);
            }
        }
    }
    return bullets;
}

// --- Experience parsing ---
function parseExperience(raw) {
    const entries = [];
    const subheadingRegex = /\\resumeSubheading\s*\{([^}]*)\}\{([^}]*)\}\s*\{([^}]*)\}\{([^}]*)\}/g;
    let match;
    while ((match = subheadingRegex.exec(raw)) !== null) {
        const afterMatch = raw.substring(match.index + match[0].length);
        const nextSubheading = afterMatch.search(/\\resumeSubheading/);
        const block = nextSubheading > -1 ? afterMatch.substring(0, nextSubheading) : afterMatch;
        const bullets = parseBullets(block);

        // different templates put title/company in different arg positions
        const arg1 = match[1].replace(/\\underline\{(.*?)\}/g, '$1').trim();
        const arg2 = match[2].trim();
        const arg3 = match[3].replace(/\\underline\{(.*?)\}/g, '$1').trim();

        // if arg2 has a date pattern, arg1 is probably the title/company
        const datePattern = /\d{4}|present/i;
        let title, company, dates;
        if (datePattern.test(arg2)) {
            title = arg1;
            dates = arg2;
            company = arg3;
        } else {
            title = arg3 || arg1;
            company = arg1;
            dates = arg2;
        }

        entries.push({ title, company, dates, bullets });
    }
    return entries;
}

// --- Projects parsing ---
function parseProjects(raw) {
    const entries = [];
    const projRegex = /\\resumeProjectHeading\s*\{([^}]*(?:\{[^}]*\}[^}]*)*)\}\{[^}]*\}/g;
    let match;
    while ((match = projRegex.exec(raw)) !== null) {
        let titleBlock = match[1];
        const titleMatch = titleBlock.match(/\\textbf\{(?:\\large\{)?(?:\\underline\{)?([\s\S]*?)(?:\}\}|\})\}?/);
        const toolsMatch = titleBlock.match(/\\emph\{([\s\S]*?)\}|\\large\{\\underline\{([\s\S]*?)\}\}/);
        const title = titleMatch ? titleMatch[1].trim() : titleBlock.trim();
        const tools = toolsMatch ? (toolsMatch[1] || toolsMatch[2] || '').trim() : '';

        const afterMatch = raw.substring(match.index + match[0].length);
        const nextProj = afterMatch.search(/\\resumeProjectHeading|\\resumeSubHeadingListEnd/);
        const block = nextProj > -1 ? afterMatch.substring(0, nextProj) : afterMatch;
        const bullets = parseBullets(block);

        entries.push({ title, tools, bullets });
    }

    // sb2nov uses \resumeProject
    if (entries.length === 0) {
        const altRegex = /\\resumeProject\s*\{([^}]*)\}\s*\{([^}]*)\}/g;
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

// --- Education parsing ---
function parseEducation(raw) {
    const entries = [];
    const subheadingRegex = /\\resumeSubheading\s*\{([^}]*)\}\{([^}]*)\}\s*\{([^}]*)\}\{([^}]*)\}/g;
    let match;
    while ((match = subheadingRegex.exec(raw)) !== null) {
        const school = match[1].trim();
        const dates = (match[2] || match[4]).trim();
        const degree = match[3].trim();
        entries.push({ school, degree, dates });
    }
    return entries;
}

// --- Skills parsing ---
function parseSkills(raw) {
    // look for the comma-separated list after the skills label
    const match = raw.match(/\\textbf\{(?:\\normalsize\{)?Skills:?\}?\}?\{?:?\s*([\s\S]*?)(?:\}?\s*\\\\|\}?\s*$)/);
    if (match) return match[1].replace(/\\normalsize\{|\}/g, '').trim();
    // fallback: everything between \item{ and }
    const fallback = raw.match(/\\item\{[\s\S]*?\\textbf\{[^}]*\}\{:\s*([\s\S]*?)\}/);
    if (fallback) return fallback[1].trim();
    return '';
}

// Reconstructs a section's LaTeX after a bullet point edit
function replaceBullet(sectionRaw, bulletIndex, newValue) {
    let count = 0;
    // try \resumeItem first
    let updated = sectionRaw.replace(
        /\\resumeItem\{(?:\\normalsize\{)?([\s\S]*?)(?:\}\}|\})\s*/g,
        (fullMatch, content) => {
            if (count === bulletIndex) {
                count++;
                // preserve \normalsize wrapper if present
                if (fullMatch.includes('\\normalsize')) {
                    return `\\resumeItem{\\normalsize{${newValue}}}\n        `;
                }
                return `\\resumeItem{${newValue}}\n        `;
            }
            count++;
            return fullMatch;
        }
    );
    if (count === 0) {
        // sb2nov \item pattern
        count = 0;
        updated = sectionRaw.replace(
            /\\item\s*\{([\s\S]*?)\}\s*(?=\\item|\\resumeItemListEnd)/g,
            (fullMatch, content) => {
                if (count === bulletIndex) {
                    count++;
                    return `\\item {${newValue}}\n        `;
                }
                count++;
                return fullMatch;
            }
        );
    }
    return updated;
}

// Reconstructs a section's LaTeX after a subheading field edit
function replaceSubheadingField(sectionRaw, entryIndex, field, newValue) {
    let count = 0;
    return sectionRaw.replace(
        /\\resumeSubheading\s*\{([^}]*)\}\{([^}]*)\}\s*\{([^}]*)\}\{([^}]*)\}/g,
        (fullMatch, a1, a2, a3, a4) => {
            if (count === entryIndex) {
                count++;
                const args = [a1, a2, a3, a4];
                const datePattern = /\d{4}|present/i;
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
                        else args[1] = newValue;
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
        /(\\textbf\{(?:\\normalsize\{)?Skills:?\}?\}?\{?:?\s*)([\s\S]*?)((?:\}?\s*\\\\|\}?\s*$))/,
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

// --- Section identification ---
function identifySectionType(title) {
    const t = title.toUpperCase().replace(/\\TEXTLS.*?\{(.*?)\}/gi, '$1');
    if (/SUMMAR/i.test(t)) return 'summary';
    if (/EDUCAT/i.test(t)) return 'education';
    if (/EXPERI/i.test(t)) return 'experience';
    if (/PROJECT/i.test(t)) return 'projects';
    if (/SKILL/i.test(t)) return 'skills';
    return 'custom';
}

// --- Collapsible section wrapper ---
function SectionCard({ title, icon, children, defaultOpen = true }) {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <div className="border border-gray-100 rounded-2xl overflow-hidden bg-white shadow-sm">
            <button
                onClick={() => setOpen(!open)}
                className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <span className="text-lg">{icon}</span>
                    <span className="text-sm font-bold text-gray-800 uppercase tracking-wider">{title}</span>
                </div>
                <svg
                    className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                </svg>
            </button>
            {open && <div className="px-6 pb-6 space-y-4">{children}</div>}
        </div>
    );
}

function FieldInput({ label, value, onChange, multiline = false, placeholder }) {
    const cls = "w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 font-medium focus:ring-2 focus:ring-brand/20 focus:border-brand-primary/40 outline-none transition-all";
    return (
        <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{label}</label>
            {multiline ? (
                <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
                    className={`${cls} h-28 resize-none`} />
            ) : (
                <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className={cls} />
            )}
        </div>
    );
}

export default function VisualResumeEditor({ latexCode, onChange, onRecompile, isCompiling }) {
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
        <div className="space-y-4 h-full flex flex-col">
            <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-brand" />
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Visual Editor</label>
                </div>
                <button
                    onClick={handleCopy}
                    className="text-brand hover:text-brand-hover text-[9px] font-black uppercase tracking-widest flex items-center gap-2 transition-colors border border-brand-primary/20 px-3 py-1 rounded-lg bg-brand/5"
                >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Copy LaTeX
                </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
                {sections.map((section, idx) => {
                    if (section.type === 'header') {
                        const fields = parseHeader(section.raw);
                        return (
                            <SectionCard key={idx} title="Contact Info" icon="👤">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                                            onChange={v => {
                                                let updated = section.raw;
                                                const locRegex = /\\small\s+([A-Z][^\\]+?)\s*\\\\/;
                                                if (locRegex.test(updated)) {
                                                    updated = updated.replace(locRegex, `\\small ${v} \\\\`);
                                                }
                                                updateSection(idx, updated);
                                            }} />
                                    )}
                                </div>
                            </SectionCard>
                        );
                    }

                    const sType = identifySectionType(section.title);

                    if (sType === 'summary') {
                        const summaryText = parseSummary(section.raw);
                        return (
                            <SectionCard key={idx} title="Summary" icon="📝">
                                <FieldInput label="Professional Summary" value={summaryText} multiline
                                    onChange={v => updateSection(idx, applySummaryChange(section.raw, v))} />
                            </SectionCard>
                        );
                    }

                    if (sType === 'experience') {
                        const entries = parseExperience(section.raw);
                        return (
                            <SectionCard key={idx} title="Experience" icon="💼">
                                {entries.map((entry, ei) => (
                                    <div key={ei} className="border border-gray-100 rounded-xl p-4 space-y-3 bg-gray-50/50">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <FieldInput label="Job Title" value={entry.title}
                                                onChange={v => updateSection(idx, replaceSubheadingField(section.raw, ei, 'title', v))} />
                                            <FieldInput label="Company" value={entry.company}
                                                onChange={v => updateSection(idx, replaceSubheadingField(section.raw, ei, 'company', v))} />
                                        </div>
                                        <FieldInput label="Dates" value={entry.dates}
                                            onChange={v => updateSection(idx, replaceSubheadingField(section.raw, ei, 'dates', v))} />
                                        {entry.bullets.length > 0 && (
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Bullet Points</label>
                                                {entry.bullets.map((b, bi) => (
                                                    <textarea key={bi} value={b}
                                                        onChange={e => updateSection(idx, replaceBullet(section.raw, bi + entries.slice(0, ei).reduce((sum, e2) => sum + e2.bullets.length, 0), e.target.value))}
                                                        className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-800 font-medium focus:ring-2 focus:ring-brand/20 focus:border-brand-primary/40 outline-none transition-all resize-none h-16"
                                                    />
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </SectionCard>
                        );
                    }

                    if (sType === 'education') {
                        const entries = parseEducation(section.raw);
                        return (
                            <SectionCard key={idx} title="Education" icon="🎓">
                                {entries.map((entry, ei) => (
                                    <div key={ei} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                        <FieldInput label="School" value={entry.school}
                                            onChange={v => updateSection(idx, replaceSubheadingField(section.raw, ei, 'school', v))} />
                                        <FieldInput label="Degree" value={entry.degree}
                                            onChange={v => updateSection(idx, replaceSubheadingField(section.raw, ei, 'degree', v))} />
                                        <FieldInput label="Dates" value={entry.dates}
                                            onChange={v => updateSection(idx, replaceSubheadingField(section.raw, ei, 'dates', v))} />
                                    </div>
                                ))}
                            </SectionCard>
                        );
                    }

                    if (sType === 'projects') {
                        const entries = parseProjects(section.raw);
                        return (
                            <SectionCard key={idx} title="Projects" icon="🚀">
                                {entries.map((entry, pi) => (
                                    <div key={pi} className="border border-gray-100 rounded-xl p-4 space-y-3 bg-gray-50/50">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <FieldInput label="Project Name" value={entry.title}
                                                onChange={v => {
                                                    // patching project title in \resumeProjectHeading or \resumeProject
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
                                                        (m, old) => {
                                                            if (count === pi) { count++; return `\\emph{${v}}`; }
                                                            count++;
                                                            return m;
                                                        }
                                                    );
                                                    updateSection(idx, updated);
                                                }} />
                                        </div>
                                        {entry.bullets.length > 0 && (
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Bullet Points</label>
                                                {entry.bullets.map((b, bi) => (
                                                    <textarea key={bi} value={b}
                                                        onChange={e => {
                                                            const globalBi = bi + entries.slice(0, pi).reduce((sum, e2) => sum + e2.bullets.length, 0);
                                                            updateSection(idx, replaceBullet(section.raw, globalBi, e.target.value));
                                                        }}
                                                        className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-800 font-medium focus:ring-2 focus:ring-brand/20 focus:border-brand-primary/40 outline-none transition-all resize-none h-16"
                                                    />
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </SectionCard>
                        );
                    }

                    if (sType === 'skills') {
                        const skillsText = parseSkills(section.raw);
                        return (
                            <SectionCard key={idx} title="Skills" icon="⚡">
                                <FieldInput label="Skills (comma-separated)" value={skillsText}
                                    onChange={v => updateSection(idx, replaceSkills(section.raw, v))} />
                            </SectionCard>
                        );
                    }

                    // custom sections: show raw content as editable text
                    const customContent = section.raw.match(/\\item\{[\s\S]*?\{([\s\S]*?)\}\s*\}\}/);
                    return (
                        <SectionCard key={idx} title={section.title} icon="📄" defaultOpen={false}>
                            <FieldInput label="Content" value={customContent ? customContent[1].trim() : ''} multiline
                                onChange={v => {
                                    let updated = section.raw;
                                    if (customContent) {
                                        updated = updated.replace(customContent[1], v);
                                    }
                                    updateSection(idx, updated);
                                }} />
                        </SectionCard>
                    );
                })}
            </div>

            <div className="pt-3 border-t border-gray-100">
                <button
                    onClick={onRecompile}
                    disabled={isCompiling}
                    className={`w-full py-3 rounded-xl text-sm font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${isCompiling
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-brand text-white hover:bg-brand-hover shadow-lg shadow-brand/10 active:scale-[0.98]'
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
