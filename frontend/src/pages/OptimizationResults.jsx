import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getRunDetails, compileLatex as compileLatexApi } from '../services/api';
import Toast from '../components/Toast';
import { Skeleton } from '../components/ui/skeleton';
import PdfViewer from '../components/PdfViewer';
import VisualResumeEditor from '../components/VisualResumeEditor';

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
    const [toast, setToast] = useState(null);
    const hasAutoCompiled = useRef(false);
    const [latexCompilationStatus, setLatexCompilationStatus] = useState(null);

    const [warningDismissed, setWarningDismissed] = useState(false);

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

                // Build optimization steps from decision_log (real agent steps) or fall back to improvement_plan
                const decisionLog = data.decision_log || [];
                let optimizationSteps;

                if (decisionLog.length > 0) {
                    optimizationSteps = decisionLog.map((entry, index) => ({
                        id: index + 1,
                        title: entry.node || entry.label || `Step ${index + 1}`,
                        description: entry.detail || entry.summary || '',
                        reason: entry.reason || '',
                    }));
                } else {
                    const plan = data.improvement_plan || {};
                    optimizationSteps = Array.isArray(plan)
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
                }

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
                    date: data.created_at ? new Date(data.created_at).toLocaleDateString() : 'Unknown date',
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
                    changes: optimizationSteps,
                    coverLetter: data.cover_letter || "Cover letter not available for this run.",
                    modifiedResume: data.modified_resume || ''
                };

                setResultsData(transformedData);

                if (data.modified_resume) {
                    setLatexCode(data.modified_resume);
                }
                setLatexCompilationStatus(data.latex_compilation_status || null);
            } catch (err) {
                console.error("Failed to fetch run details:", err);
                setError("Failed to load optimization results.");
            } finally {
                setLoading(false);
            }
        };

        fetchRunDetails();
    }, [id]);

    const compileLatex = useCallback(async (code) => {
        setIsCompiling(true);
        try {
            const blob = await compileLatexApi(code);

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

    // auto-compile when latex code is first loaded, but skip if backend already failed
    useEffect(() => {
        if (latexCode && !hasAutoCompiled.current && latexCompilationStatus !== 'failed') {
            hasAutoCompiled.current = true;
            compileLatex(latexCode);
        }
    }, [latexCode, compileLatex, latexCompilationStatus]);

    const handleRecompile = () => compileLatex(latexCode);

    const handleDownloadPdf = async () => {
        let url = compiledPdfUrl;

        // if not compiled yet, compile first then download
        if (!url) {
            setIsCompiling(true);
            try {
                const blob = await compileLatexApi(latexCode);
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



    const handleCopyCoverLetter = () => {
        if (!resultsData?.coverLetter) return;
        navigator.clipboard.writeText(resultsData.coverLetter);
        setCoverLetterCopied(true);
        setTimeout(() => setCoverLetterCopied(false), 2000);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-primary p-6 md:p-10">
                <div className="max-w-7xl mx-auto">
                    {/* Back button */}
                    <Skeleton className="h-10 w-32 mb-8 rounded-2xl" />

                    {/* Score header card */}
                    <div className="bg-surface border border-gray-100 rounded-[2.5rem] p-4 sm:p-8 mb-6">
                        <div className="flex flex-wrap items-center gap-4 sm:gap-8">
                            <div className="space-y-2">
                                <Skeleton className="h-3 w-28" />
                                <Skeleton className="h-20 w-24 rounded-2xl" />
                            </div>
                            <div className="flex-1 space-y-3">
                                <Skeleton className="h-5 w-48" />
                                <Skeleton className="h-4 w-64" />
                                <Skeleton className="h-4 w-40" />
                            </div>
                            <div className="space-y-2">
                                <Skeleton className="h-3 w-20" />
                                <Skeleton className="h-16 w-28 rounded-2xl" />
                            </div>
                        </div>
                    </div>

                    {/* Tab bar */}
                    <div className="flex gap-3 mb-6 flex-wrap">
                        {[160, 180, 140, 120].map((w, i) => (
                            <Skeleton key={i} className="h-10 rounded-2xl" style={{ width: w }} />
                        ))}
                    </div>

                    {/* Main content panel */}
                    <div className="bg-surface border border-gray-100 rounded-[2.5rem] p-4 sm:p-8 space-y-4">
                        <Skeleton className="h-5 w-40 mb-6" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-11/12" />
                        <Skeleton className="h-4 w-4/5" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-3/4" />
                        <div className="pt-4 space-y-3">
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-5/6" />
                            <Skeleton className="h-4 w-2/3" />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (error || !resultsData) {
        // Special handling for poor_fit rejection
        if (error && typeof error === 'object' && error.type === 'poor_fit') {
            return (
                <div className="min-h-screen bg-primary p-4 md:p-8">
                    <div className="max-w-3xl mx-auto">
                        <div className="bg-surface border border-gray-200 rounded-[2.5rem] p-12 shadow-2xl shadow-black/10 relative overflow-hidden text-center cyber-grid">
                            <div className="absolute top-0 left-0 w-full h-2 bg-brand/20" />

                            {/* Warning Icon */}
                            <div className="flex items-center justify-center mb-10">
                                <div className="w-24 h-24 bg-brand/10 rounded-3xl flex items-center justify-center">
                                    <svg className="w-12 h-12 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                </div>
                            </div>

                            {/* Title */}
                            <h2 className="text-3xl font-bold text-primary mb-4 tracking-tight">
                                Optimization Skipped
                            </h2>

                            {/* Initial Score */}
                            <div className="mb-10">
                                <p className="text-gray-500 text-xs mb-2">Initial ATS Score</p>
                                <p className="text-4xl sm:text-7xl font-bold text-primary tracking-tight text-mono">{error.score}</p>
                            </div>

                            {/* Reason */}
                            <div className="bg-secondary border border-gray-200 rounded-3xl p-4 sm:p-8 mb-8 text-left">
                                <h3 className="text-[10px] font-black uppercase tracking-widest text-brand mb-4">Analysis Reasoning</h3>
                                <p className="text-primary font-medium leading-relaxed">{error.reason}</p>
                            </div>

                            {/* Suggestions */}
                            <div className="bg-surface border border-gray-200 rounded-3xl p-4 sm:p-8 mb-10 text-left">
                                <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-6">Suggestions</h3>
                                <ul className="space-y-4">
                                    {[
                                        "Try applying for positions that better match your experience and skills",
                                        "Consider upskilling in the required technologies before applying",
                                        "Look for roles that emphasize your current strengths"
                                    ].map((sug, i) => (
                                        <li key={i} className="flex items-start gap-4">
                                            <div className="w-5 h-5 bg-brand/10 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                                                <div className="w-1.5 h-1.5 bg-brand rounded-full" />
                                            </div>
                                            <span className="text-secondary text-sm font-medium">{sug}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-4">
                                <button
                                    onClick={() => navigate('/new-optimization')}
                                    className="flex-1 py-4 bg-brand text-white rounded-2xl font-semibold text-sm tracking-wide shadow-xl shadow-brand/10 hover:bg-brand-hover transition-all active:scale-95"
                                >
                                    New Optimization
                                </button>
                                <button
                                    onClick={() => navigate('/history')}
                                    className="flex-1 py-4 bg-secondary text-gray-500 rounded-2xl font-medium text-sm hover:bg-primary hover:text-primary transition-all active:scale-95 border border-gray-200"
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
            <div className="min-h-screen bg-primary p-4 md:p-8 flex items-center justify-center">
                <div className="text-center">
                    <div className="text-gray-500 text-[10px] font-black uppercase tracking-widest mb-6">{typeof error === 'string' ? error : "Core Data Not Found"}</div>
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="px-8 py-3 bg-secondary text-primary border border-gray-200 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-surface transition-all active:scale-95"
                    >
                        Back to Hub
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-primary text-primary p-4 md:p-8 cyber-grid">
            <div className="max-w-7xl mx-auto">
                {/* Warning Banner */}
                {!warningDismissed && (
                    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-6 mb-8 flex items-start gap-4">
                        <div className="w-10 h-10 bg-yellow-500/20 rounded-xl flex items-center justify-center shrink-0">
                            <svg className="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                        <div className="flex-1">
                            <h4 className="text-yellow-500 font-bold text-sm mb-1">Review Before Using</h4>
                            <p className="text-secondary text-sm leading-relaxed">
                                The generated output may contain skills or keywords that you don't actually possess. Please carefully review the optimized resume, edit it in the LaTeX editor as needed, and click <strong>"Refresh View"</strong> to recompile before downloading.
                            </p>
                        </div>
                        <button
                            onClick={() => setWarningDismissed(true)}
                            className="text-gray-500 hover:text-primary transition-colors shrink-0"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                )}

                {/* Top Navigation */}
                <div className="flex items-center justify-between mb-8">
                    <button
                        onClick={() => navigate('/history')}
                        className="flex items-center gap-2 px-4 py-2.5 bg-secondary border border-gray-100 text-gray-500 hover:text-primary rounded-xl font-medium text-sm transition-all hover:bg-surface active:scale-95"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                        </svg>
                        <span>History</span>
                    </button>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => navigate('/new-optimization')}
                            className="flex items-center gap-2 px-4 py-2.5 bg-secondary border border-gray-100 text-gray-500 hover:text-primary rounded-xl font-medium text-sm transition-all hover:bg-surface active:scale-95"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                            </svg>
                            <span>New</span>
                        </button>
                        <button
                            onClick={handleDownloadPdf}
                            disabled={!latexCode || isCompiling}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all active:scale-95 ${latexCode && !isCompiling
                                ? 'bg-brand text-white hover:bg-brand-hover shadow-lg shadow-brand-primary/10'
                                : 'bg-secondary text-gray-500 cursor-not-allowed border border-gray-100'
                                }`}
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            <span>{isCompiling ? 'Compiling...' : 'Download PDF'}</span>
                        </button>
                    </div>
                </div>

                {/* Header */}
                <div className="mb-10">
                    <h1 className="text-3xl font-bold text-primary mb-2 tracking-tight">Optimization Results</h1>
                    <p className="text-gray-500 text-sm">{resultsData.date}</p>
                </div>

                <div className="space-y-6">
                    {/* Main Content */}
                    <div className="space-y-6">
                        {/* Score Section */}
                        <div className="bg-surface border border-gray-200 rounded-[2.5rem] p-6 md:p-10 shadow-xl shadow-black/5 relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-1 bg-brand/20" />
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8 mb-10">
                                <div className="text-center">
                                    <div className="text-3xl sm:text-6xl font-bold text-primary mb-2 tracking-tight text-mono">{resultsData.originalScore}</div>
                                    <div className="text-gray-500 text-xs font-semibold">Original Score</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-3xl sm:text-6xl font-bold text-brand mb-2 tracking-tight text-mono">+{resultsData.improvement}</div>
                                    <div className="text-gray-500 text-xs font-semibold">Improvement</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-3xl sm:text-6xl font-bold text-primary mb-2 tracking-tight underline decoration-brand-primary decoration-4 underline-offset-8 text-mono">{resultsData.optimizedScore}</div>
                                    <div className="text-gray-500 text-xs font-semibold">Final Score</div>
                                </div>
                            </div>
                            <div className="text-center mb-10">
                                <p className="text-gray-400 text-[10px] font-bold uppercase tracking-[0.15em] sm:tracking-[0.3em]">{resultsData.iterations} Iterations</p>
                            </div>

                            {/* Score Progression */}
                            <div>
                                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Score Progression</h3>
                                <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6">
                                    {resultsData.scoreProgression.map((score, index) => (
                                        <React.Fragment key={index}>
                                            <div className={`flex-1 py-4 px-6 rounded-2xl text-center font-bold text-2xl transition-all text-mono ${index === resultsData.scoreProgression.length - 1
                                                ? 'bg-brand text-white shadow-lg shadow-brand/10 scale-105'
                                                : 'bg-secondary text-gray-500 border border-gray-200'
                                                }`}>
                                                {score}
                                            </div>
                                            {index < resultsData.scoreProgression.length - 1 && (
                                                <svg className="w-5 h-5 text-gray-300 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                                </svg>
                                            )}
                                        </React.Fragment>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Optimized Resume - LaTeX Editor + PDF Preview */}
                        {latexCode && (
                            <div className="bg-surface border border-gray-200 rounded-[2.5rem] p-6 md:p-10 shadow-xl shadow-black/5">
                                <h2 className="text-xl font-semibold text-primary mb-1 tracking-tight">Optimized Resume</h2>
                                <p className="text-gray-500 text-sm mb-8">Edit LaTeX and preview the compiled PDF</p>

                                {latexCompilationStatus === 'failed' && (
                                    <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-6 mb-6 flex items-start gap-4">
                                        <div className="w-10 h-10 bg-amber-500/20 rounded-xl flex items-center justify-center shrink-0">
                                            <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                            </svg>
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="text-amber-600 font-bold text-sm mb-1">PDF Compilation Failed</h4>
                                            <p className="text-secondary text-sm leading-relaxed mb-3">
                                                The generated LaTeX could not be compiled to PDF automatically. You can edit the code in the editor and click <strong>&quot;Update Preview&quot;</strong> to try recompiling, or report this issue.
                                            </p>
                                            <a
                                                href={`mailto:support@resiko.app?subject=LaTeX compilation failure (Run ${id})&body=Run ID: ${id}%0APlease look into this compilation failure.`}
                                                className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500/20 text-amber-700 rounded-xl text-xs font-semibold hover:bg-amber-500/30 transition-colors"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                                </svg>
                                                Report Issue
                                            </a>
                                        </div>
                                    </div>
                                )}

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                    {/* LaTeX Visual Editor */}
                                    <div className="h-[calc(100vh-12rem)] min-h-[500px] max-h-[900px]">
                                        <VisualResumeEditor
                                            latexCode={latexCode}
                                            onChange={setLatexCode}
                                            onRecompile={handleRecompile}
                                            isCompiling={isCompiling}
                                        />
                                    </div>

                                    {/* PDF Preview */}
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center px-1">
                                            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">PDF Preview</label>
                                        </div>

                                        <div className="relative h-[calc(100vh-15rem)] min-h-[450px] max-h-[850px] bg-white border border-gray-200 rounded-xl shadow-sm">
                                            {compiledPdfUrl ? (
                                                <PdfViewer
                                                    url={compiledPdfUrl}
                                                    filename="optimized_resume.pdf"
                                                    className="rounded-xl"
                                                    title="PDF Preview"
                                                />
                                            ) : (
                                                <div className="flex items-center justify-center h-full text-gray-500">
                                                    {isCompiling ? (
                                                        <div className="w-full h-full p-6 space-y-3">
                                                            <Skeleton className="h-8 w-3/4 mx-auto" />
                                                            <Skeleton className="h-4 w-full" />
                                                            <Skeleton className="h-4 w-full" />
                                                            <Skeleton className="h-4 w-5/6" />
                                                            <Skeleton className="h-4 w-full" />
                                                            <Skeleton className="h-4 w-4/5" />
                                                            <div className="pt-2 space-y-2">
                                                                <Skeleton className="h-4 w-full" />
                                                                <Skeleton className="h-4 w-full" />
                                                                <Skeleton className="h-4 w-3/4" />
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="text-center px-8">
                                                            <svg className="w-16 h-16 mx-auto mb-6 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                                            </svg>
                                                            <p className="text-xs font-bold uppercase tracking-widest leading-relaxed text-gray-400">Preview not ready. <br />Click &quot;Update Preview&quot; to compile.</p>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Download button */}
                                <div className="flex justify-end mt-8">
                                    <button
                                        onClick={handleDownloadPdf}
                                        disabled={!compiledPdfUrl || isCompiling}
                                        className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all active:scale-95 ${compiledPdfUrl && !isCompiling
                                            ? 'bg-brand text-white hover:bg-brand-hover shadow-lg shadow-brand-primary/10'
                                            : 'bg-secondary text-gray-500 cursor-not-allowed border border-gray-100'
                                            }`}
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                        </svg>
                                        <span>Download PDF</span>
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Cover Letter */}
                        <div className="bg-surface border border-gray-200 rounded-[2.5rem] p-6 md:p-10 shadow-xl shadow-black/5">
                            <div className="flex items-start justify-between mb-6">
                                <div>
                                    <h2 className="text-xl font-semibold text-primary mb-1 tracking-tight">Cover Letter</h2>
                                    <p className="text-gray-500 text-sm">AI-generated cover letter tailored to the job</p>
                                </div>
                                <button
                                    onClick={handleCopyCoverLetter}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all active:scale-95 ${coverLetterCopied
                                        ? 'bg-green-50 text-green-600 border border-green-200'
                                        : 'bg-brand text-white hover:bg-brand-hover'
                                        }`}
                                >
                                    {coverLetterCopied ? (
                                        <>
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                            </svg>
                                            <span>Copied!</span>
                                        </>
                                    ) : (
                                        <>
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                            </svg>
                                            <span>Copy</span>
                                        </>
                                    )}
                                </button>
                            </div>

                            <div className="bg-secondary rounded-2xl p-6 md:p-8 border border-gray-100">
                                <pre className="text-secondary text-sm whitespace-pre-wrap font-medium leading-relaxed">
                                    {resultsData.coverLetter}
                                </pre>
                            </div>
                        </div>

                        {/* Keywords & Changes Summary */}
                        {resultsData.resumeAnalysis.skillsMissing?.length > 0 && (
                            <div className="bg-surface border border-gray-200 rounded-[2.5rem] p-6 md:p-10 shadow-xl shadow-black/5">
                                <h2 className="text-xl font-semibold text-primary mb-1 tracking-tight">Changes Summary</h2>
                                <p className="text-gray-500 text-sm mb-8">Quick overview of what was modified in your resume</p>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                                    <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5 text-center">
                                        <div className="text-3xl font-bold text-emerald-600 mb-1">+{resultsData.improvement}</div>
                                        <div className="text-emerald-600 text-xs font-semibold">Score Improvement</div>
                                    </div>
                                    <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 text-center">
                                        <div className="text-3xl font-bold text-blue-600 mb-1">{resultsData.resumeAnalysis.skillsMissing.length}</div>
                                        <div className="text-blue-600 text-xs font-semibold">Keywords Targeted</div>
                                    </div>
                                    <div className="bg-purple-50 border border-purple-100 rounded-2xl p-5 text-center">
                                        <div className="text-3xl font-bold text-purple-600 mb-1">{resultsData.iterations}</div>
                                        <div className="text-purple-600 text-xs font-semibold">Optimization Rounds</div>
                                    </div>
                                </div>

                                <div>
                                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Keywords Added to Resume</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {resultsData.resumeAnalysis.skillsMissing.map((keyword) => (
                                            <span key={keyword} className="px-4 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-semibold flex items-center gap-1.5">
                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
                                                </svg>
                                                {keyword}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                {resultsData.jobRequirements.keywords?.length > 0 && (
                                    <div className="mt-6 pt-6 border-t border-gray-100">
                                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Target Keywords from Job Description</h3>
                                        <div className="flex flex-wrap gap-2">
                                            {resultsData.jobRequirements.keywords.map((keyword) => (
                                                <span key={keyword} className="px-4 py-1.5 bg-brand/5 text-brand border border-brand/15 rounded-full text-xs font-semibold">
                                                    {keyword}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Job Requirements Analysis */}
                        <div className="bg-surface border border-gray-200 rounded-[2.5rem] p-6 md:p-10 shadow-xl shadow-black/5">
                            <h2 className="text-xl font-semibold text-primary mb-1 tracking-tight">Job Requirements</h2>
                            <p className="text-gray-500 text-sm mb-8">Extracted from job description</p>

                            <div className="space-y-8">
                                <div>
                                    <h3 className="text-sm font-semibold text-primary mb-4">Key Requirements (Must Have)</h3>
                                    <div className="flex flex-wrap gap-3">
                                        {resultsData.jobRequirements.mustHave?.map((skill) => (
                                            <span key={skill} className="px-4 py-1.5 bg-brand text-white rounded-full text-xs font-semibold">
                                                {skill}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <h3 className="text-sm font-semibold text-primary mb-4">Preferred Skills (Nice to Have)</h3>
                                    <div className="flex flex-wrap gap-3">
                                        {resultsData.jobRequirements.niceToHave?.map((skill) => (
                                            <span key={skill} className="px-4 py-1.5 bg-secondary text-secondary border border-gray-200 rounded-full text-xs font-semibold">
                                                {skill}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <h3 className="text-sm font-semibold text-primary mb-4">Core Keywords</h3>
                                    <div className="flex flex-wrap gap-3">
                                        {resultsData.jobRequirements.keywords?.map((keyword) => (
                                            <span key={keyword} className="px-4 py-1.5 bg-brand/10 text-brand border border-brand-primary/20 rounded-full text-xs font-semibold">
                                                {keyword}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-gray-200">
                                    <p className="text-gray-500 text-xs font-semibold">
                                        Experience Level: <span className="text-primary ml-2">{resultsData.jobRequirements.seniorityLevel}</span>
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Resume Analysis */}
                        <div className="bg-surface border border-gray-200 rounded-[2.5rem] p-6 md:p-10 shadow-xl shadow-black/5">
                            <h2 className="text-xl font-semibold text-primary mb-1 tracking-tight">Resume Analysis</h2>
                            <p className="text-gray-500 text-sm mb-8">Internal profile audit</p>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-10">
                                <div>
                                    <h3 className="text-xs font-bold text-brand uppercase tracking-widest mb-6">Strengths</h3>
                                    <ul className="space-y-4">
                                        {resultsData.resumeAnalysis.skillsPresent?.map((skill) => (
                                            <li key={skill} className="text-primary text-sm font-medium flex items-center gap-4">
                                                <div className="w-2 h-2 bg-brand rounded-full" />
                                                {skill}
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                <div>
                                    <h3 className="text-xs font-bold text-red-500 uppercase tracking-widest mb-6">Missing Keywords</h3>
                                    <ul className="space-y-4">
                                        {resultsData.resumeAnalysis.skillsMissing?.map((skill) => (
                                            <li key={skill} className="text-gray-500 text-sm font-medium flex items-center gap-4">
                                                <div className="w-2 h-2 bg-red-500/30 rounded-full" />
                                                {skill}
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                <div>
                                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-6">Suggestions</h3>
                                    <ul className="space-y-4">
                                        {resultsData.resumeAnalysis.strongSections?.map((section) => (
                                            <li key={section} className="text-secondary text-sm font-medium flex items-center gap-4">
                                                <div className="w-4 h-0.5 bg-brand/30" />
                                                {section}
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                <div>
                                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-6">Areas to Improve</h3>
                                    <ul className="space-y-4">
                                        {resultsData.resumeAnalysis.weakSections?.map((section) => (
                                            <li key={section} className="text-secondary text-sm font-medium flex items-center gap-4">
                                                <div className="w-4 h-0.5 bg-red-500/20" />
                                                {section}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </div>

                        {/* Optimization Steps */}
                        {resultsData.changes.length > 0 && (
                            <div className="bg-surface border border-gray-200 rounded-[2.5rem] p-6 md:p-10 shadow-xl shadow-black/5">
                                <h2 className="text-xl font-semibold text-primary mb-1 tracking-tight">Optimization Steps</h2>
                                <p className="text-gray-500 text-sm mb-8">Agent decisions during optimization</p>

                                <div className="space-y-3">
                                    {resultsData.changes.map((change) => (
                                        <div key={change.id} className="bg-secondary rounded-2xl p-5 border border-gray-100 transition-all hover:bg-surface">
                                            <div className="flex items-start gap-4">
                                                <div className="w-8 h-8 bg-brand/10 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                                                    <svg className="w-4 h-4 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                                    </svg>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="text-primary font-semibold text-sm mb-0.5">{change.title}</h3>
                                                    <p className="text-secondary text-sm leading-relaxed">{change.description}</p>
                                                    {change.reason && (
                                                        <p className="text-gray-400 text-xs mt-1 italic">{change.reason}</p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </div>
    );
}
