import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getRunDetails } from '../services/api';
import Toast from '../components/Toast';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export default function OptimizationResults() {
    const navigate = useNavigate();
    const { id } = useParams();
    const [coverLetterCopied, setCoverLetterCopied] = useState(false);
    const [resultsData, setResultsData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [latexCode, setLatexCode] = useState('');
    const [compiledPdfUrl, setCompiledPdfUrl] = useState(null);
    const [isCompiling, setIsCompiling] = useState(false);
    const [copyButtonText, setCopyButtonText] = useState('Copy');
    const [toast, setToast] = useState(null);
    const hasAutoCompiled = useRef(false);

    useEffect(() => {
        return () => {
            if (compiledPdfUrl) {
                window.URL.revokeObjectURL(compiledPdfUrl);
            }
        };
    }, [compiledPdfUrl]);

    useEffect(() => {
        const fetchRunDetails = async () => {
            try {
                if (!id) return;
                const data = await getRunDetails(id);

                // Check if optimization was rejected due to poor fit
                if (data.final_status === 'rejected_poor_fit' || data.fit_decision === 'poor_fit') {
                    setError({
                        type: 'poor_fit',
                        reason: data.fit_reason || 'Your profile does not match the job requirements sufficiently.',
                        score: Math.round(data.ats_score_before || 0)
                    });
                    setLoading(false);
                    return;
                }

                const plan = data.improvement_plan || {};
                const planChanges = Array.isArray(plan)
                    ? plan.map((change, index) => ({
                        id: index + 1,
                        title: change.area || 'Improvement',
                        description: change.suggestion || change.description || '',
                        reason: change.reason || 'To improve ATS score'
                    }))
                    : (plan.priority_changes || []).map((change, index) => ({
                        id: index + 1,
                        title: `Change ${index + 1}`,
                        description: typeof change === 'string' ? change : (change.suggestion || change.description || ''),
                        reason: plan.reasoning || 'To improve ATS score'
                    }));

                const reqs = data.job_requirements || {};
                const analysis = data.resume_analysis || {};

                const rawHistory = data.score_history || [];
                const scoreProgression = rawHistory.length >= 2
                    ? rawHistory.map(s => Math.round(s))
                    : [
                        Math.round(data.ats_score_before || 0),
                        Math.round(data.ats_score_after || 0)
                    ];

                const transformedData = {
                    date: new Date(data.created_at).toLocaleDateString(),
                    originalScore: Math.round(data.ats_score_before || 0),
                    optimizedScore: Math.round(data.ats_score_after || 0),
                    improvement: Math.round(data.improvement_delta || 0),
                    iterations: data.iteration_count || 1,
                    scoreProgression,
                    jobRequirements: {
                        mustHave: reqs.required_skills || [],
                        niceToHave: reqs.preferred_skills || [],
                        keywords: reqs.key_keywords || [],
                        seniorityLevel: reqs.experience_years
                            ? `${reqs.experience_years}+ years`
                            : 'Not specified'
                    },
                    resumeAnalysis: {
                        skillsPresent: analysis.strengths || [],
                        skillsMissing: analysis.missing_keywords || [],
                        strongSections: analysis.suggestions || [],
                        weakSections: analysis.weaknesses || []
                    },
                    changes: planChanges,
                    coverLetter: data.cover_letter || "Cover letter not available for this run.",
                    modifiedResume: data.modified_resume || ''
                };

                setResultsData(transformedData);

                if (data.modified_resume) {
                    setLatexCode(data.modified_resume);
                }
            } catch (err) {
                console.error("Failed to fetch run details:", err);
                setError("Failed to load optimization results.");
            } finally {
                setLoading(false);
            }
        };

        fetchRunDetails();
    }, [id]);

    // auto-compile when latex code is first loaded from the API
    useEffect(() => {
        if (latexCode && !hasAutoCompiled.current) {
            hasAutoCompiled.current = true;
            compileLatex(latexCode);
        }
    }, [latexCode, compileLatex]);

    const compileLatex = useCallback(async (code) => {
        setIsCompiling(true);
        try {
            const response = await fetch(`${API_BASE_URL}/api/latex/compile`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ latex_code: code }),
            });

            if (!response.ok) {
                throw new Error('LaTeX compilation failed');
            }

            const blob = await response.blob();

            if (compiledPdfUrl) {
                window.URL.revokeObjectURL(compiledPdfUrl);
            }

            setCompiledPdfUrl(window.URL.createObjectURL(blob));
        } catch (err) {
            setToast({ message: `Failed to compile LaTeX: ${err.message}`, type: 'error' });
        } finally {
            setIsCompiling(false);
        }
    }, [compiledPdfUrl]);

    const handleRecompile = () => compileLatex(latexCode);

    const handleDownloadPdf = async () => {
        let url = compiledPdfUrl;

        // if not compiled yet, compile first then download
        if (!url) {
            setIsCompiling(true);
            try {
                const response = await fetch(`${API_BASE_URL}/api/latex/compile`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ latex_code: latexCode }),
                });
                if (!response.ok) throw new Error('Compilation failed');
                const blob = await response.blob();
                url = window.URL.createObjectURL(blob);
                setCompiledPdfUrl(url);
            } catch (err) {
                setToast({ message: `Failed to compile PDF: ${err.message}`, type: 'error' });
                setIsCompiling(false);
                return;
            } finally {
                setIsCompiling(false);
            }
        }

        const a = document.createElement('a');
        a.href = url;
        a.download = 'optimized_resume.pdf';
        a.click();
    };

    const handleCopyLatex = () => {
        navigator.clipboard.writeText(latexCode);
        setCopyButtonText('Copied!');
        setTimeout(() => setCopyButtonText('Copy'), 2000);
    };

    const handleCopyCoverLetter = () => {
        if (!resultsData?.coverLetter) return;
        navigator.clipboard.writeText(resultsData.coverLetter);
        setCoverLetterCopied(true);
        setTimeout(() => setCoverLetterCopied(false), 2000);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#f5f5f5] p-8 flex items-center justify-center">
                <div className="w-16 h-16 relative">
                    <div className="absolute inset-0 border-4 border-[#606c38]/10 rounded-full" />
                    <div className="absolute inset-0 border-4 border-[#606c38] border-t-transparent rounded-full animate-spin" />
                </div>
            </div>
        );
    }

    if (error || !resultsData) {
        // Special handling for poor_fit rejection
        if (error && typeof error === 'object' && error.type === 'poor_fit') {
            return (
                <div className="min-h-screen bg-[#f5f5f5] p-8">
                    <div className="max-w-3xl mx-auto">
                        <div className="bg-white border border-neutral-200 rounded-[2.5rem] p-12 shadow-2xl shadow-neutral-200/50 relative overflow-hidden text-center">
                            <div className="absolute top-0 left-0 w-full h-2 bg-[#606c38]/20" />

                            {/* Warning Icon */}
                            <div className="flex items-center justify-center mb-10">
                                <div className="w-24 h-24 bg-[#606c38]/10 rounded-3xl flex items-center justify-center">
                                    <svg className="w-12 h-12 text-[#606c38]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                </div>
                            </div>

                            {/* Title */}
                            <h2 className="text-4xl font-black text-neutral-900 mb-4 italic tracking-tighter uppercase font-black">
                                Optimization Skipped
                            </h2>

                            {/* Initial Score */}
                            <div className="mb-10">
                                <p className="text-neutral-400 text-[10px] font-black uppercase tracking-widest mb-2">Initial ATS Impact</p>
                                <p className="text-7xl font-black text-neutral-900 italic tracking-tighter">{error.score}</p>
                            </div>

                            {/* Reason */}
                            <div className="bg-neutral-50 border border-neutral-100 rounded-3xl p-8 mb-8 text-left">
                                <h3 className="text-[10px] font-black uppercase tracking-widest text-[#606c38] mb-4">Analysis Reasoning</h3>
                                <p className="text-neutral-900 font-medium leading-relaxed">{error.reason}</p>
                            </div>

                            {/* Suggestions */}
                            <div className="bg-white border border-neutral-100 rounded-3xl p-8 mb-10 text-left">
                                <h3 className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-6">Suggestions</h3>
                                <ul className="space-y-4">
                                    {[
                                        "Try applying for positions that better match your experience and skills",
                                        "Consider upskilling in the required technologies before applying",
                                        "Look for roles that emphasize your current strengths"
                                    ].map((sug, i) => (
                                        <li key={i} className="flex items-start gap-4">
                                            <div className="w-5 h-5 bg-[#606c38]/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                                <div className="w-1.5 h-1.5 bg-[#606c38] rounded-full" />
                                            </div>
                                            <span className="text-neutral-600 text-sm font-medium">{sug}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-4">
                                <button
                                    onClick={() => navigate('/new-optimization')}
                                    className="flex-1 py-4 bg-[#606c38] text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-olive-500/20 hover:bg-[#4a532b] transition-all active:scale-95"
                                >
                                    New Optimization
                                </button>
                                <button
                                    onClick={() => navigate('/history')}
                                    className="flex-1 py-4 bg-neutral-100 text-neutral-500 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-neutral-200 transition-all active:scale-95"
                                >
                                    View History
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            );
        }

        // Generic error display
        return (
            <div className="min-h-screen bg-[#f5f5f5] p-8 flex items-center justify-center">
                <div className="text-center">
                    <div className="text-neutral-400 text-[10px] font-black uppercase tracking-widest mb-6">{typeof error === 'string' ? error : "Core Data Not Found"}</div>
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="px-8 py-3 bg-neutral-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-black transition-all active:scale-95"
                    >
                        Back to Hub
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#f5f5f5] text-neutral-900 p-8">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex items-start justify-between mb-12">
                    <div>
                        <h1 className="text-4xl font-black text-neutral-900 mb-2 italic tracking-tighter uppercase font-black">Optimization Results</h1>
                        <p className="text-neutral-400 text-[10px] font-black uppercase tracking-widest">{resultsData.date}</p>
                    </div>
                    <button
                        onClick={handleDownloadPdf}
                        disabled={!latexCode || isCompiling}
                        className={`px-10 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl transition-all flex items-center gap-3 ${latexCode && !isCompiling
                            ? 'bg-[#606c38] text-white hover:bg-[#4a532b] shadow-olive-500/20 active:scale-95'
                            : 'bg-neutral-100 text-neutral-300 cursor-not-allowed shadow-none'
                            }`}
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        <span>{isCompiling ? 'Updating...' : 'Download PDF'}</span>
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column - Main Content */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Score Section */}
                        <div className="bg-white border border-neutral-200 rounded-[2.5rem] p-10 shadow-xl shadow-neutral-200/50 relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-1 bg-[#606c38]/10" />
                            <div className="grid grid-cols-3 gap-8 mb-10">
                                <div className="text-center">
                                    <div className="text-5xl font-black text-neutral-900 mb-2 italic tracking-tighter">{resultsData.originalScore}</div>
                                    <div className="text-neutral-400 text-[9px] font-black uppercase tracking-widest">Initial Reach</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-5xl font-black text-[#606c38] mb-2 italic tracking-tighter">+{resultsData.improvement}</div>
                                    <div className="text-neutral-400 text-[9px] font-black uppercase tracking-widest">Yield Delta</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-5xl font-black text-neutral-900 mb-2 italic tracking-tighter underline decoration-[#606c38] decoration-4 underline-offset-8">{resultsData.optimizedScore}</div>
                                    <div className="text-neutral-400 text-[9px] font-black uppercase tracking-widest">Final Score</div>
                                </div>
                            </div>
                            <div className="text-center mb-10">
                                <p className="text-neutral-300 text-[10px] font-black uppercase tracking-[0.3em]">{resultsData.iterations} Alignment Iterations</p>
                            </div>

                            {/* Score Progression */}
                            <div>
                                <h3 className="text-neutral-900 font-black text-[10px] uppercase tracking-widest mb-4 italic">Score Progression</h3>
                                <div className="flex items-center gap-6">
                                    {resultsData.scoreProgression.map((score, index) => (
                                        <React.Fragment key={index}>
                                            <div className={`flex-1 py-4 px-6 rounded-2xl text-center font-black italic tracking-tighter text-xl transition-all ${index === resultsData.scoreProgression.length - 1
                                                ? 'bg-[#606c38] text-white shadow-lg shadow-olive-500/20 scale-105'
                                                : 'bg-neutral-50 text-neutral-400 border border-neutral-100'
                                                }`}>
                                                {score}
                                            </div>
                                            {index < resultsData.scoreProgression.length - 1 && (
                                                <svg className="w-5 h-5 text-neutral-200 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                                </svg>
                                            )}
                                        </React.Fragment>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Job Requirements Analysis */}
                        <div className="bg-white border border-neutral-200 rounded-[2.5rem] p-10 shadow-xl shadow-neutral-200/50">
                            <h2 className="text-2xl font-black text-neutral-900 mb-2 italic tracking-tighter uppercase">Job Requirements</h2>
                            <p className="text-neutral-400 text-[10px] font-black uppercase tracking-widest mb-8">Extracted from job description</p>

                            <div className="space-y-8">
                                <div key="must-have">
                                    <h3 className="text-neutral-900 font-black text-[10px] uppercase tracking-widest mb-4 italic">Key Requirements (Must Have)</h3>
                                    <div className="flex flex-wrap gap-3">
                                        {resultsData.jobRequirements.mustHave?.map((skill) => (
                                            <span key={skill} className="px-5 py-2 bg-neutral-900 text-white rounded-full text-[10px] font-black uppercase tracking-widest">
                                                {skill}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                <div key="nice-to-have">
                                    <h3 className="text-neutral-900 font-black text-[10px] uppercase tracking-widest mb-4 italic">Preferred Skills (Nice to Have)</h3>
                                    <div className="flex flex-wrap gap-3">
                                        {resultsData.jobRequirements.niceToHave?.map((skill) => (
                                            <span key={skill} className="px-5 py-2 bg-neutral-100 text-neutral-500 border border-neutral-200 rounded-full text-[10px] font-black uppercase tracking-widest">
                                                {skill}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                <div key="keywords">
                                    <h3 className="text-neutral-900 font-black text-[10px] uppercase tracking-widest mb-4 italic">Core Keywords</h3>
                                    <div className="flex flex-wrap gap-3">
                                        {resultsData.jobRequirements.keywords?.map((keyword) => (
                                            <span key={keyword} className="px-5 py-2 bg-[#606c38]/10 text-[#606c38] rounded-full text-[10px] font-black uppercase tracking-widest">
                                                {keyword}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-neutral-100">
                                    <p className="text-neutral-400 text-[10px] font-black uppercase tracking-widest">
                                        Experience Level: <span className="text-neutral-900 ml-2">{resultsData.jobRequirements.seniorityLevel}</span>
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Resume Analysis */}
                        <div className="bg-white border border-neutral-200 rounded-[2.5rem] p-10 shadow-xl shadow-neutral-200/50">
                            <h2 className="text-2xl font-black text-neutral-900 mb-2 italic tracking-tighter uppercase">Resume Analysis</h2>
                            <p className="text-neutral-400 text-[10px] font-black uppercase tracking-widest mb-8">Internal profile audit</p>

                            <div className="grid grid-cols-2 gap-10">
                                <div>
                                    <h3 className="text-[#606c38] font-black text-[10px] uppercase tracking-widest mb-6 italic">Strong Areas (Present)</h3>
                                    <ul className="space-y-4">
                                        {resultsData.resumeAnalysis.skillsPresent?.map((skill) => (
                                            <li key={skill} className="text-neutral-900 text-sm font-medium flex items-center gap-4">
                                                <div className="w-2 h-2 bg-[#606c38] rounded-full shadow-[0_0_8px_rgba(96,108,56,0.3)]" />
                                                {skill}
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                <div>
                                    <h3 className="text-red-900 font-black text-[10px] uppercase tracking-widest mb-6 italic">Missing Keywords</h3>
                                    <ul className="space-y-4">
                                        {resultsData.resumeAnalysis.skillsMissing?.map((skill) => (
                                            <li key={skill} className="text-neutral-400 text-sm font-medium flex items-center gap-4">
                                                <div className="w-2 h-2 bg-neutral-200 rounded-full" />
                                                {skill}
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                <div>
                                    <h3 className="text-neutral-900 font-black text-[10px] uppercase tracking-widest mb-6 italic">Proficient Sections</h3>
                                    <ul className="space-y-4">
                                        {resultsData.resumeAnalysis.strongSections?.map((section) => (
                                            <li key={section} className="text-neutral-600 text-sm font-medium flex items-center gap-4">
                                                <div className="w-4 h-[2px] bg-neutral-200" />
                                                {section}
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                <div>
                                    <h3 className="text-neutral-900 font-black text-[10px] uppercase tracking-widest mb-6 italic">Areas to Improve</h3>
                                    <ul className="space-y-4">
                                        {resultsData.resumeAnalysis.weakSections?.map((section) => (
                                            <li key={section} className="text-neutral-600 text-sm font-medium flex items-center gap-4">
                                                <div className="w-4 h-[2px] bg-neutral-200" />
                                                {section}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </div>

                        {/* Changes Applied */}
                        <div className="bg-white border border-neutral-200 rounded-[2.5rem] p-10 shadow-xl shadow-neutral-200/50">
                            <h2 className="text-2xl font-black text-neutral-900 mb-2 italic tracking-tighter uppercase">Optimization Steps</h2>
                            <p className="text-neutral-400 text-[10px] font-black uppercase tracking-widest mb-8">Adjustments made to improve results</p>

                            <div className="space-y-6">
                                {resultsData.changes.map((change) => (
                                    <div key={change.id} className="bg-neutral-50 rounded-3xl p-8 border border-neutral-100 group transition-all hover:bg-white hover:shadow-xl hover:shadow-neutral-200/50">
                                        <div className="flex items-start gap-6">
                                            <div className="w-10 h-10 bg-[#606c38] rounded-xl flex items-center justify-center text-white font-black italic tracking-tighter text-lg flex-shrink-0 shadow-lg shadow-olive-500/20 group-hover:scale-110 transition-transform">
                                                {change.id}
                                            </div>
                                            <div className="flex-1">
                                                <h3 className="text-neutral-900 font-black text-lg mb-2 italic tracking-tighter uppercase">{change.title}</h3>
                                                <p className="text-neutral-600 text-sm leading-relaxed mb-4">{change.description}</p>
                                                <div className="flex items-center gap-3">
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-neutral-300 italic">Reasoning:</span>
                                                    <p className="text-neutral-400 text-[10px] font-black uppercase tracking-widest">{change.reason}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Optimized Resume - LaTeX Editor + PDF Preview */}
                        {latexCode && (
                            <div className="bg-white border border-neutral-200 rounded-[2.5rem] p-10 shadow-xl shadow-neutral-200/50">
                                <h2 className="text-2xl font-black text-neutral-900 mb-2 italic tracking-tighter uppercase">Final Optimized Resume</h2>
                                <p className="text-neutral-400 text-[10px] font-black uppercase tracking-widest mb-8">LaTeX source and visual rendering</p>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                    {/* LaTeX Editor */}
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center px-1">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 italic">Latex Code</label>
                                            <button
                                                onClick={handleCopyLatex}
                                                className="text-[#606c38] hover:text-[#4a532b] text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-colors"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                </svg>
                                                {copyButtonText}
                                            </button>
                                        </div>
                                        <textarea
                                            value={latexCode}
                                            onChange={(e) => setLatexCode(e.target.value)}
                                            className="w-full h-[600px] p-8 bg-neutral-50 border border-neutral-100 rounded-3xl text-neutral-900 focus:outline-none focus:border-[#606c38]/30 transition-all font-mono text-sm resize-none shadow-inner"
                                        />
                                    </div>

                                    {/* PDF Preview */}
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center px-1">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 italic">Visual Preview</label>
                                            <button
                                                onClick={handleRecompile}
                                                disabled={isCompiling}
                                                className={`px-5 py-2 rounded-full text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${isCompiling
                                                    ? 'bg-neutral-100 text-neutral-300 cursor-not-allowed'
                                                    : 'bg-neutral-900 hover:bg-black text-white shadow-lg shadow-black/10'
                                                    }`}
                                            >
                                                {isCompiling ? (
                                                    <>
                                                        <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                        <span>Updating...</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                                        </svg>
                                                        <span>Refresh View</span>
                                                    </>
                                                )}
                                            </button>
                                        </div>

                                        <div className="relative h-[600px] bg-neutral-50 border border-neutral-100 rounded-3xl overflow-hidden shadow-inner">
                                            {compiledPdfUrl ? (
                                                <iframe
                                                    src={compiledPdfUrl}
                                                    className="w-full h-full"
                                                    title="PDF Preview"
                                                />
                                            ) : (
                                                <div className="flex items-center justify-center h-full text-neutral-400">
                                                    {isCompiling ? (
                                                        <div className="text-center">
                                                            <div className="w-16 h-16 mx-auto mb-6 relative">
                                                                <div className="absolute inset-0 border-4 border-[#606c38]/10 rounded-full" />
                                                                <div className="absolute inset-0 border-4 border-[#606c38] border-t-transparent rounded-full animate-spin" />
                                                            </div>
                                                            <p className="text-[10px] font-black uppercase tracking-widest">Generating PDF</p>
                                                        </div>
                                                    ) : (
                                                        <div className="text-center px-8">
                                                            <svg className="w-16 h-16 mx-auto mb-6 text-neutral-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                                            </svg>
                                                            <p className="text-[10px] font-black uppercase tracking-widest leading-relaxed">Synchronization Required. <br />Refresh view above.</p>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Download button for this section */}
                                <div className="flex justify-end mt-10">
                                    <button
                                        onClick={handleDownloadPdf}
                                        disabled={!compiledPdfUrl || isCompiling}
                                        className={`px-10 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all flex items-center gap-3 ${compiledPdfUrl && !isCompiling
                                            ? 'bg-[#606c38] text-white hover:bg-[#4a532b] shadow-xl shadow-olive-500/20 active:scale-95'
                                            : 'bg-neutral-100 text-neutral-300 cursor-not-allowed shadow-none'
                                            }`}
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                        </svg>
                                        <span>Download Final PDF</span>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right Column - Cover Letter */}
                    <div className="lg:col-span-1">
                        <div className="bg-white border border-neutral-200 rounded-[2.5rem] p-10 sticky top-8 shadow-xl shadow-neutral-200/50">
                            <h2 className="text-2xl font-black text-neutral-900 mb-2 italic tracking-tighter uppercase font-black">Cover Letter</h2>
                            <p className="text-neutral-400 text-[10px] font-black uppercase tracking-widest mb-8">System generated cover letter</p>

                            <div className="bg-neutral-50 rounded-3xl p-8 mb-8 max-h-[500px] overflow-y-auto border border-neutral-100 shadow-inner">
                                <pre className="text-neutral-600 text-sm whitespace-pre-wrap font-medium leading-relaxed">
                                    {resultsData.coverLetter}
                                </pre>
                            </div>

                            <div className="space-y-4">
                                <button
                                    onClick={handleCopyCoverLetter}
                                    className="w-full py-4 bg-neutral-900 text-white font-black text-[10px] uppercase tracking-[0.2em] rounded-2xl transition-all flex items-center justify-center gap-3 hover:bg-black active:scale-95"
                                >
                                    {coverLetterCopied ? (
                                        <>
                                            <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                            </svg>
                                            <span className="text-green-400">Copied!</span>
                                        </>
                                    ) : (
                                        <>
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                            </svg>
                                            <span>Copy Text</span>
                                        </>
                                    )}
                                </button>

                                <button className="w-full py-4 bg-neutral-100 text-neutral-500 font-black text-[10px] uppercase tracking-[0.2em] rounded-2xl transition-all flex items-center justify-center gap-3 hover:bg-neutral-200 active:scale-95">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                    </svg>
                                    <span>Download Source</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bottom Actions */}
                <div className="flex gap-6 mt-16">
                    <button
                        onClick={() => navigate('/new-optimization')}
                        className="px-12 py-5 bg-[#606c38] text-white rounded-[2rem] font-black text-[10px] uppercase tracking-[0.25em] shadow-2xl shadow-olive-500/30 hover:bg-[#4a532b] transition-all hover:scale-105 active:scale-95 flex items-center gap-4"
                    >
                        <span>New Optimization</span>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
                        </svg>
                    </button>
                    <button
                        onClick={() => navigate('/history')}
                        className="px-12 py-5 bg-white border border-neutral-200 text-neutral-400 hover:text-neutral-900 rounded-[2rem] font-black text-[10px] uppercase tracking-[0.25em] shadow-xl shadow-neutral-200/50 transition-all hover:bg-neutral-50 active:scale-95"
                    >
                        Return to History
                    </button>
                </div>
            </div>
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </div>
    );
}
