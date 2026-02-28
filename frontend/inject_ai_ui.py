import os
import re

file_path = r'c:\Users\ADMIN\Desktop\AiResume\Resume-Agent\frontend\src\pages\ResumeBuilder.jsx'
with open(file_path, 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Add ScoreBanner to the top, and extract AIButton and TemplatePreview from within ResumeBuilder.
# We will use simple textual replacement to erase them from inside ResumeBuilder, and prepend them to the top.

# First, define them to put at the top (right before default export)
shared_components = """
// ─── Shared UI Components ──────────────────────────────────────────────────
const AIButton = ({ onClick, label = "AI Generate" }) => (
    <Button onClick={onClick} variant="outline" size="sm" type="button"
        className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide border-gray-200 hover:bg-brand/10 hover:text-brand hover:border-brand/30 transition-all rounded-lg">
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
        {label}
    </Button>
);

const TemplatePreview = ({ type }) => {
    const layouts = {
        modern: (
            <div className="w-full h-full bg-white flex overflow-hidden rounded shadow-inner">
                <div className="w-1/3 bg-neutral-800 h-full p-1 space-y-1">
                    <div className="w-2/3 h-2 bg-neutral-600 rounded-px" />
                    <div className="w-full h-1 bg-neutral-700 rounded-px" />
                    <div className="w-full h-1 bg-neutral-700 rounded-px" />
                </div>
                <div className="flex-1 p-1 space-y-1.5">
                    <div className="w-1/2 h-2 bg-neutral-200 rounded-px" />
                    <div className="w-full h-1 bg-neutral-100 rounded-px" />
                    <div className="w-full h-1 bg-neutral-100 rounded-px" />
                    <div className="w-full h-1 bg-neutral-100 rounded-px" />
                </div>
            </div>
        ),
        classic: (
            <div className="w-full h-full bg-white p-2 flex flex-col items-center space-y-1 shadow-inner rounded">
                <div className="w-1/2 h-2 bg-neutral-300 rounded-px" />
                <div className="w-1/3 h-1 bg-neutral-200 rounded-px" />
                <div className="flex gap-1 py-1">
                    <div className="w-1 h-1 bg-neutral-400 rounded-full" />
                    <div className="w-1 h-1 bg-neutral-400 rounded-full" />
                    <div className="w-1 h-1 bg-neutral-400 rounded-full" />
                    <div className="w-1 h-1 bg-neutral-400 rounded-full" />
                </div>
                <div className="w-full h-px bg-neutral-200" />
                <div className="w-full h-1 bg-neutral-100 rounded-px" />
                <div className="w-full h-1 bg-neutral-100 rounded-px" />
                <div className="w-full h-px bg-neutral-200" />
                <div className="flex w-full justify-between gap-1">
                    <div className="w-1/2 h-1 bg-neutral-100 rounded-px" />
                    <div className="w-1/4 h-1 bg-neutral-100 rounded-px" />
                </div>
            </div>
        ),
        executive: (
            <div className="w-full h-full bg-white p-2 flex flex-col items-center space-y-1 shadow-inner rounded">
                <div className="w-1/3 h-1.5 bg-neutral-400 rounded-px" />
                <div className="w-full h-2 bg-neutral-100 rounded-px mt-2" />
                <div className="w-full h-px bg-neutral-200" />
                <div className="w-full h-1 bg-neutral-50 rounded-px" />
                <div className="w-full h-1 bg-neutral-50 rounded-px" />
            </div>
        ),
        diamond: (
            <div className="w-full h-full bg-white p-2 space-y-2 shadow-inner rounded">
                <div className="w-2/3 h-2 bg-neutral-200 mx-auto" />
                <div className="space-y-1">
                    <div className="flex items-center gap-1"><div className="w-1 h-1 bg-neutral-400 rotate-45" /><div className="flex-1 h-1 bg-neutral-100" /></div>
                    <div className="flex items-center gap-1 pl-2"><div className="w-full h-0.5 bg-neutral-50" /></div>
                    <div className="w-full border-t border-dotted border-neutral-200 mt-1" />
                    <div className="flex items-center gap-1"><div className="w-1 h-1 bg-neutral-400 rotate-45" /><div className="flex-1 h-1 bg-neutral-100" /></div>
                </div>
            </div>
        ),
        twocol: (
            <div className="w-full h-full bg-white flex overflow-hidden rounded shadow-inner">
                <div className="w-2/3 p-2 space-y-2 border-r border-neutral-100">
                    <div className="w-1/2 h-2 bg-neutral-200" />
                    <div className="w-full h-1 bg-neutral-100" />
                    <div className="w-full h-1 bg-neutral-100" />
                </div>
                <div className="flex-1 p-2 space-y-2 bg-neutral-50">
                    <div className="w-full h-1.5 bg-neutral-200" />
                    <div className="w-full h-1 bg-neutral-100" />
                </div>
            </div>
        ),
        sharp: (
            <div className="w-full h-full bg-white p-2 space-y-2 shadow-inner rounded">
                <div className="flex justify-between items-center mb-2">
                    <div className="w-1/3 h-3 bg-neutral-800" />
                    <div className="w-1/3 h-1 bg-neutral-200" />
                </div>
                <div className="w-1/2 h-2 bg-neutral-400" />
                <div className="w-full border-b-2 border-neutral-800" />
                <div className="w-full h-1 bg-neutral-100" />
            </div>
        ),
        accent: (
            <div className="w-full h-full bg-white p-2 space-y-2 shadow-inner rounded">
                <div className="w-2/3 h-3 bg-neutral-900 mx-auto" />
                <div className="space-y-1">
                    <div className="w-1/2 h-1.5 bg-blue-500" />
                    <div className="w-full h-1 bg-neutral-100" />
                    <div className="w-1/2 h-1.5 bg-blue-500" />
                    <div className="w-full h-1 bg-neutral-100" />
                </div>
            </div>
        ),
        centered: (
            <div className="w-full h-full bg-white p-2 flex flex-col items-center space-y-1 shadow-inner rounded">
                <div className="w-2/3 h-3 bg-neutral-800 mt-1" />
                <div className="w-1/2 h-1.5 bg-neutral-200 italic font-serif" />
                <div className="w-full h-px bg-neutral-300 my-1" />
                <div className="w-full flex gap-1 mt-1">
                    <div className="flex-1 h-3 bg-neutral-50 border border-neutral-100" />
                    <div className="flex-1 h-3 bg-neutral-50 border border-neutral-100" />
                    <div className="flex-1 h-3 bg-neutral-50 border border-neutral-100" />
                </div>
            </div>
        ),
        serifpro: (
            <div className="w-full h-full bg-white p-2 flex flex-col items-center space-y-1 shadow-inner rounded">
                <div className="w-1/2 h-3 bg-neutral-900" />
                <div className="flex gap-2 mb-2"><div className="w-1 h-1 bg-neutral-400 rounded-full" /><div className="w-1 h-1 bg-neutral-400 rounded-full" /><div className="w-1 h-1 bg-neutral-400 rounded-full" /></div>
                <div className="w-full text-left h-2 bg-neutral-100 font-bold uppercase tracking-tighter" />
                <div className="w-full h-px bg-neutral-900 mb-1" />
                <div className="w-full h-1 bg-neutral-50 mb-1" />
                <div className="w-full h-1 bg-neutral-50" />
            </div>
        ),
        minimal: (
            <div className="w-full h-full bg-white p-2 flex flex-col items-center space-y-1 shadow-inner rounded">
                <div className="w-1/3 h-2 bg-neutral-300 mb-4" />
                <div className="w-full flex gap-1">
                    {[1, 2, 3, 4].map(i => <div key={i} className="flex-1 h-2 bg-neutral-100" />)}
                </div>
                <div className="w-full h-2 bg-neutral-200 mt-2" />
                <div className="w-full h-1 bg-neutral-50" />
            </div>
        )
    };
    return (
        <div className="w-16 h-20 shrink-0 bg-secondary p-1 rounded-md border border-gray-100">
            {layouts[type] || layouts.classic}
        </div>
    );
};

// ─── Score Banner ─────────────────────────────────────────────────────────
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
"""

# Insert right before export default function ResumeBuilder()
if "ScoreBanner" not in text:
    text = text.replace("export default function ResumeBuilder() {", shared_components + "\nexport default function ResumeBuilder() {")

# Erase AIButton and TemplatePreview from INSIDE ResumeBuilder using regex
# We find their blocks and remove them.
ai_button_regex = r'// ── AI Button ──\n\s*const AIButton.*?;\n'
template_preview_regex = r'// ── Template Preview Component \(CSS-based\) ──\n\s*const TemplatePreview.*?layouts\[type\].*?;\n\s*};\n'

text = re.sub(ai_button_regex, '', text, flags=re.DOTALL)
text = re.sub(template_preview_regex, '', text, flags=re.DOTALL)


# 2. Inject states for AI optimization
if "const [selectedRecs, setSelectedRecs]" not in text:
    states_inject = """
    // AI Optimization State
    const [selectedRecs, setSelectedRecs] = useState([]);
    const [isOptimizing, setIsOptimizing] = useState(false);
    
    // Resume Analysis
    const [analysisResult, setAnalysisResult] = useState(null);
    const [analysisStatus, setAnalysisStatus] = useState("Initializing...");
"""
    text = text.replace("    const [hasApiKey, setHasApiKey] = useState(null);", 
                        "    const [hasApiKey, setHasApiKey] = useState(null);" + states_inject)

# 3. Inject missing functions inside ResumeBuilder
if "const handleOptimizeWithAI" not in text:
    functions_inject = """
    // --- AI Optimization Logic ---
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

    const runAIAnalyzer = async () => {
        if (!hasApiKey) {
            toast.error("API Key required to perform ATS analysis.");
            return;
        }
        try {
            toast("Running analysis...");
            setAnalysisStatus("Evaluating ATS compatibility...");
            const res = await analyzeResumeForATS(formData);
            setAnalysisResult(res);
            setAnalysisStatus("Analysis complete!");
            toast.success("Analysis complete!");
        } catch (error) {
            console.error(error);
            toast.error("Failed to analyze resume");
            setAnalysisStatus("Analysis failed.");
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
            const response = await fetch(`${API_BASE_URL}/api/resume/optimize`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${localStorage.getItem('token') || ''}`
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
            setFormData(prev => ({
                ...prev,
                ...optimizedData
            }));
            
            toast.success("Resume optimized successfully!", { id: loadingToast });
            // Move to preview and auto-generate
            setCurrentStep(10);
            handleSaveAndPreview();
        } catch (error) {
            toast.error(error.message, { id: loadingToast });
        } finally {
            setIsOptimizing(false);
        }
    };
    
    // Auto-run analysis when hitting step 9
    useEffect(() => {
        if (currentStep === 9 && !analysisResult && !isOptimizing) {
            runAIAnalyzer();
        }
    }, [currentStep, analysisResult, isOptimizing]);
"""
    # Insert right before compileLatex
    text = text.replace("    const compileLatex = useCallback(async (code) => {", functions_inject + "\n    const compileLatex = useCallback(async (code) => {")

# 4. Inject the new Step in steps array
if 'title: "AI Resume Analysis"' not in text:
    ai_step = """        {
            title: "AI Resume Analysis",
            subtitle: "We analyzed your inputs against ATS best practices.",
            render: () => (
                <div className="space-y-6 text-left">
                    {!analysisResult && (
                        <div className="text-center py-20">
                            <div className="w-12 h-12 border-4 border-brand border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                            <p className="font-bold text-gray-600 text-lg">{analysisStatus}</p>
                        </div>
                    )}
                    
                    {analysisResult && (
                        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm mb-8 flex flex-col overflow-hidden">
                            <ScoreBanner score={analysisResult.score || 20} label={analysisResult.score_label || 'Needs Work'} />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-gray-50/30">
                                <div className="border border-green-100 bg-green-50/50 rounded-xl p-5 shadow-sm">
                                    <h4 className="text-sm font-black text-green-700 uppercase tracking-widest mb-4 flex items-center gap-2">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> Strengths
                                    </h4>
                                    <ul className="space-y-3">
                                        {analysisResult.strengths && analysisResult.strengths.map((str, i) => (
                                            <li key={i} className="text-sm text-green-800 font-medium leading-relaxed">{str}</li>
                                        ))}
                                    </ul>
                                </div>
                                <div className="border border-amber-100 bg-amber-50/50 rounded-xl p-5 shadow-sm">
                                    <h4 className="text-sm font-black text-amber-700 uppercase tracking-widest mb-4 flex items-center gap-2">
                                        Areas for Improvement
                                    </h4>
                                    <ul className="space-y-3">
                                        {analysisResult.weaknesses && analysisResult.weaknesses.map((weak, i) => (
                                            <li key={i} className="text-sm text-amber-800 font-medium leading-relaxed">{weak}</li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                            
                            <div className="p-6 pt-0 bg-gray-50/30">
                                <div className="border border-gray-200 rounded-xl bg-white shadow-sm overflow-hidden">
                                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-5 border-b border-gray-100 bg-slate-50 gap-4">
                                        <div>
                                            <h4 className="text-base font-black text-gray-800">AI Recommendations</h4>
                                            <p className="text-xs text-slate-500 font-medium mt-0.5">Select the issues you want our AI to automatically fix.</p>
                                        </div>
                                        <label className="flex items-center gap-2 text-xs font-bold text-gray-500 cursor-pointer bg-white px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                                            <input type="checkbox" className="w-4 h-4 rounded text-brand border-gray-300 focus:ring-brand" 
                                                checked={selectedRecs.length === (analysisResult.recommendations?.length || 0) && selectedRecs.length > 0} 
                                                onChange={handleToggleAll} 
                                            />
                                            Select All
                                        </label>
                                    </div>
                                    <div className="p-3 divide-y divide-gray-100">
                                        {analysisResult.recommendations && analysisResult.recommendations.map((rec, i) => (
                                            <div key={i} className="bg-white p-4 flex gap-4 hover:bg-slate-50/50 transition-colors">
                                                <input type="checkbox" className="w-5 h-5 mt-1 rounded text-brand border-gray-300 focus:ring-brand cursor-pointer" 
                                                    checked={selectedRecs.some(r => r.issue === rec.issue)} 
                                                    onChange={() => handleToggleRec(rec)} 
                                                />
                                                <div className="w-full">
                                                    <p className="text-sm text-gray-600 mb-2 leading-relaxed"><strong className="text-gray-800 uppercase text-[10px] tracking-widest mr-2">Issue detected:</strong> {rec.issue}</p>
                                                    <div className="bg-green-50/80 border border-green-100 p-3 rounded-lg">
                                                        <p className="text-sm text-green-900 font-medium leading-relaxed"><strong className="text-green-700 uppercase text-[10px] tracking-widest mr-2">AI Solution:</strong> {rec.solution}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                        {(!analysisResult.recommendations || analysisResult.recommendations.length === 0) && (
                                            <p className="text-sm text-gray-500 font-medium text-center py-8">No critical AI recommendations identified. You're good to go!</p>
                                        )}
                                    </div>
                                    <div className="p-5 border-t border-gray-100 bg-slate-50 flex justify-end items-center gap-4">
                                        <span className="text-xs font-bold text-slate-500">{selectedRecs.length} selected</span>
                                        <Button onClick={handleOptimizeWithAI} disabled={isOptimizing || selectedRecs.length === 0} 
                                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-widest text-xs px-8 py-6 rounded-xl shadow-lg transition-transform hover:scale-105 active:scale-95 disabled:hover:scale-100">
                                            {isOptimizing ? 'Optimizing...' : `Auto-Fix with AI`}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )
        },
        {
            title: "Review & Generate",
"""
    text = text.replace('        {\n            title: "Review & Generate",', ai_step)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(text)

print("Injected new AI UI successfully.")
