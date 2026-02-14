import React, { useState, useEffect, useRef } from 'react';
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
    }, [latexCode]);

    const compileLatex = async (code) => {
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
    };

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
            <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-8 flex items-center justify-center">
                <div className="text-white text-xl">Loading results...</div>
            </div>
        );
    }

    if (error || !resultsData) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-8 flex items-center justify-center">
                <div className="text-center">
                    <div className="text-red-400 text-xl mb-4">{error || "Run not found"}</div>
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="px-6 py-3 bg-slate-800 text-white rounded-lg hover:bg-slate-700"
                    >
                        Back to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-8">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex items-start justify-between mb-8">
                    <div>
                        <h1 className="text-4xl font-bold text-white mb-2">Optimization Results</h1>
                        <p className="text-slate-400">{resultsData.date}</p>
                    </div>
                    <button
                        onClick={handleDownloadPdf}
                        disabled={!latexCode || isCompiling}
                        className={`px-6 py-3 rounded-lg font-semibold transition-all flex items-center gap-2 ${latexCode && !isCompiling
                                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:shadow-lg hover:shadow-cyan-500/50'
                                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                            }`}
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        <span>{isCompiling ? 'Compiling...' : 'Download PDF'}</span>
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column - Main Content */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Score Section */}
                        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                            <div className="grid grid-cols-3 gap-6 mb-6">
                                <div className="text-center">
                                    <div className="text-5xl font-bold text-white mb-2">{resultsData.originalScore}</div>
                                    <div className="text-slate-400 text-sm">Original Score</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-5xl font-bold text-green-400 mb-2">+{resultsData.improvement}</div>
                                    <div className="text-slate-400 text-sm">points</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-5xl font-bold text-cyan-400 mb-2">{resultsData.optimizedScore}</div>
                                    <div className="text-slate-400 text-sm">Optimized Score</div>
                                </div>
                            </div>
                            <div className="text-center mb-4">
                                <p className="text-slate-500 text-sm">{resultsData.iterations} iterations</p>
                            </div>

                            {/* Score Progression */}
                            <div>
                                <h3 className="text-white font-semibold mb-3">Score progression</h3>
                                <div className="flex items-center gap-4">
                                    {resultsData.scoreProgression.map((score, index) => (
                                        <React.Fragment key={index}>
                                            <div className={`flex-1 py-3 px-4 rounded-lg text-center font-bold ${index === resultsData.scoreProgression.length - 1
                                                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                                                : 'bg-slate-800 text-white'
                                                }`}>
                                                {score}
                                            </div>
                                            {index < resultsData.scoreProgression.length - 1 && (
                                                <svg className="w-6 h-6 text-slate-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                                </svg>
                                            )}
                                        </React.Fragment>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Job Requirements Analysis */}
                        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                            <h2 className="text-xl font-bold text-white mb-2">Job Requirements Analysis</h2>
                            <p className="text-slate-500 text-sm mb-4">Extracted from job description</p>

                            <div className="space-y-4">
                                <div>
                                    <h3 className="text-white font-semibold mb-2">Must Have</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {resultsData.jobRequirements.mustHave?.map((skill) => (
                                            <span key={skill} className="px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-sm">
                                                {skill}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <h3 className="text-white font-semibold mb-2">Nice to Have</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {resultsData.jobRequirements.niceToHave?.map((skill) => (
                                            <span key={skill} className="px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-sm">
                                                {skill}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <h3 className="text-white font-semibold mb-2">Keywords</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {resultsData.jobRequirements.keywords?.map((keyword) => (
                                            <span key={keyword} className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-sm">
                                                {keyword}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <p className="text-slate-400 text-sm">
                                        <span className="font-semibold">Seniority Level:</span> {resultsData.jobRequirements.seniorityLevel}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Resume Analysis */}
                        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                            <h2 className="text-xl font-bold text-white mb-2">Resume Analysis</h2>
                            <p className="text-slate-500 text-sm mb-4">Gaps and strengths identified</p>

                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <h3 className="text-green-400 font-semibold mb-2">Skills Present</h3>
                                    <ul className="space-y-1">
                                        {resultsData.resumeAnalysis.skillsPresent?.map((skill) => (
                                            <li key={skill} className="text-slate-300 text-sm flex items-center gap-2">
                                                <div className="w-1.5 h-1.5 bg-green-400 rounded-full" />
                                                {skill}
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                <div>
                                    <h3 className="text-red-400 font-semibold mb-2">Skills Missing</h3>
                                    <ul className="space-y-1">
                                        {resultsData.resumeAnalysis.skillsMissing?.map((skill) => (
                                            <li key={skill} className="text-slate-300 text-sm flex items-center gap-2">
                                                <div className="w-1.5 h-1.5 bg-red-400 rounded-full" />
                                                {skill}
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                <div>
                                    <h3 className="text-white font-semibold mb-2">Strong Sections</h3>
                                    <ul className="space-y-1">
                                        {resultsData.resumeAnalysis.strongSections?.map((section) => (
                                            <li key={section} className="text-slate-300 text-sm">{section}</li>
                                        ))}
                                    </ul>
                                </div>

                                <div>
                                    <h3 className="text-white font-semibold mb-2">Weak Sections</h3>
                                    <ul className="space-y-1">
                                        {resultsData.resumeAnalysis.weakSections?.map((section) => (
                                            <li key={section} className="text-slate-300 text-sm">{section}</li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </div>

                        {/* Changes Applied */}
                        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                            <h2 className="text-xl font-bold text-white mb-2">Changes Applied</h2>
                            <p className="text-slate-500 text-sm mb-4">Modifications made to improve your resume score</p>

                            <div className="space-y-3">
                                {resultsData.changes.map((change) => (
                                    <div key={change.id} className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                                        <div className="flex items-start gap-3">
                                            <div className="w-8 h-8 bg-cyan-500/20 rounded-full flex items-center justify-center text-cyan-400 font-semibold text-sm flex-shrink-0">
                                                {change.id}
                                            </div>
                                            <div className="flex-1">
                                                <h3 className="text-white font-semibold mb-1">{change.title}</h3>
                                                <p className="text-slate-300 text-sm mb-2">{change.description}</p>
                                                <p className="text-slate-500 text-xs">
                                                    <span className="font-semibold">Reason:</span> {change.reason}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Optimized Resume - LaTeX Editor + PDF Preview */}
                        {latexCode && (
                            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                                <h2 className="text-xl font-bold text-white mb-2">Optimized Resume</h2>
                                <p className="text-slate-500 text-sm mb-4">View, edit, and recompile your optimized LaTeX resume</p>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    {/* LaTeX Editor */}
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center">
                                            <label className="text-white font-medium">LaTeX Code (editable)</label>
                                            <button
                                                onClick={handleCopyLatex}
                                                className="text-cyan-400 hover:text-cyan-300 text-sm flex items-center gap-1"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                </svg>
                                                {copyButtonText}
                                            </button>
                                        </div>
                                        <textarea
                                            value={latexCode}
                                            onChange={(e) => setLatexCode(e.target.value)}
                                            className="w-full h-[600px] p-4 bg-slate-800/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all font-mono text-sm resize-none"
                                        />
                                    </div>

                                    {/* PDF Preview */}
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center">
                                            <label className="text-white font-medium">PDF Preview</label>
                                            <button
                                                onClick={handleRecompile}
                                                disabled={isCompiling}
                                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${isCompiling
                                                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                                                    : 'bg-cyan-600 hover:bg-cyan-700 text-white hover:shadow-lg'
                                                    }`}
                                            >
                                                {isCompiling ? (
                                                    <>
                                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                        <span>Compiling...</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                                        </svg>
                                                        <span>Recompile</span>
                                                    </>
                                                )}
                                            </button>
                                        </div>

                                        <div className="relative h-[600px] bg-slate-800/50 border border-slate-700 rounded-lg overflow-hidden">
                                            {compiledPdfUrl ? (
                                                <iframe
                                                    src={compiledPdfUrl}
                                                    className="w-full h-full"
                                                    title="PDF Preview"
                                                />
                                            ) : (
                                                <div className="flex items-center justify-center h-full text-slate-500">
                                                    {isCompiling ? (
                                                        <div className="text-center">
                                                            <div className="w-16 h-16 mx-auto mb-4 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                                                            <p>Compiling PDF...</p>
                                                        </div>
                                                    ) : (
                                                        <div className="text-center">
                                                            <svg className="w-16 h-16 mx-auto mb-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                                            </svg>
                                                            <p>Click "Recompile" to generate PDF</p>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Download button for this section */}
                                <div className="flex justify-end mt-4">
                                    <button
                                        onClick={handleDownloadPdf}
                                        disabled={!compiledPdfUrl || isCompiling}
                                        className={`px-8 py-3 rounded-lg font-semibold transition-all flex items-center gap-2 ${compiledPdfUrl && !isCompiling
                                                ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:shadow-lg hover:shadow-green-500/50 hover:scale-105'
                                                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                                            }`}
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                        </svg>
                                        <span>Download PDF</span>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right Column - Cover Letter */}
                    <div className="lg:col-span-1">
                        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 sticky top-8">
                            <h2 className="text-xl font-bold text-white mb-2">Generated Cover Letter</h2>
                            <p className="text-slate-500 text-sm mb-4">Tailored cover letter based on your optimized resume</p>

                            <div className="bg-slate-800/50 rounded-lg p-4 mb-4 max-h-96 overflow-y-auto">
                                <pre className="text-slate-300 text-sm whitespace-pre-wrap font-sans leading-relaxed">
                                    {resultsData.coverLetter}
                                </pre>
                            </div>

                            <div className="space-y-2">
                                <button
                                    onClick={handleCopyCoverLetter}
                                    className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-lg transition-all flex items-center justify-center gap-2"
                                >
                                    {coverLetterCopied ? (
                                        <>
                                            <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                            <span className="text-green-400">Copied!</span>
                                        </>
                                    ) : (
                                        <>
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                            </svg>
                                            <span>Copy to Clipboard</span>
                                        </>
                                    )}
                                </button>

                                <button className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-lg transition-all flex items-center justify-center gap-2">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                    </svg>
                                    <span>Download</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bottom Actions */}
                <div className="flex gap-4 mt-8">
                    <button
                        onClick={() => navigate('/new-optimization')}
                        className="px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg font-semibold hover:shadow-lg hover:shadow-cyan-500/50 transition-all"
                    >
                        New Optimization
                    </button>
                    <button
                        onClick={() => navigate('/history')}
                        className="px-8 py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-semibold transition-all"
                    >
                        Back to History
                    </button>
                </div>
            </div>
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </div>
    );
}
