import os

file_path = r'c:\Users\ADMIN\Desktop\AiResume\Resume-Agent\frontend\src\pages\ResumeBuilder.jsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Remove AIButton definition
ai_btn = """    const AIButton = ({ onClick, label = "AI Generate" }) => (
        <Button onClick={onClick} variant="outline" size="sm" type="button"
            className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide border-gray-200 hover:bg-brand/10 hover:text-brand hover:border-brand/30 transition-all rounded-lg">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            {label}
        </Button>
    );"""

content = content.replace(ai_btn, "")

# 2. Remove AccordionItem definition
acc = """    // Accordion Wrapper
    const AccordionItem = ({ id, title, children }) => {
        const isOpen = openSection === id;
        return (
            <div className={`border-b border-gray-200 overflow-hidden bg-white first:rounded-t-2xl last:border-b-0 last:rounded-b-2xl shadow-sm transition-all duration-300 ${isOpen ? 'my-2 rounded-2xl border' : ''}`}>
                <button onClick={() => toggleSection(id)} 
                    className={`w-full flex justify-between items-center py-5 px-6 bg-white hover:bg-gray-50 transition-colors ${isOpen ? 'border-b border-gray-100' : ''}`}>
                    <span className="font-bold text-gray-800 text-sm">{title}</span>
                    <svg className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </button>
                {isOpen && (
                    <div className="p-6 bg-white animate-in fade-in slide-in-from-top-2 duration-300">
                        {children}
                    </div>
                )}
            </div>
        );
    };"""

content = content.replace(acc, "")

# 3. Add to top
top_comps = """// ─── AI Button ─────────────────────────────────────────────────────────────
const AIButton = ({ onClick, label = "AI Generate" }) => (
    <Button onClick={onClick} variant="outline" size="sm" type="button"
        className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide border-gray-200 hover:bg-brand/10 hover:text-brand hover:border-brand/30 transition-all rounded-lg">
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
        {label}
    </Button>
);

// ─── Accordion Wrapper ─────────────────────────────────────────────────────
const AccordionItem = ({ id, title, children, openSection, toggleSection }) => {
    const isOpen = openSection === id;
    return (
        <div className={`border-b border-gray-200 overflow-hidden bg-white first:rounded-t-2xl last:border-b-0 last:rounded-b-2xl shadow-sm transition-all duration-300 ${isOpen ? 'my-2 rounded-2xl border' : ''}`}>
            <button type="button" onClick={() => toggleSection(id)} 
                className={`w-full flex justify-between items-center py-5 px-6 bg-white hover:bg-gray-50 transition-colors ${isOpen ? 'border-b border-gray-100' : ''}`}>
                <span className="font-bold text-gray-800 text-sm">{title}</span>
                <svg className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </button>
            {isOpen && (
                <div className="p-6 bg-white animate-in fade-in slide-in-from-top-2 duration-300">
                    {children}
                </div>
            )}
        </div>
    );
};

// ─── Main Component ────────────────────────────────────────────────────────
"""

content = content.replace("// ─── Main Component ────────────────────────────────────────────────────────\n", top_comps)

# 4. Replace usages
content = content.replace('<AccordionItem id="contact" title="Contact Information & Target Role">', '<AccordionItem id="contact" title="Contact Information & Target Role" openSection={openSection} toggleSection={toggleSection}>')
content = content.replace('<AccordionItem id="summary" title="Professional Summary">', '<AccordionItem id="summary" title="Professional Summary" openSection={openSection} toggleSection={toggleSection}>')
content = content.replace('<AccordionItem id="skills" title="Skills">', '<AccordionItem id="skills" title="Skills" openSection={openSection} toggleSection={toggleSection}>')
content = content.replace('<AccordionItem id="experience" title="Work Experience">', '<AccordionItem id="experience" title="Work Experience" openSection={openSection} toggleSection={toggleSection}>')
content = content.replace('<AccordionItem id="projects" title="Projects">', '<AccordionItem id="projects" title="Projects" openSection={openSection} toggleSection={toggleSection}>')
content = content.replace('<AccordionItem id="education" title="Education">', '<AccordionItem id="education" title="Education" openSection={openSection} toggleSection={toggleSection}>')

# Write back
with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Modifications successfully applied!")
