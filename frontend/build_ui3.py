import os

file_path = r'c:\Users\ADMIN\Desktop\AiResume\Resume-Agent\frontend\src\pages\ResumeBuilder.jsx'

with open(file_path, 'r', encoding='utf-8') as f:
    orig_content = f.read()

content = orig_content

start_idx = content.find('    // UI constants for the new AI Optimization Screen')
end_idx = content.find('    return (', start_idx)

new_step3 = '''    // UI constants for the new AI Optimization Screen
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

    const [selectedRecs, setSelectedRecs] = useState([]);
    const [isOptimizing, setIsOptimizing] = useState(false);

    // Update selectedRecs whenever analysisResult changes
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
            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/resume/optimize`, {
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

    const renderStep3 = () => (
        <div className="space-y-6 max-w-5xl mx-auto text-left py-6">
            {analysisResult && (
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm mb-8 flex flex-col">
                    
                    <ScoreBanner score={analysisResult.score || 20} label={analysisResult.score_label || 'Needs Work'} />
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
                        {/* Strengths */}
                        <div className="border border-green-100 bg-green-50/30 rounded-xl p-5">
                            <h4 className="text-sm font-bold text-green-700 mb-4 flex items-center gap-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                Strengths
                            </h4>
                            <ul className="space-y-3">
                                {analysisResult.strengths && analysisResult.strengths.map((str, i) => (
                                    <li key={i} className="text-xs text-green-800 font-medium flex items-start gap-2 leading-relaxed">
                                        <svg className="w-3.5 h-3.5 text-green-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                        {str}
                                    </li>
                                ))}
                            </ul>
                        </div>
                        
                        {/* Areas for Improvement */}
                        <div className="border border-amber-100 bg-amber-50/30 rounded-xl p-5">
                            <h4 className="text-sm font-bold text-amber-700 mb-4 flex items-center gap-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                Areas for Improvement
                            </h4>
                            <ul className="space-y-3">
                                {analysisResult.weaknesses && analysisResult.weaknesses.map((weak, i) => (
                                    <li key={i} className="text-xs text-amber-800 font-medium flex items-start gap-2 leading-relaxed">
                                        <svg className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                        {weak}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                    
                    {/* Recommendations */}
                    <div className="p-6 pt-0">
                        <div className="border border-gray-200 rounded-xl bg-gray-50/50">
                            <div className="flex justify-between items-center p-4 border-b border-gray-200 bg-white rounded-t-xl">
                                <h4 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                                    <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                                    AI Recommendations ({analysisResult.recommendations ? analysisResult.recommendations.length : 0})
                                </h4>
                                <label className="flex items-center gap-2 text-xs font-bold text-gray-500 cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        className="w-4 h-4 rounded text-brand border-gray-300 focus:ring-brand" 
                                        checked={selectedRecs.length === (analysisResult.recommendations?.length || 0) && selectedRecs.length > 0}
                                        onChange={handleToggleAll} 
                                    />
                                    Select All
                                </label>
                            </div>
                            
                            <div className="p-4 space-y-3">
                                {analysisResult.recommendations && analysisResult.recommendations.map((rec, i) => (
                                    <div key={i} className="bg-white border border-gray-200 rounded-lg p-4 flex gap-4 transition-all hover:border-gray-300 shadow-sm">
                                        <input 
                                            type="checkbox" 
                                            className="w-4 h-4 mt-1 rounded text-brand border-gray-300 focus:ring-brand" 
                                            checked={selectedRecs.some(r => r.issue === rec.issue)}
                                            onChange={() => handleToggleRec(rec)} 
                                        />
                                        <div className="w-full flex justify-between md:items-start flex-col md:flex-row gap-4">
                                            <div className="space-y-2">
                                                <h5 className="text-xs font-black text-gray-800">Content Improvement</h5>
                                                <p className="text-xs text-gray-600"><strong>Issue:</strong> {rec.issue}</p>
                                                <p className="text-xs text-gray-600"><strong>Solution:</strong> {rec.solution}</p>
                                            </div>
                                            <div className="flex flex-wrap gap-2 shrink-0 md:justify-end">
                                                <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide ${rec.impact === 'High' ? 'bg-orange-100 text-orange-700' : rec.impact === 'Medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'}`}>
                                                    {rec.impact}
                                                </span>
                                                {rec.tags && rec.tags.map((tag, tIdx) => (
                                                    <span key={tIdx} className="px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide bg-blue-50 text-blue-600 border border-blue-100">
                                                        {tag}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {(!analysisResult.recommendations || analysisResult.recommendations.length === 0) && (
                                    <p className="text-sm text-gray-500 text-center py-4">No AI recommendations identified.</p>
                                )}
                            </div>
                            
                            <div className="p-4 border-t border-gray-200 bg-white rounded-b-xl flex justify-center">
                                <Button 
                                    onClick={handleOptimizeWithAI} 
                                    disabled={isOptimizing}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-2 rounded-lg flex items-center gap-2 shadow-sm disabled:opacity-50"
                                >
                                    {isOptimizing ? 'Optimizing...' : (
                                        <>
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                            `Optimize with AI (${selectedRecs.length})`
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex justify-end mt-8 gap-4">
                <Button variant="outline" size="lg" onClick={() => setCurrentStep(1)} className="px-8 font-bold border-2">Edit Manually</Button>
                <button onClick={() => { setCurrentStep(4); handleRecompile(); }} className="px-8 py-4 rounded-xl font-bold bg-gray-800 text-white hover:bg-black transition-colors flex items-center gap-2">
                    Next: Preview & Download →
                </button>
            </div>
        </div>
    );
'''

# small fix: replace template literal quotes for javascript
new_step3 = new_step3.replace('`Optimize with AI (${selectedRecs.length})`', 'Optimize with AI ({selectedRecs.length})')

content = content[:start_idx] + new_step3 + content[end_idx:]

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("UI state rewrite applied successfully.")
