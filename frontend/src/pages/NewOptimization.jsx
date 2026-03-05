import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import Toast from '../components/Toast';
import PdfViewer from '../components/PdfViewer';
import VisualResumeEditor from '../components/VisualResumeEditor';
import { optimizeResumeStream, getApiKeyStatus, getTemplatePreference } from '../services/api';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').trim();

export default function NewOptimization() {
    const navigate = useNavigate();
    const [currentStep, setCurrentStep] = useState(1);
    const [inputType, setInputType] = useState(null);
    const [resumeFile, setResumeFile] = useState(null);
    const [resumeText, setResumeText] = useState('');
    const [extractedText, setExtractedText] = useState('');
    const [jobDescription, setJobDescription] = useState('');
    const [optimizedLatex, setOptimizedLatex] = useState('');
    const [compiledPdfUrl, setCompiledPdfUrl] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isExtracting, setIsExtracting] = useState(false);
    const [isCompiling, setIsCompiling] = useState(false);
    const [isOptimizing, setIsOptimizing] = useState(false);
    const [toast, setToast] = useState(null);
    const [hasApiKey, setHasApiKey] = useState(null); // null = loading, true/false = status
    const [hasTemplate, setHasTemplate] = useState(null); // null = loading, true/false = status
    const [optimizationData, setOptimizationData] = useState(null); // full optimization response
    const [activeResultTab, setActiveResultTab] = useState('resume'); // 'resume' | 'details' | 'coverLetter'
    const [coverLetterCopied, setCoverLetterCopied] = useState(false);
    const [warningDismissed, setWarningDismissed] = useState(false);
    const [liveStatusLogs, setLiveStatusLogs] = useState([]);

    // check API key + template on mount
    useEffect(() => {
        async function checkPrerequisites() {
            try {
                const status = await getApiKeyStatus();
                setHasApiKey(status.has_api_key);
            } catch (error) {
                console.error('Failed to check API key status:', error);
                setHasApiKey(false);
            }
            try {
                const pref = await getTemplatePreference();
                setHasTemplate(!!(pref && pref.template_id));
            } catch (error) {
                console.error('Failed to check template preference:', error);
                setHasTemplate(false);
            }
        }
        checkPrerequisites();
    }, []);

    // reset to step 1 if user refreshes mid-optimization (skip while API call is in-flight)
    useEffect(() => {
        if (currentStep === 4 && !optimizedLatex && !isOptimizing) {
            setCurrentStep(1);
        }
    }, [currentStep, optimizedLatex, isOptimizing]);

    // cleanup blob URL on unmount or when compiledPdfUrl changes
    useEffect(() => {
        return () => {
            if (compiledPdfUrl) {
                window.URL.revokeObjectURL(compiledPdfUrl);
            }
        };
    }, [compiledPdfUrl]);

    const steps = [
        { number: 1, name: 'Select Resume', code: 'STEP_01', icon: '📝' },
        { number: 2, name: 'Upload & Extract', code: 'STEP_02', icon: '📄' },
        { number: 3, name: 'Job Details', code: 'STEP_03', icon: '💼' },
        { number: 4, name: 'Optimize', code: 'STEP_04', icon: '⚡' }
    ];

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (inputType === 'pdf' && file.type !== 'application/pdf') {
            setToast({ message: 'Please upload a PDF file', type: 'error' });
            return;
        }

        setResumeFile(file);

        if (inputType === 'pdf') {
            await extractPDFText(file);
        }
    };

    const extractPDFText = async (file) => {
        setIsExtracting(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch(`${API_BASE_URL}/api/pdf/extract`, {
                method: 'POST',
                body: formData,
                credentials: 'include',
            });

            if (!response.ok) {
                throw new Error('PDF extraction failed');
            }

            const data = await response.json();
            setExtractedText(data.text || '');
        } catch (error) {
            setToast({ message: `Failed to extract text from PDF: ${error.message}`, type: 'error' });
        } finally {
            setIsExtracting(false);
        }
    };

    const handleDrop = async (e) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) {
            setResumeFile(file);
            if (inputType === 'pdf') {
                await extractPDFText(file);
            }
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleCompileLatex = async () => {
        setIsCompiling(true);
        try {
            const response = await fetch(`${API_BASE_URL}/api/latex/compile`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ latex_code: optimizedLatex }),
                credentials: 'include',
            });

            if (!response.ok) {
                let detail = 'LaTeX compilation failed';
                try {
                    const errData = await response.json();
                    detail = errData.detail || errData.message || detail;
                } catch { /* non-JSON response */ }
                throw new Error(detail);
            }

            const blob = await response.blob();

            if (compiledPdfUrl) {
                window.URL.revokeObjectURL(compiledPdfUrl);
            }

            const url = window.URL.createObjectURL(blob);
            setCompiledPdfUrl(url);
        } catch (error) {
            setToast({ message: `Failed to compile LaTeX: ${error.message}`, type: 'error' });
        } finally {
            setIsCompiling(false);
        }
    };

    const handleDownloadPdf = () => {
        if (compiledPdfUrl) {
            const a = document.createElement('a');
            a.href = compiledPdfUrl;
            a.download = 'optimized_resume.pdf';
            a.click();
        }
    };

    const canProceedStep1 = inputType !== null;
    const canProceedStep2 = (inputType === 'pdf' && extractedText.trim().length > 0) ||
        (inputType === 'latex' && resumeText.trim().length > 0);
    const canProceedStep3 = jobDescription.trim().length >= 50 &&
        hasApiKey === true &&
        hasTemplate === true;

    const handleContinue = () => {
        if (currentStep === 1 && canProceedStep1) {
            setCurrentStep(2);
        } else if (currentStep === 2 && canProceedStep2) {
            setCurrentStep(3);
        } else if (currentStep === 3 && jobDescription.trim().length >= 50) {
            if (hasApiKey !== true) {
                setToast({ message: 'Please add your Groq API key in Settings before running optimization.', type: 'error' });
                return;
            }
            if (hasTemplate !== true) {
                setToast({ message: 'Please select a resume template in Templates before running optimization.', type: 'error' });
                return;
            }
            setCurrentStep(4);
            simulateAgentOptimization();
        }
    };

    const resetForm = () => {
        // Reset all form state
        setInputType(null);
        setResumeFile(null);
        setResumeText('');
        setExtractedText('');
        setJobDescription('');
        setOptimizedLatex('');
        setCompiledPdfUrl(null);
        setCurrentStep(1);
        setOptimizationData(null);
        setActiveResultTab('resume');
        setCoverLetterCopied(false);
        setWarningDismissed(false);
    };

    const simulateAgentOptimization = async () => {
        setIsOptimizing(true);
        setWarningDismissed(false);
        setLiveStatusLogs([]);
        setOptimizationError(null); // Clear any previous errors
        try {
            const resumeContent = inputType === 'pdf' ? extractedText : resumeText;

            const data = await optimizeResumeStream(jobDescription, resumeContent, ({ event, data: eventData }) => {
                if (event === 'run_started') {
                    setLiveStatusLogs([{ label: 'INITIALIZING', detail: 'Starting optimization workflow', status: 'OK' }]);
                } else if (event === 'node_started') {
                    const label = eventData.label || eventData.node || 'Processing';
                    const detail = eventData.detail || '';
                    setLiveStatusLogs(prev => {
                        // Mark all previous items as OK, add new one as RUNNING
                        const updated = prev.map(item => ({ ...item, status: 'OK' }));
                        return [...updated, { label: label.toUpperCase().replace(/\s+/g, '_'), detail, status: 'RUNNING' }];
                    });
                } else if (event === 'node_completed') {
                    setLiveStatusLogs(prev => {
                        // Mark the last item as OK
                        if (prev.length === 0) return prev;
                        const updated = [...prev];
                        updated[updated.length - 1] = { ...updated[updated.length - 1], status: 'OK' };
                        return updated;
                    });
                } else if (event === 'run_completed') {
                    setLiveStatusLogs(prev => prev.map(item => ({ ...item, status: 'OK' })));
                }
            }, inputType);
            console.log('Optimization response:', {
                final_status: data.final_status,
                fit_decision: data.fit_decision,
                has_modified_resume: !!data.modified_resume
            });

            // Check if optimization was rejected due to poor fit
            if (data.final_status === 'rejected_poor_fit' || data.fit_decision === 'poor_fit') {
                const reason = data.fit_reason || 'Your profile does not match the job requirements sufficiently.';
                setErrorDialog({
                    title: 'Poor Fit — Optimization Skipped',
                    message: reason,
                    type: 'poor_fit'
                });
                setCurrentStep(3);
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

            setOptimizationData({
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
                fitDecision: data.fit_decision,
                fitReason: data.fit_reason,
                fitConfidence: data.fit_confidence,
            });

            if (data.modified_resume && data.modified_resume.trim()) {
                const optimizedLatexCode = data.modified_resume;
                setOptimizedLatex(optimizedLatexCode);

                // Skip compile if backend already validated it as a failure
                if (data.latex_compilation_status === 'failed') {
                    setToast({ message: 'Optimization succeeded but PDF compilation failed. You can edit the LaTeX and click "Refresh View" to try again.', type: 'warning' });
                } else {
                    // Compile the optimized LaTeX
                    setIsCompiling(true);
                    try {
                        const response = await fetch(`${API_BASE_URL}/api/latex/compile`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({ latex_code: optimizedLatexCode }),
                            credentials: 'include',
                        });

                        if (response.ok) {
                            const blob = await response.blob();
                            const url = window.URL.createObjectURL(blob);
                            setCompiledPdfUrl(url);
                            setToast({ message: 'Optimization completed successfully!', type: 'success' });
                        } else {
                            let detail = 'LaTeX compilation failed';
                            try {
                                const errData = await response.json();
                                detail = errData.detail || errData.message || detail;
                            } catch { /* non-JSON response */ }
                            console.error('Compile response error:', detail);
                            throw new Error(detail);
                        }
                    } catch (compileError) {
                        console.error('Compilation error:', compileError);
                        setToast({ message: 'Optimization succeeded but PDF compilation failed. Check LaTeX syntax.', type: 'warning' });
                    } finally {
                        setIsCompiling(false);
                    }
                }
            } else {
                throw new Error('No optimized resume returned from server');
            }
        } catch (error) {
            console.error('Optimization failed:', error);
            const errorMsg = error.message || 'Unknown error';

            // Check if it's an API key issue
            if (errorMsg.includes('API key') || errorMsg.includes('Settings')) {
                setErrorDialog({
                    title: 'API Key Required',
                    message: 'Please add your Groq API key in Settings before running optimization.',
                    type: 'error'
                });
                setHasApiKey(false); // Update state to show warning banner
            } else {
                setToast({ message: `Optimization failed: ${errorMsg}`, type: 'error' });
            }

            // Go back to step 3 so user can retry without re-entering everything
            setCurrentStep(3);
        } finally {
            setIsOptimizing(false);
        }
    };

    const handleBack = () => {
        if (currentStep > 1) {
            setCurrentStep(currentStep - 1);
        }
    };

    return (
        <div className="min-h-screen bg-primary text-primary p-4 md:p-8">
            {/* Compact prerequisites bar — shown only when something is missing */}
            {(hasApiKey === false || hasTemplate === false) && (
                <div className="max-w-7xl mx-auto mb-6">
                    <div className="bg-surface border border-gray-200 rounded-2xl px-4 py-3 shadow-sm flex flex-wrap items-center gap-2">
                        {/* Label */}
                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 mr-1 shrink-0">
                            Setup required
                        </span>

                        {/* API Key chip */}
                        {hasApiKey === false && (
                            <button
                                onClick={() => navigate('/settings')}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 border border-red-200 text-red-600 text-xs font-semibold hover:bg-red-100 active:scale-95 transition-all"
                            >
                                <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                                </svg>
                                Groq API Key
                                <svg className="w-3 h-3 shrink-0 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                                </svg>
                            </button>
                        )}

                        {/* Template chip */}
                        {hasTemplate === false && (
                            <button
                                onClick={() => navigate('/templates')}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold hover:bg-amber-100 active:scale-95 transition-all"
                            >
                                <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                Resume Template
                                <svg className="w-3 h-3 shrink-0 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                                </svg>
                            </button>
                        )}

                        <span className="text-[10px] text-gray-400 ml-auto hidden sm:block">
                            Both required to run optimization
                        </span>
                    </div>
                </div>
            )}

            {/* Step Indicator - Technical Version */}
            <div className="max-w-7xl mx-auto mb-16 relative">
                <div className="flex items-center justify-between px-4">
                    {steps.map((step, index) => (
                        <React.Fragment key={step.number}>
                            <div className="flex flex-col items-center relative z-10 w-16 sm:w-24 md:w-32">
                                <div
                                    className={`w-12 h-12 rounded-xl flex items-center justify-center font-black transition-all duration-500 border-2 ${currentStep === step.number
                                        ? 'bg-brand border-brand-primary text-black shadow-[0_0_20px_rgba(255,75,114,0.3)] scale-110'
                                        : currentStep > step.number
                                            ? 'bg-brand border-brand-primary text-white'
                                            : 'bg-primary border-gray-200 text-gray-500 hover:border-brand-primary/30'
                                        }`}
                                >
                                    <span className="font-mono text-base font-black">0{step.number}</span>
                                </div>
                                <div className="mt-4 text-center">
                                    <div className={`text-xs font-medium mb-1 ${currentStep === step.number ? 'text-brand' : 'text-gray-500'}`}>
                                        {step.code}
                                    </div>
                                    <div className={`text-sm font-semibold ${currentStep === step.number ? 'text-primary' : 'text-gray-500'}`}>
                                        {step.name}
                                    </div>
                                </div>
                            </div>
                            {index < steps.length - 1 && (
                                <div className="flex-1 px-4 mt-6">
                                    <div className="h-px relative">
                                        <div className="absolute inset-0 bg-border-subtle" />
                                        <Motion.div
                                            initial={{ width: "0%" }}
                                            animate={{ width: currentStep > step.number ? "100%" : "0%" }}
                                            className="absolute inset-0 bg-brand shadow-[0_0_10px_rgba(255,75,114,0.5)]"
                                        />
                                    </div>
                                </div>
                            )}
                        </React.Fragment>
                    ))}
                </div>
            </div>

            {/* Main Content Container with Background Grid */}
            <div className="max-w-7xl mx-auto relative min-h-100 md:min-h-150">
                {/* Background Decoration */}
                <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
                    <div className="absolute inset-0 cyber-grid opacity-20" />
                    <div className="absolute top-[20%] right-[10%] w-125 h-[5h-125brand/5 blur-[120px] rounded-full" />
                </div>

                {/* Main Container */}
                <div className="relative z-10 bg-surface/30 backdrop-blur-xl border border-gray-200 rounded-[2.5rem] overflow-hidden shadow-2xl shadow-black/10">
                    <div className="absolute top-0 left-0 w-full h-1 bg-brand/20" />

                    {/* Corner Markers */}
                    <div className="absolute top-4 left-4 w-4 h-4 border-t border-l border-brand-primary/30" />
                    <div className="absolute top-4 right-4 w-4 h-4 border-t border-r border-brand-primary/30" />
                    <div className="absolute bottom-4 left-4 w-4 h-4 border-b border-l border-brand-primary/30" />
                    <div className="absolute bottom-4 right-4 w-4 h-4 border-b border-r border-brand-primary/30" />

                    <div className="p-6 md:p-12">
                        <AnimatePresence mode="wait">
                            {/* Step 1: Archive Select */}
                            {currentStep === 1 && (
                                <Motion.div
                                    key="step1"
                                    initial={{ opacity: 0, scale: 0.98 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 1.02 }}
                                    className="space-y-12"
                                >
                                    <div className="text-center max-w-2xl mx-auto">
                                        <div className="text-mono text-[10px] text-brand font-black uppercase tracking-[0.2em] sm:tracking-[0.5em] mb-4">STEP_01 // SELECT_RESUME</div>
                                        <h2 className="text-3xl md:text-5xl font-bold text-primary mb-4 tracking-tight leading-tight">
                                            Select <span className="text-brand">Resume.</span>
                                        </h2>
                                        <p className="text-secondary font-medium tracking-tight opacity-70">
                                            Start by selecting how you want to provide your resume.
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        {[
                                            { id: 'pdf', label: 'Upload PDF', desc: 'Upload your existing PDF resume.', code: 'OPTION_01', icon: '📄' },
                                            { id: 'latex', label: 'Paste LaTeX', desc: 'Paste your LaTeX source code directly.', code: 'OPTION_02', icon: '📝' }
                                        ].map((opt) => (
                                            <button
                                                key={opt.id}
                                                onClick={() => setInputType(opt.id)}
                                                className={`group relative p-5 sm:p-8 md:p-12 rounded-2xl sm:rounded-4xl border transition-all duration-500 text-left overflow-hidden ${inputType === opt.id
                                                    ? 'border-brand-primary bg-brand/5 shadow-[0_0_40px_rgba(255,75,114,0.1)]'
                                                    : 'border-gray-200 hover:border-text-secondary hover:bg-white/2'
                                                    }`}
                                            >
                                                {/* Numeric Anchor */}
                                                <div className="absolute -bottom-8 -right-4 text-7xl sm:text-9xl font-black text-primary opacity-[0.03] select-none italic group-hover:opacity-[0.06] transition-opacity">
                                                    0{opt.id === 'pdf' ? 1 : 2}
                                                </div>

                                                <div className="relative z-10">
                                                    <div className="flex justify-between items-start mb-8">
                                                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl transition-transform duration-500 group-hover:scale-110 ${inputType === opt.id ? 'bg-brand text-white' : 'bg-secondary text-gray-500'}`}>
                                                            {opt.icon}
                                                        </div>
                                                        <div className="text-mono text-[9px] font-bold text-gray-500 uppercase tracking-widest">{opt.code}</div>
                                                    </div>
                                                    <h3 className={`text-xl font-semibold mb-3 tracking-tight transition-colors ${inputType === opt.id ? 'text-primary' : 'text-secondary'}`}>
                                                        {opt.label}
                                                    </h3>
                                                    <p className={`text-sm font-medium leading-relaxed transition-opacity ${inputType === opt.id ? 'text-brand opacity-100' : 'text-gray-500 opacity-50'}`}>
                                                        {opt.desc}
                                                    </p>
                                                </div>

                                                {/* Hover glint */}
                                                <div className="absolute inset-0 bg-linear-to-tr from-brand-primary/0 via-brand-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
                                            </button>
                                        ))}
                                    </div>

                                    <div className="flex justify-end pt-8">
                                        <button
                                            onClick={handleContinue}
                                            disabled={!canProceedStep1}
                                            className={`group relative px-10 py-4 rounded-2xl font-semibold text-sm tracking-wide transition-all flex items-center gap-4 ${canProceedStep1
                                                ? 'bg-brand text-white hover:bg-brand-hover shadow-[0_20px_40px_-10px_rgba(255,75,114,0.3)] hover:scale-105 active:scale-95'
                                                : 'bg-secondary text-gray-500 cursor-not-allowed border border-gray-200/50'
                                                }`}
                                        >
                                            <span>Continue to Upload</span>
                                            <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                            </svg>
                                        </button>
                                    </div>
                                </Motion.div>
                            )}

                            {/* Step 2: Upload Files */}
                            {currentStep === 2 && (
                                <Motion.div
                                    key="step2"
                                    initial={{ opacity: 0, scale: 0.98 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 1.02 }}
                                    className="space-y-10"
                                >
                                    <div className="text-center max-w-2xl mx-auto">
                                        <div className="text-mono text-[10px] text-brand font-black uppercase tracking-[0.2em] sm:tracking-[0.5em] mb-4">STEP_02 // UPLOAD_&_EXTRACT</div>
                                        <h2 className="text-3xl md:text-5xl font-bold text-primary mb-4 tracking-tight leading-tight">
                                            {inputType === 'pdf' ? 'Upload' : 'Paste'} <span className="text-brand">{inputType === 'pdf' ? 'Resume.' : 'Code.'}</span>
                                        </h2>
                                        <p className="text-secondary font-medium tracking-tight opacity-70">
                                            {inputType === 'pdf' ? 'Upload your resume to extract its content.' : 'Paste your LaTeX source code to begin.'}
                                        </p>
                                    </div>

                                    {inputType === 'pdf' ? (
                                        <div className="space-y-8">
                                            <div
                                                onDrop={handleDrop}
                                                onDragOver={handleDragOver}
                                                onDragLeave={handleDragLeave}
                                                className={`relative border border-dashed rounded-4xl p-8 md:p-16 text-center transition-all duration-500 overflow-hidden ${isDragging
                                                    ? 'border-brand-primary bg-brand/10 shadow-[inner_0_0_40px_rgba(255,75,114,0.1)]'
                                                    : 'border-gray-200 hover:border-brand-primary/30 bg-white/2'
                                                    }`}
                                            >
                                                <input
                                                    type="file"
                                                    id="pdf-upload"
                                                    accept=".pdf"
                                                    onChange={handleFileUpload}
                                                    className="hidden"
                                                />

                                                <AnimatePresence mode="wait">
                                                    {resumeFile ? (
                                                        <Motion.div
                                                            key="file-ready"
                                                            initial={{ opacity: 0, y: 10 }}
                                                            animate={{ opacity: 1, y: 0 }}
                                                            className="space-y-6"
                                                        >
                                                            <div className="w-24 h-24 mx-auto bg-brand/10 rounded-3xl flex items-center justify-center relative">
                                                                <svg className="w-10 h-10 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                                </svg>
                                                                <Motion.div
                                                                    animate={{ rotate: 360 }}
                                                                    transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                                                                    className="absolute inset-0 border-2 border-brand-primary/30 border-t-transparent rounded-3xl"
                                                                />
                                                            </div>
                                                            <div>
                                                                <p className="text-xl font-semibold text-primary tracking-tight mb-1">{resumeFile.name}</p>
                                                                <div className="text-mono text-[9px] font-bold text-brand uppercase tracking-[0.3em]">
                                                                    {isExtracting ? 'EXTRACTING_TEXT...' : 'TEXT_EXTRACTED'}
                                                                </div>
                                                            </div>
                                                            <button
                                                                onClick={() => {
                                                                    setResumeFile(null);
                                                                    setExtractedText('');
                                                                }}
                                                                className="px-8 py-2.5 border border-gray-200 hover:border-red-500/50 hover:bg-red-500/5 text-gray-500 hover:text-red-500 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all"
                                                            >
                                                                Remove File
                                                            </button>
                                                        </Motion.div>
                                                    ) : (
                                                        <Motion.div
                                                            key="drop-prompt"
                                                            initial={{ opacity: 0 }}
                                                            animate={{ opacity: 1 }}
                                                            className="space-y-8"
                                                        >
                                                            <div className="w-24 h-24 mx-auto bg-brand/5 rounded-4xl flex items-center justify-center border border-brand-primary/20">
                                                                <svg className="w-10 h-10 text-brand/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                                                </svg>
                                                            </div>
                                                            <div>
                                                                <p className="text-xl font-semibold text-primary mb-3">Drop PDF Resume</p>
                                                                <p className="text-gray-500 text-sm mb-8">or click to browse your files</p>
                                                                <label
                                                                    htmlFor="pdf-upload"
                                                                    className="inline-block px-10 py-4 bg-brand text-white rounded-2xl cursor-pointer font-semibold text-sm tracking-wide hover:bg-white transition-all active:scale-95 shadow-xl"
                                                                >
                                                                    Browse Files
                                                                </label>
                                                            </div>
                                                        </Motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>

                                            {extractedText && (
                                                <Motion.div
                                                    initial={{ opacity: 0, height: 0 }}
                                                    animate={{ opacity: 1, height: "auto" }}
                                                    className="space-y-4"
                                                >
                                                    <div className="flex justify-between items-center">
                                                        <label className="text-mono text-[9px] text-gray-500 uppercase tracking-[0.4em]">Extracted_Text // READ_ONLY</label>
                                                        <div className="w-2 h-2 rounded-full bg-brand animate-pulse" />
                                                    </div>
                                                    <div className="relative group">
                                                        <textarea
                                                            value={extractedText}
                                                            readOnly
                                                            className="w-full h-48 p-6 md:p-8 bg-secondary border border-gray-200 rounded-4xl text-primary font-mono text-xs resize-none focus:outline-none focus:border-brand-primary/30 focus:ring-1 focus:ring-brand/20 transition-all custom-scrollbar"
                                                        />
                                                        <div className="absolute top-4 right-4 text-[8px] text-gray-500/30 font-mono uppercase">Read_Only</div>
                                                    </div>
                                                </Motion.div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="space-y-6">
                                            <div className="flex justify-between items-center">
                                                <label className="text-mono text-[9px] text-gray-500 uppercase tracking-[0.4em]">LaTeX_Source_Code</label>
                                                <div className="flex items-center gap-4">
                                                    <div className="text-[10px] text-brand font-bold">READY</div>
                                                    <div className="w-2 h-2 rounded-full bg-brand" />
                                                </div>
                                            </div>
                                            <div className="relative group">
                                                <textarea
                                                    value={resumeText}
                                                    onChange={(e) => setResumeText(e.target.value)}
                                                    placeholder="\\documentclass{article}\n\\begin{document}\nPaste high-fidelity source code here...\n\\end{document}"
                                                    className="w-full h-100 p-6 md:p-10 bg-secondary border border-gray-200 rounded-[2.5rem] text-primary placeholder-gray-400 focus:outline-none focus:border-brand-primary/30 focus:ring-1 focus:ring-brand/20 transition-all font-mono text-sm resize-none custom-scrollbar"
                                                />
                                                <div className="absolute top-4 right-4 text-[8px] text-gray-500/30 font-mono uppercase">Code_Editor</div>
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex justify-between pt-10 border-t border-white/5">
                                        <button
                                            onClick={handleBack}
                                            className="px-8 py-4 bg-white/5 hover:bg-white/10 text-gray-500 hover:text-primary rounded-2xl font-medium text-sm transition-all flex items-center gap-4 border border-gray-100"
                                        >
                                            <svg className="w-5 h-5 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" />
                                            </svg>
                                            <span>Back</span>
                                        </button>

                                        <button
                                            onClick={handleContinue}
                                            disabled={!canProceedStep2 || isExtracting}
                                            className={`group relative px-10 py-4 rounded-2xl font-semibold text-sm tracking-wide transition-all flex items-center gap-4 ${canProceedStep2 && !isExtracting
                                                ? 'bg-brand text-white hover:bg-brand-hover shadow-[0_20px_40px_-10px_rgba(255,75,114,0.3)] hover:scale-105 active:scale-95'
                                                : 'bg-secondary text-gray-500 cursor-not-allowed border border-gray-200/50'
                                                }`}
                                        >
                                            <span>Continue to Job Details</span>
                                            <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                            </svg>
                                        </button>
                                    </div>
                                </Motion.div>
                            )}

                            {/* Step 3: Job Description */}
                            {currentStep === 3 && (
                                <Motion.div
                                    key="step3"
                                    initial={{ opacity: 0, scale: 0.98 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 1.02 }}
                                    className="space-y-10"
                                >
                                    <div className="text-center max-w-2xl mx-auto">
                                        <div className="text-mono text-[10px] text-brand font-black uppercase tracking-[0.2em] sm:tracking-[0.5em] mb-4">STEP_03 // JOB_DETAILS</div>
                                        <h2 className="text-3xl md:text-5xl font-bold text-primary mb-4 tracking-tight leading-tight">
                                            Job <span className="text-brand">Description.</span>
                                        </h2>
                                        <p className="text-secondary font-medium tracking-tight opacity-70">
                                            Provide the description of the job you are applying for.
                                        </p>
                                    </div>

                                    {/* Optimization Error Display */}
                                    {optimizationError && (
                                        <Motion.div
                                            initial={{ opacity: 0, y: -10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="bg-red-50 border border-red-200 rounded-2xl p-6 max-w-2xl mx-auto"
                                        >
                                            <div className="flex items-start space-x-4">
                                                <div className="shrink-0">
                                                    <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                                    </svg>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="text-sm font-semibold text-red-800 mb-1">Optimization Failed</h3>
                                                    <p className="text-sm text-red-700 mb-3">
                                                        {optimizationError.message}
                                                    </p>
                                                    <div className="flex flex-col sm:flex-row gap-3">
                                                        <button
                                                            onClick={() => setOptimizationError(null)}
                                                            className="text-sm text-red-600 hover:text-red-800 font-medium"
                                                        >
                                                            Dismiss
                                                        </button>
                                                        <button
                                                            onClick={() => navigate('/support')}
                                                            className="bg-red-600 hover:bg-red-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
                                                        >
                                                            Contact Support
                                                        </button>
                                                    </div>
                                                    <p className="text-xs text-red-600 mt-2">
                                                        Error occurred at {optimizationError.timestamp}
                                                    </p>
                                                </div>
                                            </div>
                                        </Motion.div>
                                    )}

                                    <div className="space-y-6">
                                        <div className="flex justify-between items-center">
                                            <label className="text-mono text-[9px] text-gray-500 uppercase tracking-[0.4em]">Job_Requirements</label>
                                            <div className="flex items-center gap-4">
                                                <div className="text-[10px] text-brand font-bold uppercase tracking-widest leading-none">Minimum Length // 50 Chars</div>
                                            </div>
                                        </div>
                                        <div className="relative">
                                            <textarea
                                                value={jobDescription}
                                                onChange={(e) => setJobDescription(e.target.value)}
                                                placeholder="Paste the complete target job description here..."
                                                className="w-full h-52 md:h-80 p-4 md:p-10 bg-secondary border border-gray-200 rounded-2xl md:rounded-[2.5rem] text-primary placeholder-gray-400 focus:outline-none focus:border-brand-primary/30 focus:ring-1 focus:ring-brand/20 transition-all resize-none custom-scrollbar text-sm font-medium leading-relaxed"
                                            />
                                            <div className="absolute bottom-6 right-8 flex items-center gap-4">
                                                <div className="h-1.5 w-32 rounded-full overflow-hidden bg-white/5 border border-white/5">
                                                    <Motion.div
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${Math.min(100, (jobDescription.length / 50) * 100)}%` }}
                                                        className={`h-full shadow-[0_0_10px_rgba(255,75,114,0.5)] ${jobDescription.length >= 50 ? 'bg-brand' : 'bg-brand/20'}`}
                                                    />
                                                </div>
                                                <p className={`text-mono text-[9px] font-black uppercase tracking-widest ${jobDescription.length >= 50 ? 'text-brand' : 'text-gray-500'}`}>
                                                    {String(jobDescription.length).padStart(3, '0')} CHARS
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-4 pt-10 border-t border-white/5">
                                        {/* Blocking prerequisites hint */}
                                        {(hasApiKey === false || hasTemplate === false) && (
                                            <div className="flex flex-wrap items-center gap-2 justify-end">
                                                <span className="text-[10px] text-gray-400 font-semibold">Still needed:</span>
                                                {hasApiKey === false && (
                                                    <button onClick={() => navigate('/settings')} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-50 border border-red-200 text-red-600 text-[11px] font-semibold hover:bg-red-100 transition-all">
                                                        API Key <span className="opacity-60">→</span>
                                                    </button>
                                                )}
                                                {hasTemplate === false && (
                                                    <button onClick={() => navigate('/templates')} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-[11px] font-semibold hover:bg-amber-100 transition-all">
                                                        Template <span className="opacity-60">→</span>
                                                    </button>
                                                )}
                                            </div>
                                        )}

                                        <div className="flex justify-between">
                                            <button
                                                onClick={handleBack}
                                                className="px-8 py-4 bg-white/5 hover:bg-white/10 text-gray-500 hover:text-primary rounded-2xl font-medium text-sm transition-all flex items-center gap-4 border border-gray-100"
                                            >
                                                <svg className="w-5 h-5 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" />
                                                </svg>
                                                <span>Back</span>
                                            </button>

                                            <button
                                                onClick={handleContinue}
                                                disabled={!canProceedStep3}
                                                className={`group relative px-10 py-4 rounded-2xl font-semibold text-sm tracking-wide transition-all flex items-center gap-4 ${canProceedStep3
                                                    ? 'bg-brand text-white hover:bg-brand-hover shadow-[0_20px_40px_-10px_rgba(255,75,114,0.3)] hover:scale-105 active:scale-95'
                                                    : 'bg-secondary text-gray-500 cursor-not-allowed border border-gray-200/50'
                                                    }`}
                                            >
                                                <svg className="w-5 h-5 group-hover:rotate-12 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                                </svg>
                                                <span>Start Optimization</span>
                                            </button>
                                        </div>
                                    </div>
                                </Motion.div>
                            )}

                            {/* Step 4: Results */}
                            {currentStep === 4 && (
                                <Motion.div
                                    key="step4"
                                    initial={{ opacity: 0, scale: 0.98 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 1.02 }}
                                    className="space-y-8"
                                >
                                    <div className="text-center max-w-2xl mx-auto mb-10">
                                        <div className="text-mono text-[10px] text-brand font-black uppercase tracking-[0.2em] sm:tracking-[0.5em] mb-4">STEP_04 // RESULTS</div>
                                        <h2 className="text-3xl md:text-5xl font-bold text-primary mb-4 tracking-tight leading-tight">
                                            Optimized <span className="text-brand">Resume.</span>
                                        </h2>
                                        <p className="text-secondary font-medium tracking-tight opacity-70">
                                            Your resume has been optimized. Review the results below.
                                        </p>
                                    </div>

                                    {!optimizedLatex ? (
                                        <div className="flex flex-col items-center py-8 md:py-12">
                                            {/* Loading spinner */}
                                            <div className="mb-8 md:mb-10">
                                                <div className="w-20 h-20 relative">
                                                    <Motion.div
                                                        animate={{ rotate: 360 }}
                                                        transition={{ duration: 1.8, repeat: Infinity, ease: "linear" }}
                                                        className="absolute inset-0 border-[3px] border-brand border-t-transparent rounded-full"
                                                    />
                                                    <Motion.div
                                                        animate={{ rotate: -360 }}
                                                        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                                                        className="absolute inset-2 border-2 border-brand/20 border-b-transparent rounded-full"
                                                    />
                                                    <div className="absolute inset-0 flex items-center justify-center">
                                                        <div className="w-2 h-2 bg-brand rounded-full animate-pulse" />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Step list */}
                                            <div className="w-full max-w-lg space-y-3">
                                                {(() => {
                                                    const PIPELINE_STEPS = [
                                                        { key: 'EXTRACTING_JOB_REQUIREMENTS', message: 'Extracting Job Requirements' },
                                                        { key: 'ANALYZING_RESUME', message: 'Analyzing Resume' },
                                                        { key: 'CHECKING_JOB_FIT', message: 'Checking Job Fit' },
                                                        { key: 'SCORING_ORIGINAL_RESUME', message: 'Scoring Original Resume' },
                                                        { key: 'PLANNING_IMPROVEMENTS', message: 'Planning Improvements' },
                                                        { key: 'OPTIMIZING_RESUME', message: 'Optimizing Resume' },
                                                        { key: 'RE-SCORING_RESUME', message: 'Re-scoring Resume' },
                                                        { key: 'GENERATING_COVER_LETTER', message: 'Generating Cover Letter' },
                                                    ];

                                                    const logMap = {};
                                                    liveStatusLogs.forEach(log => {
                                                        logMap[log.label.toUpperCase().replace(/\s+/g, '_')] = log.status;
                                                    });

                                                    let activeFound = false;
                                                    const steps = PIPELINE_STEPS.map(step => {
                                                        const status = logMap[step.key];
                                                        if (status === 'OK') return { ...step, state: 'completed' };
                                                        if (status === 'RUNNING') { activeFound = true; return { ...step, state: 'active' }; }
                                                        if (status === 'FAILED') return { ...step, state: 'failed' };
                                                        if (!activeFound && liveStatusLogs.length > 0) return { ...step, state: 'pending' };
                                                        return { ...step, state: 'pending' };
                                                    });

                                                    return steps.map((step, i) => (
                                                        <Motion.div
                                                            key={step.key}
                                                            initial={{ opacity: 0, y: 8 }}
                                                            animate={{ opacity: 1, y: 0 }}
                                                            transition={{ delay: i * 0.05 }}
                                                            className={`flex items-center gap-4 px-5 py-3.5 rounded-2xl transition-all duration-300 ${step.state === 'active'
                                                                ? 'bg-brand/5 border-l-4 border-brand shadow-sm'
                                                                : step.state === 'failed'
                                                                    ? 'bg-red-50 border-l-4 border-red-400'
                                                                    : step.state === 'completed'
                                                                        ? 'bg-transparent'
                                                                        : 'bg-transparent opacity-50'
                                                                }`}
                                                        >
                                                            {/* Icon */}
                                                            <div className="shrink-0">
                                                                {step.state === 'completed' ? (
                                                                    <div className="w-7 h-7 rounded-full bg-brand/10 flex items-center justify-center">
                                                                        <svg className="w-4 h-4 text-brand" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                                        </svg>
                                                                    </div>
                                                                ) : step.state === 'active' ? (
                                                                    <div className="w-7 h-7 relative">
                                                                        <Motion.div
                                                                            animate={{ rotate: 360 }}
                                                                            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                                                                            className="absolute inset-0 border-2 border-brand border-t-transparent rounded-full"
                                                                        />
                                                                    </div>
                                                                ) : step.state === 'failed' ? (
                                                                    <div className="w-7 h-7 rounded-full bg-red-100 flex items-center justify-center">
                                                                        <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                                                        </svg>
                                                                    </div>
                                                                ) : (
                                                                    <div className="w-7 h-7 rounded-full border-2 border-gray-200" />
                                                                )}
                                                            </div>

                                                            {/* Text + progress bar */}
                                                            <div className="flex-1 min-w-0">
                                                                <p className={`text-sm font-medium leading-snug ${step.state === 'active' ? 'text-primary' :
                                                                    step.state === 'completed' ? 'text-secondary' :
                                                                        step.state === 'failed' ? 'text-red-600' :
                                                                            'text-gray-400'
                                                                    }`}>
                                                                    {step.message}
                                                                </p>
                                                                {(step.state === 'completed' || step.state === 'active') && (
                                                                    <div className="mt-2 h-1 rounded-full bg-gray-100 overflow-hidden">
                                                                        {step.state === 'completed' ? (
                                                                            <div className="h-full bg-brand/30 rounded-full w-full" />
                                                                        ) : (
                                                                            <Motion.div
                                                                                className="h-full bg-brand rounded-full"
                                                                                initial={{ width: '10%' }}
                                                                                animate={{ width: ['10%', '70%', '40%', '85%', '60%'] }}
                                                                                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                                                                            />
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </Motion.div>
                                                    ));
                                                })()}
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            {/* Warning Banner - Issue 6 */}
                                            {!warningDismissed && (
                                                <Motion.div
                                                    initial={{ opacity: 0, y: -10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-6 flex items-start gap-4"
                                                >
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
                                                        className="text-gray-500 hover:text-primary transition-colors shrink-0 mt-1"
                                                    >
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                        </svg>
                                                    </button>
                                                </Motion.div>
                                            )}

                                            {/* Score Summary - Issue 4 */}
                                            {optimizationData && (
                                                <div className="bg-surface/50 border border-gray-200 rounded-2xl p-4 sm:p-8">
                                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-8 text-center">
                                                        <div>
                                                            <div className="text-2xl sm:text-4xl font-bold text-primary mb-1 tracking-tight text-mono">{optimizationData.originalScore}</div>
                                                            <div className="text-gray-500 text-[10px] font-black uppercase tracking-widest">Original Score</div>
                                                        </div>
                                                        <div>
                                                            <div className="text-2xl sm:text-4xl font-bold text-brand mb-1 tracking-tight text-mono">+{optimizationData.improvement}</div>
                                                            <div className="text-gray-500 text-[10px] font-black uppercase tracking-widest">Improvement</div>
                                                        </div>
                                                        <div>
                                                            <div className="text-2xl sm:text-4xl font-bold text-primary mb-1 tracking-tight underline decoration-brand-primary decoration-4 underline-offset-4 text-mono">{optimizationData.optimizedScore}</div>
                                                            <div className="text-gray-500 text-[10px] font-black uppercase tracking-widest">Final Score</div>
                                                        </div>
                                                    </div>
                                                    <div className="text-center mt-4">
                                                        <span className="text-gray-500/50 text-[9px] font-black uppercase tracking-[0.3em] text-mono">{optimizationData.iterations} Alignment Iterations</span>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Tab Navigation - Issue 4 */}
                                            <div className="flex gap-1 sm:gap-2 border-b border-gray-200 pb-0 overflow-x-auto">
                                                {[
                                                    { id: 'resume', label: 'Resume Output', icon: '📄' },
                                                    { id: 'details', label: 'Analysis Details', icon: '📊' },
                                                    { id: 'coverLetter', label: 'Cover Letter', icon: '✉️' },
                                                ].map((tab) => (
                                                    <button
                                                        key={tab.id}
                                                        onClick={() => setActiveResultTab(tab.id)}
                                                        className={`px-3 sm:px-6 py-2 sm:py-3 text-xs sm:text-sm font-semibold tracking-tight transition-all rounded-t-xl border border-b-0 whitespace-nowrap ${activeResultTab === tab.id
                                                            ? 'bg-surface border-gray-200 text-primary -mb-px'
                                                            : 'border-transparent text-gray-500 hover:text-primary hover:bg-white/5'
                                                            }`}
                                                    >
                                                        <span className="mr-2">{tab.icon}</span>
                                                        {tab.label}
                                                    </button>
                                                ))}
                                            </div>

                                            {/* Tab Content: Resume Output */}
                                            {activeResultTab === 'resume' && (
                                                <Motion.div
                                                    key="tab-resume"
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    className="space-y-8"
                                                >
                                                    {/* Split Pane Layout */}
                                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:h-162.5">
                                                        {/* Left: Visual Editor */}
                                                        <div className="flex flex-col h-100 lg:h-auto">
                                                            <VisualResumeEditor
                                                                latexCode={optimizedLatex}
                                                                onChange={setOptimizedLatex}
                                                                onRecompile={handleCompileLatex}
                                                                isCompiling={isCompiling}
                                                            />
                                                        </div>

                                                        {/* Right: PDF Preview */}
                                                        <div className="flex flex-col space-y-4 h-125 lg:h-auto">
                                                            <div className="flex justify-between items-center px-1">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse" />
                                                                    <label className="text-mono text-[9px] font-bold uppercase tracking-[0.4em] text-gray-500">PDF_Preview</label>
                                                                </div>
                                                            </div>

                                                            {/* PDF Viewer Container */}
                                                            <div className="flex-1 relative bg-white border border-gray-200 rounded-4xl overflow-hidden group">
                                                                {compiledPdfUrl ? (
                                                                    <PdfViewer
                                                                        url={compiledPdfUrl}
                                                                        filename="optimized_resume.pdf"
                                                                        className="opacity-90 group-hover:opacity-100 transition-opacity"
                                                                        title="PDF Preview"
                                                                    />
                                                                ) : (
                                                                    <div className="flex items-center justify-center h-full text-gray-500">
                                                                        {isCompiling ? (
                                                                            <div className="text-center space-y-4">
                                                                                <div className="w-12 h-12 mx-auto relative">
                                                                                    <Motion.div
                                                                                        animate={{ rotate: 360 }}
                                                                                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                                                                                        className="absolute inset-0 border-2 border-brand-primary border-t-transparent rounded-full"
                                                                                    />
                                                                                </div>
                                                                                <p className="text-mono text-[8px] font-black uppercase tracking-widest">Loading Preview</p>
                                                                            </div>
                                                                        ) : (
                                                                            <div className="text-center px-10 space-y-6">
                                                                                <svg className="w-16 h-16 mx-auto text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                                                                </svg>
                                                                                <p className="text-mono text-[9px] font-black uppercase tracking-[0.3em] leading-relaxed max-w-50pacity-40">Click "Refresh View" above to <br />preview your resume.</p>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </Motion.div>
                                            )}

                                            {/* Tab Content: Analysis Details - Issue 4 */}
                                            {activeResultTab === 'details' && optimizationData && (
                                                <Motion.div
                                                    key="tab-details"
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    className="space-y-8"
                                                >
                                                    {/* Score Progression */}
                                                    {optimizationData.scoreProgression.length > 1 && (
                                                        <div className="bg-surface/50 border border-gray-200 rounded-2xl p-8">
                                                            <h3 className="text-primary font-black text-[10px] uppercase tracking-widest mb-4 italic">Score Progression</h3>
                                                            <div className="flex items-center gap-4">
                                                                {optimizationData.scoreProgression.map((score, index) => (
                                                                    <React.Fragment key={index}>
                                                                        <div className={`flex-1 py-3 px-4 rounded-xl text-center font-black italic tracking-tighter text-xl text-mono ${index === optimizationData.scoreProgression.length - 1
                                                                            ? 'bg-brand text-white shadow-lg scale-105'
                                                                            : 'bg-secondary text-gray-500 border border-gray-200'
                                                                            }`}>
                                                                            {score}
                                                                        </div>
                                                                        {index < optimizationData.scoreProgression.length - 1 && (
                                                                            <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                                                            </svg>
                                                                        )}
                                                                    </React.Fragment>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Job Requirements */}
                                                    <div className="bg-surface/50 border border-gray-200 rounded-2xl p-8">
                                                        <h3 className="text-lg font-semibold text-primary mb-1 tracking-tight">Job Requirements</h3>
                                                        <p className="text-gray-500 text-sm mb-6">Extracted from job description</p>
                                                        <div className="space-y-6">
                                                            <div>
                                                                <h4 className="text-primary font-semibold text-sm mb-3">Key Requirements (Must Have)</h4>
                                                                <div className="flex flex-wrap gap-2">
                                                                    {optimizationData.jobRequirements.mustHave?.map((skill) => (
                                                                        <span key={skill} className="px-4 py-1.5 bg-brand text-white rounded-full text-[10px] font-black uppercase tracking-widest text-mono">{skill}</span>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                            <div>
                                                                <h4 className="text-primary font-semibold text-sm mb-3">Preferred Skills</h4>
                                                                <div className="flex flex-wrap gap-2">
                                                                    {optimizationData.jobRequirements.niceToHave?.map((skill) => (
                                                                        <span key={skill} className="px-4 py-1.5 bg-secondary text-secondary border border-gray-200 rounded-full text-[10px] font-black uppercase tracking-widest text-mono">{skill}</span>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                            <div>
                                                                <h4 className="text-primary font-semibold text-sm mb-3">Core Keywords</h4>
                                                                <div className="flex flex-wrap gap-2">
                                                                    {optimizationData.jobRequirements.keywords?.map((keyword) => (
                                                                        <span key={keyword} className="px-4 py-1.5 bg-brand/10 text-brand border border-brand-primary/20 rounded-full text-[10px] font-black uppercase tracking-widest text-mono">{keyword}</span>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                            <div className="pt-3 border-t border-gray-200">
                                                                <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest text-mono">
                                                                    Experience Level: <span className="text-primary ml-2">{optimizationData.jobRequirements.seniorityLevel}</span>
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Resume Analysis */}
                                                    <div className="bg-surface/50 border border-gray-200 rounded-2xl p-4 sm:p-8">
                                                        <h3 className="text-lg font-semibold text-primary mb-1 tracking-tight">Resume Analysis</h3>
                                                        <p className="text-gray-500 text-sm mb-6">Internal profile audit</p>
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-8">
                                                            <div>
                                                                <h4 className="text-brand font-black text-[10px] uppercase tracking-widest mb-4 italic">Strengths</h4>
                                                                <ul className="space-y-2">
                                                                    {optimizationData.resumeAnalysis.skillsPresent?.map((skill) => (
                                                                        <li key={skill} className="text-primary text-sm font-medium flex items-center gap-3">
                                                                            <div className="w-1.5 h-1.5 bg-brand rounded-full" />
                                                                            {skill}
                                                                        </li>
                                                                    ))}
                                                                </ul>
                                                            </div>
                                                            <div>
                                                                <h4 className="text-red-500 font-black text-[10px] uppercase tracking-widest mb-4 italic">Missing Keywords</h4>
                                                                <ul className="space-y-2">
                                                                    {optimizationData.resumeAnalysis.skillsMissing?.map((skill) => (
                                                                        <li key={skill} className="text-gray-500 text-sm font-medium flex items-center gap-3">
                                                                            <div className="w-1.5 h-1.5 bg-red-500/30 rounded-full" />
                                                                            {skill}
                                                                        </li>
                                                                    ))}
                                                                </ul>
                                                            </div>
                                                            <div>
                                                                <h4 className="text-primary font-black text-[10px] uppercase tracking-widest mb-4 italic">Suggestions</h4>
                                                                <ul className="space-y-2">
                                                                    {optimizationData.resumeAnalysis.strongSections?.map((s) => (
                                                                        <li key={s} className="text-secondary text-sm font-medium flex items-center gap-3">
                                                                            <div className="w-3 h-0.5g-brand/30" />
                                                                            {s}
                                                                        </li>
                                                                    ))}
                                                                </ul>
                                                            </div>
                                                            <div>
                                                                <h4 className="text-primary font-black text-[10px] uppercase tracking-widest mb-4 italic">Areas to Improve</h4>
                                                                <ul className="space-y-2">
                                                                    {optimizationData.resumeAnalysis.weakSections?.map((s) => (
                                                                        <li key={s} className="text-secondary text-sm font-medium flex items-center gap-3">
                                                                            <div className="w-3 h-0.5 bg-red-500/20" />
                                                                            {s}
                                                                        </li>
                                                                    ))}
                                                                </ul>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Optimization Steps/Changes */}
                                                    {optimizationData.changes.length > 0 && (
                                                        <div className="bg-surface/50 border border-gray-200 rounded-2xl p-8">
                                                            <h3 className="text-lg font-semibold text-primary mb-1 tracking-tight">Optimization Steps</h3>
                                                            <p className="text-gray-500 text-sm mb-6">Real agent node-by-node decisions during optimization</p>
                                                            <div className="space-y-3">
                                                                {optimizationData.changes.map((change) => (
                                                                    <div key={change.id} className="bg-secondary rounded-2xl p-5 border border-gray-100 transition-all hover:bg-surface">
                                                                        <div className="flex items-start gap-4">
                                                                            <div className="w-8 h-8 bg-brand/10 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                                                                                <svg className="w-4 h-4 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                                                                </svg>
                                                                            </div>
                                                                            <div className="flex-1 min-w-0">
                                                                                <h4 className="text-primary font-semibold text-sm mb-0.5">{change.title}</h4>
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
                                                </Motion.div>
                                            )}

                                            {/* Tab Content: Cover Letter - Issue 4 */}
                                            {activeResultTab === 'coverLetter' && optimizationData && (
                                                <Motion.div
                                                    key="tab-coverletter"
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    className="space-y-6"
                                                >
                                                    <div className="bg-surface/50 border border-gray-200 rounded-2xl p-8">
                                                        <div className="flex justify-between items-start mb-6">
                                                            <div>
                                                                <h3 className="text-lg font-semibold text-primary mb-1 tracking-tight">Cover Letter</h3>
                                                                <p className="text-gray-500 text-sm">AI-generated cover letter tailored to the job</p>
                                                            </div>
                                                            <button
                                                                onClick={() => {
                                                                    navigator.clipboard.writeText(optimizationData.coverLetter);
                                                                    setCoverLetterCopied(true);
                                                                    setTimeout(() => setCoverLetterCopied(false), 2000);
                                                                }}
                                                                className="px-5 py-2 bg-brand text-white rounded-xl font-semibold text-sm tracking-wide transition-all flex items-center gap-2 hover:bg-white active:scale-95"
                                                            >
                                                                {coverLetterCopied ? (
                                                                    <>
                                                                        <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                                        </svg>
                                                                        <span className="text-green-500">Copied!</span>
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
                                                        <div className="bg-secondary rounded-2xl p-8 border border-gray-100">
                                                            <pre className="text-secondary text-sm whitespace-pre-wrap font-medium leading-relaxed">
                                                                {optimizationData.coverLetter}
                                                            </pre>
                                                        </div>
                                                    </div>
                                                </Motion.div>
                                            )}

                                            {/* Bottom Actions */}
                                            <div className="flex flex-col sm:flex-row gap-6 mt-12 justify-between items-center border-t border-white/5 pt-10">
                                                <button
                                                    onClick={resetForm}
                                                    className="px-10 py-5 bg-white/5 hover:bg-white/10 text-gray-500 hover:text-primary rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] transition-all flex items-center gap-4 border border-gray-100"
                                                >
                                                    <svg className="w-5 h-5 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                                    </svg>
                                                    <span>Start Over</span>
                                                </button>

                                                <div className="flex flex-col sm:flex-row gap-6 w-full sm:w-auto">
                                                    <button
                                                        onClick={() => navigate('/dashboard')}
                                                        className="px-8 py-5 text-gray-500 hover:text-primary font-black text-[10px] uppercase tracking-[0.3em] transition-all"
                                                    >
                                                        Exit
                                                    </button>

                                                    <button
                                                        onClick={handleDownloadPdf}
                                                        disabled={!compiledPdfUrl}
                                                        className={`group relative px-12 py-5 rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] transition-all flex items-center gap-4 ${compiledPdfUrl
                                                            ? 'bg-brand text-white hover:bg-brand-hover shadow-[0_20px_40px_-10px_rgba(255,75,114,0.3)] hover:scale-105 active:scale-95'
                                                            : 'bg-secondary text-gray-500 cursor-not-allowed border border-gray-200/50'
                                                            }`}
                                                    >
                                                        <svg className="w-5 h-5 group-hover:translate-y-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                                        </svg>
                                                        <span>Download PDF</span>
                                                    </button>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </Motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
                {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

                {/* Error / Poor Fit Dialog */}
                {errorDialog && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[300] flex items-center justify-center p-4">
                        <div className="bg-surface border border-gray-200 rounded-[2rem] p-8 shadow-2xl shadow-black/20 max-w-md w-full">
                            <div className="flex items-start gap-4 mb-6">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${errorDialog.type === 'poor_fit' ? 'bg-amber-500/10' : 'bg-red-500/10'}`}>
                                    {errorDialog.type === 'poor_fit' ? (
                                        <svg className="w-6 h-6 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                        </svg>
                                    ) : (
                                        <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-primary font-bold text-base mb-2">{errorDialog.title}</h3>
                                    <p className="text-secondary text-sm leading-relaxed">{errorDialog.message}</p>
                                </div>
                            </div>
                            {errorDialog.type === 'poor_fit' && (
                                <div className="mb-6 p-4 bg-amber-500/5 border border-amber-500/20 rounded-2xl">
                                    <p className="text-amber-600 text-xs font-semibold leading-relaxed">
                                        Try updating your resume to include more relevant skills and keywords that match the job requirements before retrying.
                                    </p>
                                </div>
                            )}
                            <button
                                onClick={() => setErrorDialog(null)}
                                className="w-full py-3 bg-brand text-white rounded-2xl font-semibold text-sm tracking-wide hover:bg-brand-hover transition-all active:scale-95"
                            >
                                Understood
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
