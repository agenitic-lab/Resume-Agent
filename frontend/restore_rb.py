import os
import re

file_path = r'c:\Users\ADMIN\Desktop\AiResume\Resume-Agent\frontend\src\pages\ResumeBuilder.jsx'

with open(file_path, 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Add AIButton, AccordionItem outside of ResumeBuilder
header_add = """
// ─── Shared UI Components ──────────────────────────────────────────────────
const AIButton = ({ onClick, label = "AI Generate", className = "" }) => (
    <button onClick={onClick} type="button"
        className={`flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide px-3 py-1.5 border border-brand/20 bg-brand/5 text-brand hover:bg-brand/10 hover:border-brand/40 transition-all rounded-lg ${className}`}>
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
        {label}
    </button>
);

const AccordionItem = ({ id, title, children, openSection, toggleSection }) => {
    const isOpen = openSection === id;
    return (
        <div className={`border-b border-gray-200 overflow-hidden bg-white first:rounded-t-2xl last:border-b-0 last:rounded-b-2xl shadow-sm transition-all duration-300 ${isOpen ? 'my-2 rounded-2xl border' : ''}`}>
            <button type="button" onClick={() => toggleSection(id)} 
                className={`w-full flex justify-between items-center py-5 px-6 bg-white hover:bg-gray-50 transition-colors ${isOpen ? 'border-b border-gray-100' : ''}`}>
                <span className="font-bold text-gray-800 text-sm tracking-wide">{title}</span>
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

// UI constants for the new AI Optimization Screen
const ScoreBanner = ({ score, label }) => {
    let bgClass = "bg-gradient-to-r from-red-500 to-rose-600";
    if (score >= 80) bgClass = "bg-gradient-to-r from-green-500 to-emerald-600";
    else if (score >= 50) bgClass = "bg-gradient-to-r from-amber-500 to-orange-500";
    
    return (
        <div className={`w-full ${bgClass} rounded-t-2xl p-6 text-center text-white shadow-md relative overflow-hidden`}>
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
            <div className="relative z-10">
                <h2 className="text-5xl font-black mb-1 drop-shadow-sm">{score}</h2>
                <p className="text-sm font-bold uppercase tracking-widest opacity-90">Professional Score</p>
                <div className="mt-3 inline-block px-4 py-1.5 bg-white text-gray-800 rounded-full text-xs font-bold shadow-sm">
                    {label || 'Needs Work'}
                </div>
            </div>
        </div>
    );
};

export default function ResumeBuilder() {
"""

text = text.replace("export default function ResumeBuilder() {", header_add)

# 2. Inject states for AI optimization and Custom sections
states_inject = """
    const [openSection, setOpenSection] = useState('contact');
    
    // AI Optimization State
    const [selectedRecs, setSelectedRecs] = useState([]);
    const [isOptimizing, setIsOptimizing] = useState(false);
    
    // Resume Analysis
    const [analysisResult, setAnalysisResult] = useState(null);
    const [analysisStatus, setAnalysisStatus] = useState("Initializing...");
"""

text = text.replace("    const [hasApiKey, setHasApiKey] = useState(null);", "    const [hasApiKey, setHasApiKey] = useState(null);" + states_inject)

# update default formData mapped directly or via regex
# Wait, let's just use string replace on useState({
# Assuming there's a big default state
form_data_state = """    const [formData, setFormData] = useState({
        contact: { name: "", email: "", phone: "", location: "", linkedin: "", github: "", portfolio: "" },
        education: [],
        experience: [],
        projects: [],
        skills: { languages: "", frameworks: "", tools: "" },
        summary: "",
        custom_sections: [] // New 
    });"""

import re
text = re.sub(r'const \[formData, setFormData\] = useState\(\{[\s\S]*?summary:\s*""\s*\}\);', form_data_state, text)

# 3. Inject missing functions inside ResumeBuilder
functions_inject = """

    // --- Custom Sections ---
    const addCustomSection = () => {
        setFormData(prev => ({
            ...prev,
            custom_sections: [...prev.custom_sections, { title: "New Custom Section", items: [] }]
        }));
    };
    
    const updateCustomSectionTitle = (csIdx, title) => {
        setFormData(prev => {
            const newCs = [...prev.custom_sections];
            newCs[csIdx].title = title;
            return { ...prev, custom_sections: newCs };
        });
    };
    
    const removeCustomSection = (csIdx) => {
        setFormData(prev => ({
            ...prev,
            custom_sections: prev.custom_sections.filter((_, i) => i !== csIdx)
        }));
    };
    
    const addCustomSectionItem = (csIdx) => {
        setFormData(prev => {
            const newCs = [...prev.custom_sections];
            newCs[csIdx].items.push({ name: "", date: "", detail: "" });
            return { ...prev, custom_sections: newCs };
        });
    };
    
    const updateCustomSectionItem = (csIdx, itemIdx, field, val) => {
        setFormData(prev => {
            const newCs = [...prev.custom_sections];
            newCs[csIdx].items[itemIdx][field] = val;
            return { ...prev, custom_sections: newCs };
        });
    };
    
    const removeCustomSectionItem = (csIdx, itemIdx) => {
        setFormData(prev => {
            const newCs = [...prev.custom_sections];
            newCs[csIdx].items = newCs[csIdx].items.filter((_, i) => i !== itemIdx);
            return { ...prev, custom_sections: newCs };
        });
    };

    // --- AI Optimization Screen Logic ---
    useEffect(() => {
        if (analysisResult && analysisResult.recommendations) {
            setSelectedRecs(analysisResult.recommendations);
        }
    }, [analysisResult]);

    const handleToggleRec = (rec) => {
        setSelectedRecs(prev => {
            const exists = prev.find(r => r.issue === rec.issue);
            if (exists) return prev.filter(r => r.issue !== rec.issue);
            else return [...prev, rec];
        });
    };

    const handleToggleAll = (e) => {
        if (e.target.checked && analysisResult && analysisResult.recommendations) {
            setSelectedRecs(analysisResult.recommendations);
        } else {
            setSelectedRecs([]);
        }
    };

    const handleOptimizeWithAI = async () => {
        if (!selectedRecs || selectedRecs.length === 0) {
            toast.error("Please select at least one recommendation to apply.");
            return;
        }

        setIsOptimizing(true);
        const loadingToast = toast.loading("Applying AI optimizations... This takes 10-15 seconds...");
        
        try {
            const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/api/resume/optimize`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    resume_data: formData,
                    selected_recommendations: selectedRecs
                })
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.detail || "Optimization failed");
            }

            const optimizedData = await response.json();
            
            // Re-apply to form data
            setFormData(prev => ({
                ...prev,
                ...optimizedData
            }));
            
            toast.success("Resume optimized successfully!", { id: loadingToast });
            setCurrentStep(4);
            handleRecompile(); // trigger preview generation
        } catch (error) {
            toast.error(error.message, { id: loadingToast });
        } finally {
            setIsOptimizing(false);
        }
    };

    // --- AI Scoring Logic ---
    const runAIAnalyzer = async () => {
        if (!hasApiKey) {
            toast.error("API Key required to perform ATS analysis.");
            return;
        }
        
        try {
            toast("Running analysis...");
            const res = await analyzeResumeForATS(formData);
            setAnalysisResult(res);
            toast.success("Analysis complete!");
        } catch (error) {
            console.error(error);
            toast.error("Failed to analyze resume");
        }
    };

"""

# Insert just before handleGenerateSummary
text = text.replace("    const handleGenerateSummary = async () => {", functions_inject + "\n    const handleGenerateSummary = async () => {")


# 4. Now, obliterate the wizard rendering and replace it entirely with our 3-step monolithic return statement.
# We will truncate everything from `const steps = [` onwards.

main_render_logic = """
    const toggleSection = (id) => setOpenSection(prev => prev === id ? null : id);

    const renderStep1 = () => (
        <div className="w-full max-w-5xl mx-auto py-6 space-y-6">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-8 text-center">
                <h2 className="text-2xl font-black text-gray-800">Your Identity & Core Details</h2>
                <p className="text-sm text-gray-500 mt-2 font-medium">Fill in your information to build your Resume. Best practice is to save summary for last.</p>
            </div>
            
            <AccordionItem id="contact" title="Contact Information" openSection={openSection} toggleSection={toggleSection}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5"><label className="text-xs font-bold text-gray-500 uppercase">Name</label><input className={inputClass('name')} value={formData.contact.name} onChange={e => updateField('contact.name', e.target.value)} /></div>
                    <div className="space-y-1.5"><label className="text-xs font-bold text-gray-500 uppercase">Email</label><input className={inputClass('email')} value={formData.contact.email} onChange={e => updateField('contact.email', e.target.value)} /></div>
                    <div className="space-y-1.5"><label className="text-xs font-bold text-gray-500 uppercase">Phone</label><input className={inputClass('phone')} value={formData.contact.phone} onChange={e => updateField('contact.phone', e.target.value)} /></div>
                    <div className="space-y-1.5"><label className="text-xs font-bold text-gray-500 uppercase">Location</label><input className={inputClass('location')} value={formData.contact.location} onChange={e => updateField('contact.location', e.target.value)} /></div>
                </div>
            </AccordionItem>
            
            <AccordionItem id="experience" title="Work Experience" openSection={openSection} toggleSection={toggleSection}>
                {formData.experience.map((exp, idx) => (
                    <div key={idx} className="bg-gray-50 border border-gray-200 rounded-xl p-5 mb-4 relative">
                        <button onClick={() => removeExperience(idx)} className="absolute top-4 right-4 text-red-400 hover:text-red-600 font-bold">✕</button>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div><label className="text-xs font-bold text-gray-500 uppercase">Role</label><input className="w-full p-2 mt-1 border rounded-lg text-sm bg-white" value={exp.title} onChange={e => updateExperience(idx, 'title', e.target.value)} /></div>
                            <div><label className="text-xs font-bold text-gray-500 uppercase">Company</label><input className="w-full p-2 mt-1 border rounded-lg text-sm bg-white" value={exp.company} onChange={e => updateExperience(idx, 'company', e.target.value)} /></div>
                            <div><label className="text-xs font-bold text-gray-500 uppercase">Start Date</label><input className="w-full p-2 mt-1 border rounded-lg text-sm bg-white" value={exp.start_date} onChange={e => updateExperience(idx, 'start_date', e.target.value)} /></div>
                            <div><label className="text-xs font-bold text-gray-500 uppercase">End Date</label><input className="w-full p-2 mt-1 border rounded-lg text-sm bg-white" value={exp.end_date} onChange={e => updateExperience(idx, 'end_date', e.target.value)} /></div>
                        </div>
                        <div className="mb-2 flex justify-between"><span className="text-xs font-bold uppercase text-gray-500">Bullets</span> <AIButton onClick={() => handleGenerateBullets(idx)} label="Generate Bullets" /></div>
                        {exp.details.map((det, dIdx) => (
                            <div key={dIdx} className="flex gap-2 mb-2">
                                <input className="flex-1 p-2 border rounded-lg text-sm bg-white" value={det} onChange={e => updateExperienceDetail(idx, dIdx, e.target.value)} />
                                <button onClick={() => removeExperienceDetail(idx, dIdx)} className="text-red-400 font-bold px-2 hover:bg-red-50 rounded">✕</button>
                            </div>
                        ))}
                        <button onClick={() => addExperienceDetail(idx)} className="text-xs font-bold text-blue-500">+ Add Bullet</button>
                    </div>
                ))}
                <button onClick={addExperience} className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 font-bold hover:bg-gray-50">+ Add Experience</button>
            </AccordionItem>

            <AccordionItem id="projects" title="Projects" openSection={openSection} toggleSection={toggleSection}>
                {formData.projects.map((proj, idx) => (
                    <div key={idx} className="bg-gray-50 border border-gray-200 rounded-xl p-5 mb-4 relative">
                        <button onClick={() => removeProject(idx)} className="absolute top-4 right-4 text-red-400 hover:text-red-600 font-bold">✕</button>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div><label className="text-xs font-bold text-gray-500 uppercase">Project Name</label><input className="w-full p-2 mt-1 border rounded-lg text-sm bg-white" value={proj.name} onChange={e => updateProject(idx, 'name', e.target.value)} /></div>
                            <div><label className="text-xs font-bold text-gray-500 uppercase">Technologies</label><input className="w-full p-2 mt-1 border rounded-lg text-sm bg-white" value={proj.technologies} onChange={e => updateProject(idx, 'technologies', e.target.value)} /></div>
                        </div>
                        <div className="mb-2 flex justify-between"><span className="text-xs font-bold uppercase text-gray-500">Bullets</span> <AIButton onClick={() => handleGenerateProjectBullets(idx)} label="Generate Project Bullets" /></div>
                        {proj.details.map((det, dIdx) => (
                            <div key={dIdx} className="flex gap-2 mb-2">
                                <input className="flex-1 p-2 border rounded-lg text-sm bg-white" value={det} onChange={e => updateProjectDetail(idx, dIdx, e.target.value)} />
                                <button onClick={() => removeProjectDetail(idx, dIdx)} className="text-red-400 font-bold px-2 hover:bg-red-50 rounded">✕</button>
                            </div>
                        ))}
                        <button onClick={() => addProjectDetail(idx)} className="text-xs font-bold text-blue-500">+ Add Bullet</button>
                    </div>
                ))}
                <button onClick={addProject} className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 font-bold hover:bg-gray-50">+ Add Project</button>
            </AccordionItem>

            <AccordionItem id="education" title="Education" openSection={openSection} toggleSection={toggleSection}>
                {formData.education.map((edu, idx) => (
                    <div key={idx} className="bg-gray-50 border border-gray-200 rounded-xl p-5 mb-4 relative">
                        <button onClick={() => removeEducation(idx)} className="absolute top-4 right-4 text-red-400 hover:text-red-600 font-bold">✕</button>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div><label className="text-xs font-bold text-gray-500 uppercase">Institution</label><input className="w-full p-2 mt-1 border rounded-lg text-sm bg-white" value={edu.institution} onChange={e => updateEducation(idx, 'institution', e.target.value)} /></div>
                            <div><label className="text-xs font-bold text-gray-500 uppercase">Degree</label><input className="w-full p-2 mt-1 border rounded-lg text-sm bg-white" value={edu.degree} onChange={e => updateEducation(idx, 'degree', e.target.value)} /></div>
                            <div><label className="text-xs font-bold text-gray-500 uppercase">Graduation Date</label><input className="w-full p-2 mt-1 border rounded-lg text-sm bg-white" value={edu.end_date} onChange={e => updateEducation(idx, 'end_date', e.target.value)} /></div>
                        </div>
                    </div>
                ))}
                <button onClick={addEducation} className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 font-bold hover:bg-gray-50">+ Add Education</button>
            </AccordionItem>
            
            <AccordionItem id="skills" title="Skills" openSection={openSection} toggleSection={toggleSection}>
                <div className="space-y-4">
                    <div><label className="text-xs font-bold text-gray-500 uppercase">Languages / Core</label><input className="w-full p-2 mt-1 border rounded-lg text-sm bg-white" placeholder="comma separated" value={formData.skills?.languages || ''} onChange={e => setFormData(p => ({...p, skills: {...p.skills, languages: e.target.value}}))} /></div>
                    <div><label className="text-xs font-bold text-gray-500 uppercase">Frameworks</label><input className="w-full p-2 mt-1 border rounded-lg text-sm bg-white" placeholder="comma separated" value={formData.skills?.frameworks || ''} onChange={e => setFormData(p => ({...p, skills: {...p.skills, frameworks: e.target.value}}))} /></div>
                    <div><label className="text-xs font-bold text-gray-500 uppercase">Tools</label><input className="w-full p-2 mt-1 border rounded-lg text-sm bg-white" placeholder="comma separated" value={formData.skills?.tools || ''} onChange={e => setFormData(p => ({...p, skills: {...p.skills, tools: e.target.value}}))} /></div>
                </div>
            </AccordionItem>

            <AccordionItem id="custom_sections" title="Custom Sections" openSection={openSection} toggleSection={toggleSection}>
                {formData.custom_sections && formData.custom_sections.map((cs, csIdx) => (
                    <div key={csIdx} className="bg-gray-50 border border-gray-200 rounded-xl p-5 mb-4 relative">
                        <button onClick={() => removeCustomSection(csIdx)} className="absolute top-4 right-4 text-red-400 hover:text-red-600 font-bold">✕</button>
                        <div className="mb-4 w-3/4"><label className="text-xs font-bold text-gray-500 uppercase">Section Name</label><input className="w-full p-2 mt-1 border rounded-lg text-sm bg-white font-bold text-brand" value={cs.title} onChange={e => updateCustomSectionTitle(csIdx, e.target.value)} /></div>
                        {cs.items.map((item, itemIdx) => (
                            <div key={itemIdx} className="bg-white border rounded-lg p-3 mb-2 relative">
                                <button onClick={() => removeCustomSectionItem(csIdx, itemIdx)} className="absolute top-2 right-2 text-red-400 hover:text-red-600">✕</button>
                                <div className="grid grid-cols-2 gap-2 mb-2 w-11/12">
                                    <input placeholder="Name/Role (e.g. AWS Certified Developer)" className="p-2 border rounded text-xs bg-gray-50" value={item.name} onChange={e => updateCustomSectionItem(csIdx, itemIdx, 'name', e.target.value)} />
                                    <input placeholder="Date / Value" className="p-2 border rounded text-xs bg-gray-50" value={item.date} onChange={e => updateCustomSectionItem(csIdx, itemIdx, 'date', e.target.value)} />
                                </div>
                                <input placeholder="Additional Details..." className="p-2 border rounded text-xs bg-gray-50 w-full" value={item.detail} onChange={e => updateCustomSectionItem(csIdx, itemIdx, 'detail', e.target.value)} />
                            </div>
                        ))}
                        <button onClick={() => addCustomSectionItem(csIdx)} className="text-xs font-bold text-blue-500 mt-2">+ Add Item</button>
                    </div>
                ))}
                <button onClick={addCustomSection} className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 font-bold hover:bg-gray-50">+ Add Custom Section</button>
            </AccordionItem>
            
            <AccordionItem id="summary" title="Professional Summary" openSection={openSection} toggleSection={toggleSection}>
                <div className="mb-2 flex justify-end"><AIButton onClick={handleGenerateSummary} label="Generate Summary" /></div>
                <textarea className="w-full p-4 border rounded-xl bg-gray-50 h-40 text-sm focus:border-brand focus:ring-1 focus:ring-brand outline-none" placeholder="Write a compelling professional summary..." value={formData.summary} onChange={e => updateField('summary', e.target.value)} />
            </AccordionItem>

            <div className="flex justify-end pt-6">
                <Button onClick={() => { setCurrentStep(2); runAIAnalyzer(); }} size="lg" className="px-8 bg-brand font-bold text-white rounded-xl">Next: AI Optimization →</Button>
            </div>
        </div>
    );

    const renderStep3 = () => (
        <div className="space-y-6 max-w-5xl mx-auto text-left py-6">
            {!analysisResult && <div className="text-center py-20"><div className="w-12 h-12 border-4 border-brand border-t-transparent rounded-full animate-spin mx-auto mb-4"></div><p className="font-bold text-gray-600 text-lg">Analyzing your resume...</p></div>}
            
            {analysisResult && (
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm mb-8 flex flex-col">
                    <ScoreBanner score={analysisResult.score || 20} label={analysisResult.score_label || 'Needs Work'} />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
                        <div className="border border-green-100 bg-green-50/30 rounded-xl p-5">
                            <h4 className="text-sm font-bold text-green-700 mb-4 flex items-center gap-2"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> Strengths</h4>
                            <ul className="space-y-3">
                                {analysisResult.strengths && analysisResult.strengths.map((str, i) => (<li key={i} className="text-xs text-green-800 font-medium">{str}</li>))}
                            </ul>
                        </div>
                        <div className="border border-amber-100 bg-amber-50/30 rounded-xl p-5">
                            <h4 className="text-sm font-bold text-amber-700 mb-4 flex items-center gap-2">Areas for Improvement</h4>
                            <ul className="space-y-3">
                                {analysisResult.weaknesses && analysisResult.weaknesses.map((weak, i) => (<li key={i} className="text-xs text-amber-800 font-medium">{weak}</li>))}
                            </ul>
                        </div>
                    </div>
                    
                    <div className="p-6 pt-0">
                        <div className="border border-gray-200 rounded-xl bg-gray-50/50">
                            <div className="flex justify-between items-center p-4 border-b border-gray-200 bg-white rounded-t-xl">
                                <h4 className="text-sm font-bold text-gray-800">AI Recommendations ({analysisResult.recommendations ? analysisResult.recommendations.length : 0})</h4>
                                <label className="flex items-center gap-2 text-xs font-bold text-gray-500 cursor-pointer">
                                    <input type="checkbox" className="w-4 h-4 rounded text-brand border-gray-300" 
                                        checked={selectedRecs.length === (analysisResult.recommendations?.length || 0) && selectedRecs.length > 0} onChange={handleToggleAll} />
                                    Select All
                                </label>
                            </div>
                            <div className="p-4 space-y-3">
                                {analysisResult.recommendations && analysisResult.recommendations.map((rec, i) => (
                                    <div key={i} className="bg-white border rounded-lg p-4 flex gap-4 shadow-sm">
                                        <input type="checkbox" className="w-4 h-4 mt-1 rounded text-brand" checked={selectedRecs.some(r => r.issue === rec.issue)} onChange={() => handleToggleRec(rec)} />
                                        <div className="w-full">
                                            <p className="text-xs text-gray-600 mb-1"><strong>Issue:</strong> {rec.issue}</p>
                                            <p className="text-xs text-gray-800 font-bold bg-green-50 p-2 rounded"><strong>Solution:</strong> {rec.solution}</p>
                                        </div>
                                    </div>
                                ))}
                                {(!analysisResult.recommendations || analysisResult.recommendations.length === 0) && <p className="text-sm text-gray-500 text-center py-4">No AI recommendations identified.</p>}
                            </div>
                            <div className="p-4 border-t border-gray-200 bg-white rounded-b-xl flex justify-center">
                                <Button onClick={handleOptimizeWithAI} disabled={isOptimizing} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-2 rounded-lg">
                                    {isOptimizing ? 'Optimizing...' : `Optimize with AI (${selectedRecs.length})`}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            <div className="flex justify-end gap-4">
                <Button variant="outline" size="lg" onClick={() => setCurrentStep(1)} className="px-8 font-bold border-2">Edit Manually</Button>
                <button onClick={() => { setCurrentStep(4); handleRecompile(); }} className="px-8 py-3 rounded-xl font-bold bg-gray-800 text-white flex items-center">Preview & Download</button>
            </div>
        </div>
    );
    
    // Step 4 is the preview wrapper. It renders exactly the old preview stuff.
    const renderStep4 = () => (
        <div className="space-y-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-black text-gray-800">Preview & Download</h2>
                    <p className="text-sm text-gray-500">Review your final resume and download as PDF.</p>
                </div>
                <div className="flex gap-3">
                    <Button variant="outline" onClick={() => setCurrentStep(1)}>← Edit Details</Button>
                    <Button onClick={handleDownload} className="font-bold bg-brand text-white">📥 Download PDF</Button>
                </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                        <label className="text-xs font-bold text-gray-500 uppercase block mb-3">Template Options</label>
                        <div className="space-y-3">
                            {['classic', 'modern', 'executive'].map(t => (
                                <button key={t} onClick={() => updateField('templatePreference', t)} className={`w-full py-2 px-3 border rounded-lg text-sm font-bold uppercase tracking-wider text-left transition-all ${formData.templatePreference === t ? 'border-brand bg-brand/5 text-brand ring-1 ring-brand' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                                    {t}
                                </button>
                            ))}
                        </div>
                        <Button onClick={handleRecompile} disabled={isCompiling} className="w-full mt-4 font-bold border-2 bg-gray-50 hover:bg-gray-100 text-gray-800 border-gray-200">
                            {isCompiling ? 'Updating...' : 'Refresh Preview ⟳'}
                        </Button>
                    </div>
                </div>
                <div className="lg:col-span-3">
                    <div className="border border-gray-200 shadow-xl rounded-xl overflow-hidden bg-white/50 relative h-[800px]">
                        {isCompiling && (
                            <div className="absolute inset-0 bg-white/60 backdrop-blur-sm z-10 flex items-center justify-center">
                                <div className="animate-spin w-10 h-10 border-4 border-brand rounded-full border-t-transparent"></div>
                            </div>
                        )}
                        {previewHtml ? (previewHtml.startsWith('blob:') ? <iframe src={previewHtml} className="w-full h-full border-0" /> : <iframe srcDoc={previewHtml} className="w-full h-full border-0" />) : <div className="flex w-full h-full items-center justify-center text-gray-400 font-medium">Click Refresh Preview to generate</div>}
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center">
            {hasApiKey === false && (
                <div className="w-full max-w-5xl px-6 pt-6 mb-4">
                    <div className="border-l-4 border-l-brand rounded-xl p-4 shadow-sm bg-white">
                        <p className="text-sm font-medium">To use AI generators, you need a Groq API Key inside Settings.</p>
                    </div>
                </div>
            )}

            <div className="w-full bg-white border-b border-gray-200 shadow-sm pt-4 pb-2 mb-4 sticky top-0 z-10">
                <div className="max-w-5xl mx-auto px-6">
                    <h1 className="text-lg font-bold mb-3 text-gray-800">Resume Builder</h1>
                    <div className="flex flex-col md:flex-row items-center justify-between relative">
                        <div className="hidden md:block absolute top-[28px] left-[15%] right-[15%] h-[2px] bg-gray-100 z-0">
                            <div className={`h-full bg-brand transition-all duration-700 ease-in-out`} style={{ width: currentStep === 1 ? '0%' : currentStep === 2 ? '50%' : '100%' }}></div>
                        </div>
                        {[{ num: 1, label: "Details", desc: "Build resume" }, { num: 2, label: "AI Optimize", desc: "ATS insights" }, { num: 4, label: "Preview", desc: "Download" }].map(s => (
                            <div key={s.num} onClick={() => s.num !== 2 && setCurrentStep(s.num)} className={`relative z-10 flex flex-col items-center cursor-pointer transition-all ${currentStep === s.num ? 'text-brand scale-110' : 'text-gray-400 hover:text-gray-600'}`}>
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm mb-2 shadow-sm border-2 transition-all ${currentStep === s.num ? 'bg-brand text-white border-brand ring-4 ring-brand/20' : currentStep > s.num ? 'bg-brand text-white border-brand' : 'bg-white border-gray-200'}`}>
                                    {s.num}
                                </div>
                                <span className={`text-[10px] font-black uppercase tracking-widest ${currentStep === s.num ? 'text-brand' : ''}`}>{s.label}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="w-full max-w-6xl px-4 md:px-6 pb-20">
                {currentStep === 1 && renderStep1()}
                {currentStep === 2 && renderStep3()}
                {currentStep === 4 && renderStep4()}
            </div>
        </div>
    );
}
"""

start_idx = text.find('    // ── Steps ──\n    const steps = [')
if start_idx == -1:
    print("Could not find steps array to replace. Aborting wizard extraction.")
else:
    text = text[:start_idx] + main_render_logic

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(text)

print("Restoration script generated and applied.")
