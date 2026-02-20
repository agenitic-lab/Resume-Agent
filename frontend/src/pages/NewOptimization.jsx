import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import Toast from '../components/Toast';
import { runOptimization, getApiKeyStatus } from '../services/api';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

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
    const [copyButtonText, setCopyButtonText] = useState('Copy');
    const [hasApiKey, setHasApiKey] = useState(null); // null = loading, true/false = status

    // check API key status on mount
    useEffect(() => {
        async function checkApiKey() {
            try {
                const status = await getApiKeyStatus();
                setHasApiKey(status.has_api_key);
            } catch (error) {
                console.error('Failed to check API key status:', error);
                setHasApiKey(false);
            }
        }
        checkApiKey();
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
        { number: 1, name: 'Archive Select', code: 'PROT_01', icon: '📝' },
        { number: 2, name: 'Source Inject', code: 'PROT_02', icon: '📄' },
        { number: 3, name: 'Target Parameter', code: 'PROT_03', icon: '💼' },
        { number: 4, name: 'Neural Sync', code: 'PROT_04', icon: '⚡' }
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
            });

            if (!response.ok) {
                throw new Error('PDF extraction failed');
            }

            const data = await response.json();
            setExtractedText(data.text);
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
            });

            if (!response.ok) {
                throw new Error('LaTeX compilation failed');
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
    const canProceedStep3 = jobDescription.trim().length >= 50;

    const handleContinue = () => {
        if (currentStep === 1 && canProceedStep1) {
            setCurrentStep(2);
        } else if (currentStep === 2 && canProceedStep2) {
            setCurrentStep(3);
        } else if (currentStep === 3 && canProceedStep3) {
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
    };

    const simulateAgentOptimization = async () => {
        setIsOptimizing(true);
        try {
            const resumeContent = inputType === 'pdf' ? extractedText : resumeText;

            const data = await runOptimization(jobDescription, resumeContent);
            console.log('Optimization response:', {
                final_status: data.final_status,
                fit_decision: data.fit_decision,
                has_modified_resume: !!data.modified_resume
            });

            // Check if optimization was rejected due to poor fit
            if (data.final_status === 'rejected_poor_fit' || data.fit_decision === 'poor_fit') {
                const reason = data.fit_reason || 'Your profile does not match the job requirements sufficiently.';
                setToast({
                    message: `Optimization skipped: ${reason}`,
                    type: 'warning'
                });
                setCurrentStep(3);
                return;
            }

            if (data.modified_resume && data.modified_resume.trim()) {
                const optimizedLatexCode = data.modified_resume;
                setOptimizedLatex(optimizedLatexCode);

                // Compile the optimized LaTeX
                setIsCompiling(true);
                try {
                    const response = await fetch(`${API_BASE_URL}/api/latex/compile`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ latex_code: optimizedLatexCode }),
                    });

                    if (response.ok) {
                        const blob = await response.blob();
                        const url = window.URL.createObjectURL(blob);
                        setCompiledPdfUrl(url);
                        setToast({ message: 'Optimization completed successfully!', type: 'success' });
                    } else {
                        throw new Error('LaTeX compilation failed');
                    }
                } catch (compileError) {
                    console.error('Compilation error:', compileError);
                    setToast({ message: 'Optimization succeeded but PDF compilation failed. Check LaTeX syntax.', type: 'warning' });
                } finally {
                    setIsCompiling(false);
                }
            } else {
                throw new Error('No optimized resume returned from server');
            }
        } catch (error) {
            console.error('Optimization failed:', error);
            const errorMsg = error.message || 'Unknown error';

            // Check if it's an API key issue
            if (errorMsg.includes('API key') || errorMsg.includes('Settings')) {
                setToast({
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
        <div className="min-h-screen bg-bg-primary text-text-primary p-8">
            {/* API Key Warning Banner */}
            {hasApiKey === false && (
                <div className="max-w-4xl mx-auto mb-8">
                    <div className="bg-bg-surface border-l-4 border-brand-primary rounded-2xl p-8 shadow-xl shadow-black/5 flex items-start gap-6">
                        <div className="w-12 h-12 bg-brand-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                            <svg className="w-6 h-6 text-brand-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                        <div className="flex-1">
                            <h3 className="text-xl font-black text-text-primary mb-2 italic tracking-tighter uppercase font-black">Groq API Key Required</h3>
                            <p className="text-text-secondary font-medium mb-4 leading-relaxed">
                                You need to add your Groq API key to use the resume optimization feature.
                                Get your free API key from{' '}
                                <a
                                    href="https://console.groq.com/keys"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-brand-primary hover:underline font-black"
                                >
                                    console.groq.com/keys
                                </a>
                            </p>
                            <button
                                onClick={() => navigate('/settings')}
                                className="px-6 py-2.5 bg-text-primary text-bg-primary rounded-xl font-black text-[10px] uppercase tracking-widest transition-all hover:bg-white hover:text-black active:scale-95"
                            >
                                Go to Settings
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Step Indicator - Technical Version */}
            <div className="max-w-5xl mx-auto mb-16 relative">
                <div className="flex items-center justify-between px-4">
                    {steps.map((step, index) => (
                        <React.Fragment key={step.number}>
                            <div className="flex flex-col items-center relative z-10 w-32">
                                <div
                                    className={`w-12 h-12 rounded-xl flex items-center justify-center font-black transition-all duration-500 border-2 ${currentStep === step.number
                                        ? 'bg-brand-primary border-brand-primary text-black shadow-[0_0_20px_rgba(141,163,74,0.3)] scale-110'
                                        : currentStep > step.number
                                            ? 'bg-text-primary border-text-primary text-bg-primary'
                                            : 'bg-bg-primary border-border-muted text-text-muted hover:border-brand-primary/30'
                                        }`}
                                >
                                    <span className="font-mono text-base font-black">0{step.number}</span>
                                </div>
                                <div className="mt-4 text-center">
                                    <div className={`text-mono text-[8px] font-bold uppercase tracking-[0.3em] mb-1 ${currentStep === step.number ? 'text-brand-primary' : 'text-text-muted'}`}>
                                        {step.code}
                                    </div>
                                    <div className={`text-[9px] font-black uppercase tracking-widest ${currentStep === step.number ? 'text-text-primary' : 'text-text-muted'}`}>
                                        {step.name}
                                    </div>
                                </div>
                            </div>
                            {index < steps.length - 1 && (
                                <div className="flex-1 px-4 mt-6">
                                    <div className="h-[1px] relative">
                                        <div className="absolute inset-0 bg-border-subtle" />
                                        <Motion.div
                                            initial={{ width: "0%" }}
                                            animate={{ width: currentStep > step.number ? "100%" : "0%" }}
                                            className="absolute inset-0 bg-brand-primary shadow-[0_0_10px_rgba(141,163,74,0.5)]"
                                        />
                                    </div>
                                </div>
                            )}
                        </React.Fragment>
                    ))}
                </div>
            </div>

            {/* Main Content Container with Background Grid */}
            <div className="max-w-5xl mx-auto relative min-h-[600px]">
                {/* Background Decoration */}
                <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
                    <div className="absolute inset-0 cyber-grid opacity-20" />
                    <div className="absolute top-[20%] right-[10%] w-[500px] h-[500px] bg-brand-primary/5 blur-[120px] rounded-full" />
                </div>

                {/* Diagnostic Frame */}
                <div className="relative z-10 bg-bg-surface/30 backdrop-blur-xl border border-border-muted rounded-[2.5rem] overflow-hidden shadow-2xl shadow-black/40">
                    <div className="absolute top-0 left-0 w-full h-1 bg-brand-primary/20" />

                    {/* Corner Markers */}
                    <div className="absolute top-4 left-4 w-4 h-4 border-t border-l border-brand-primary/30" />
                    <div className="absolute top-4 right-4 w-4 h-4 border-t border-r border-brand-primary/30" />
                    <div className="absolute bottom-4 left-4 w-4 h-4 border-b border-l border-brand-primary/30" />
                    <div className="absolute bottom-4 right-4 w-4 h-4 border-b border-r border-brand-primary/30" />

                    <div className="p-12">
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
                                        <div className="text-mono text-[10px] text-brand-primary font-black uppercase tracking-[0.5em] mb-4">Phase_01 // ARCHIVE_SELECT</div>
                                        <h2 className="text-4xl md:text-6xl font-black text-text-primary mb-4 italic tracking-tighter uppercase leading-none">
                                            Select <span className="text-brand-primary">Source.</span>
                                        </h2>
                                        <p className="text-text-secondary font-medium tracking-tight opacity-70">
                                            Initialize the optimization protocol by selecting your primary professional archive.
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        {[
                                            { id: 'pdf', label: 'PDF Archive', desc: 'Binary file ingestion for existing resumes.', code: 'SRC_TYPE_01', icon: '📄' },
                                            { id: 'latex', label: 'LaTeX Source', desc: 'Direct code injection for maximum structural control.', code: 'SRC_TYPE_02', icon: '📝' }
                                        ].map((opt) => (
                                            <button
                                                key={opt.id}
                                                onClick={() => setInputType(opt.id)}
                                                className={`group relative p-12 rounded-[2rem] border transition-all duration-500 text-left overflow-hidden ${inputType === opt.id
                                                    ? 'border-brand-primary bg-brand-primary/5 shadow-[0_0_40px_rgba(141,163,74,0.1)]'
                                                    : 'border-border-muted hover:border-text-secondary hover:bg-white/[0.02]'
                                                    }`}
                                            >
                                                {/* Numeric Anchor */}
                                                <div className="absolute -bottom-8 -right-4 text-9xl font-black text-text-primary opacity-[0.03] select-none italic group-hover:opacity-[0.06] transition-opacity">
                                                    0{opt.id === 'pdf' ? 1 : 2}
                                                </div>

                                                <div className="relative z-10">
                                                    <div className="flex justify-between items-start mb-8">
                                                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl transition-transform duration-500 group-hover:scale-110 ${inputType === opt.id ? 'bg-brand-primary text-black' : 'bg-bg-secondary text-text-muted'}`}>
                                                            {opt.icon}
                                                        </div>
                                                        <div className="text-mono text-[9px] font-bold text-text-muted uppercase tracking-widest">{opt.code}</div>
                                                    </div>
                                                    <h3 className={`text-2xl font-black mb-3 italic tracking-tighter uppercase transition-colors ${inputType === opt.id ? 'text-text-primary' : 'text-text-secondary'}`}>
                                                        {opt.label}
                                                    </h3>
                                                    <p className={`text-[10px] font-black uppercase tracking-widest leading-relaxed transition-opacity ${inputType === opt.id ? 'text-brand-primary opacity-100' : 'text-text-muted opacity-50'}`}>
                                                        {opt.desc}
                                                    </p>
                                                </div>

                                                {/* Hover glint */}
                                                <div className="absolute inset-0 bg-gradient-to-tr from-brand-primary/0 via-brand-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
                                            </button>
                                        ))}
                                    </div>

                                    <div className="flex justify-end pt-8">
                                        <button
                                            onClick={handleContinue}
                                            disabled={!canProceedStep1}
                                            className={`group relative px-12 py-5 rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] transition-all flex items-center gap-4 ${canProceedStep1
                                                ? 'bg-brand-primary text-black hover:bg-brand-hover shadow-[0_20px_40px_-10px_rgba(141,163,74,0.3)] hover:scale-105 active:scale-95'
                                                : 'bg-bg-secondary text-text-muted cursor-not-allowed border border-border-muted/50'
                                                }`}
                                        >
                                            <span>Initialize Phase 02</span>
                                            <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                            </svg>
                                        </button>
                                    </div>
                                </Motion.div>
                            )}

                            {/* Step 2: Source Inject */}
                            {currentStep === 2 && (
                                <Motion.div
                                    key="step2"
                                    initial={{ opacity: 0, scale: 0.98 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 1.02 }}
                                    className="space-y-10"
                                >
                                    <div className="text-center max-w-2xl mx-auto">
                                        <div className="text-mono text-[10px] text-brand-primary font-black uppercase tracking-[0.5em] mb-4">Phase_02 // SOURCE_INJECT</div>
                                        <h2 className="text-4xl md:text-6xl font-black text-text-primary mb-4 italic tracking-tighter uppercase leading-none">
                                            {inputType === 'pdf' ? 'Archive' : 'Code'} <span className="text-brand-primary">Injection.</span>
                                        </h2>
                                        <p className="text-text-secondary font-medium tracking-tight opacity-70">
                                            {inputType === 'pdf' ? 'Securely upload your professional archive for deconstruction.' : 'Inject your LaTeX source code into the neural parser.'}
                                        </p>
                                    </div>

                                    {inputType === 'pdf' ? (
                                        <div className="space-y-8">
                                            <div
                                                onDrop={handleDrop}
                                                onDragOver={handleDragOver}
                                                onDragLeave={handleDragLeave}
                                                className={`relative border border-dashed rounded-[2rem] p-16 text-center transition-all duration-500 overflow-hidden ${isDragging
                                                    ? 'border-brand-primary bg-brand-primary/10 shadow-[inner_0_0_40px_rgba(141,163,74,0.1)]'
                                                    : 'border-border-muted hover:border-brand-primary/30 bg-white/[0.02]'
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
                                                            <div className="w-24 h-24 mx-auto bg-brand-primary/10 rounded-3xl flex items-center justify-center relative">
                                                                <svg className="w-10 h-10 text-brand-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                                </svg>
                                                                <Motion.div
                                                                    animate={{ rotate: 360 }}
                                                                    transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                                                                    className="absolute inset-0 border-2 border-brand-primary/30 border-t-transparent rounded-3xl"
                                                                />
                                                            </div>
                                                            <div>
                                                                <p className="text-xl font-black text-text-primary tracking-tight mb-1">{resumeFile.name}</p>
                                                                <div className="text-mono text-[9px] font-bold text-brand-primary uppercase tracking-[0.3em]">
                                                                    {isExtracting ? 'DECONSTRUCTING_DATA...' : 'METADATA_EXTRACTED'}
                                                                </div>
                                                            </div>
                                                            <button
                                                                onClick={() => {
                                                                    setResumeFile(null);
                                                                    setExtractedText('');
                                                                }}
                                                                className="px-8 py-2.5 border border-border-muted hover:border-red-500/50 hover:bg-red-500/5 text-text-muted hover:text-red-500 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all"
                                                            >
                                                                Reset Archive
                                                            </button>
                                                        </Motion.div>
                                                    ) : (
                                                        <Motion.div
                                                            key="drop-prompt"
                                                            initial={{ opacity: 0 }}
                                                            animate={{ opacity: 1 }}
                                                            className="space-y-8"
                                                        >
                                                            <div className="w-24 h-24 mx-auto bg-brand-primary/5 rounded-[2rem] flex items-center justify-center border border-brand-primary/20">
                                                                <svg className="w-10 h-10 text-brand-primary/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                                                </svg>
                                                            </div>
                                                            <div>
                                                                <p className="text-2xl font-black text-text-primary mb-3 italic tracking-tighter uppercase">Drop PDF Archive</p>
                                                                <p className="text-text-muted text-[10px] font-black uppercase tracking-[0.3em] mb-8">or click to initialize local search</p>
                                                                <label
                                                                    htmlFor="pdf-upload"
                                                                    className="inline-block px-12 py-4 bg-text-primary text-bg-primary rounded-2xl cursor-pointer font-black text-[10px] uppercase tracking-[0.4em] hover:bg-white transition-all active:scale-95 shadow-xl"
                                                                >
                                                                    Initialize Upload
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
                                                        <label className="text-mono text-[9px] text-text-muted uppercase tracking-[0.4em]">Extracted_Data_Stream // READ_ONLY</label>
                                                        <div className="w-2 h-2 rounded-full bg-brand-primary animate-pulse" />
                                                    </div>
                                                    <div className="relative group">
                                                        <textarea
                                                            value={extractedText}
                                                            readOnly
                                                            className="w-full h-48 p-8 bg-black/40 border border-border-muted rounded-[2rem] text-text-secondary font-mono text-xs resize-none focus:outline-none focus:border-brand-primary/30 transition-all custom-scrollbar"
                                                        />
                                                        <div className="absolute top-4 right-4 text-[8px] text-text-muted/30 font-mono uppercase">System_Verify_v4.2</div>
                                                    </div>
                                                </Motion.div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="space-y-6">
                                            <div className="flex justify-between items-center">
                                                <label className="text-mono text-[9px] text-text-muted uppercase tracking-[0.4em]">LaTeX_Source_Buffer</label>
                                                <div className="flex items-center gap-4">
                                                    <div className="text-[10px] text-brand-primary font-bold">STABILITY: 100%</div>
                                                    <div className="w-2 h-2 rounded-full bg-brand-primary" />
                                                </div>
                                            </div>
                                            <div className="relative group">
                                                <textarea
                                                    value={resumeText}
                                                    onChange={(e) => setResumeText(e.target.value)}
                                                    placeholder="\\documentclass{article}\n\\begin{document}\nPaste high-fidelity source code here...\n\\end{document}"
                                                    className="w-full h-[400px] p-10 bg-black/40 border border-border-muted rounded-[2.5rem] text-text-primary placeholder-text-muted/30 focus:outline-none focus:border-brand-primary/30 transition-all font-mono text-sm resize-none custom-scrollbar shadow-inner"
                                                />
                                                <div className="absolute top-4 right-4 text-[8px] text-text-muted/30 font-mono uppercase">Source_Controller_v1</div>
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex justify-between pt-10 border-t border-white/5">
                                        <button
                                            onClick={handleBack}
                                            className="px-10 py-5 bg-white/5 hover:bg-white/10 text-text-muted hover:text-text-primary rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] transition-all flex items-center gap-4 border border-border-subtle"
                                        >
                                            <svg className="w-5 h-5 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" />
                                            </svg>
                                            <span>Abandon Phase</span>
                                        </button>

                                        <button
                                            onClick={handleContinue}
                                            disabled={!canProceedStep2 || isExtracting}
                                            className={`group relative px-12 py-5 rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] transition-all flex items-center gap-4 ${canProceedStep2 && !isExtracting
                                                ? 'bg-brand-primary text-black hover:bg-brand-hover shadow-[0_20px_40px_-10px_rgba(141,163,74,0.3)] hover:scale-105 active:scale-95'
                                                : 'bg-bg-secondary text-text-muted cursor-not-allowed border border-border-muted/50'
                                                }`}
                                        >
                                            <span>Initialize Phase 03</span>
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
                                        <div className="text-mono text-[10px] text-brand-primary font-black uppercase tracking-[0.5em] mb-4">Phase_03 // TARGET_PARAMETERS</div>
                                        <h2 className="text-4xl md:text-6xl font-black text-text-primary mb-4 italic tracking-tighter uppercase leading-none">
                                            Job <span className="text-brand-primary">Nexus.</span>
                                        </h2>
                                        <p className="text-text-secondary font-medium tracking-tight opacity-70">
                                            Define the target alignment vectors for the neural synthesis engine.
                                        </p>
                                    </div>

                                    <div className="space-y-6">
                                        <div className="flex justify-between items-center">
                                            <label className="text-mono text-[9px] text-text-muted uppercase tracking-[0.4em]">Market_Requirement_Buffer</label>
                                            <div className="flex items-center gap-4">
                                                <div className="text-[10px] text-brand-primary font-bold uppercase tracking-widest leading-none">Min Threshold // 50 Units</div>
                                            </div>
                                        </div>
                                        <div className="relative">
                                            <textarea
                                                value={jobDescription}
                                                onChange={(e) => setJobDescription(e.target.value)}
                                                placeholder="Paste the complete target job description here..."
                                                className="w-full h-80 p-10 bg-black/40 border border-border-muted rounded-[2.5rem] text-text-primary placeholder-text-muted/30 focus:outline-none focus:border-brand-primary/30 transition-all resize-none custom-scrollbar shadow-inner text-sm font-medium leading-relaxed"
                                            />
                                            <div className="absolute bottom-6 right-8 flex items-center gap-4">
                                                <div className="h-1.5 w-32 rounded-full overflow-hidden bg-white/5 border border-white/5">
                                                    <Motion.div
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${Math.min(100, (jobDescription.length / 50) * 100)}%` }}
                                                        className={`h-full shadow-[0_0_10px_rgba(141,163,74,0.5)] ${jobDescription.length >= 50 ? 'bg-brand-primary' : 'bg-brand-primary/20'}`}
                                                    />
                                                </div>
                                                <p className={`text-mono text-[9px] font-black uppercase tracking-widest ${jobDescription.length >= 50 ? 'text-brand-primary' : 'text-text-muted'}`}>
                                                    {String(jobDescription.length).padStart(3, '0')} UNITS
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex justify-between pt-10 border-t border-white/5">
                                        <button
                                            onClick={handleBack}
                                            className="px-10 py-5 bg-white/5 hover:bg-white/10 text-text-muted hover:text-text-primary rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] transition-all flex items-center gap-4 border border-border-subtle"
                                        >
                                            <svg className="w-5 h-5 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" />
                                            </svg>
                                            <span>Withdraw Phase</span>
                                        </button>

                                        <button
                                            onClick={handleContinue}
                                            disabled={!canProceedStep3}
                                            className={`group relative px-12 py-5 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all flex items-center gap-4 ${canProceedStep3
                                                ? 'bg-brand-primary text-black hover:bg-brand-hover shadow-[0_20px_40px_-10px_rgba(141,163,74,0.3)] hover:scale-105 active:scale-95'
                                                : 'bg-bg-secondary text-text-muted cursor-not-allowed border border-border-muted/50'
                                                }`}
                                        >
                                            <svg className="w-5 h-5 group-hover:rotate-12 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                            </svg>
                                            <span>Execute Neural Sync</span>
                                        </button>
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
                                        <div className="text-mono text-[10px] text-brand-primary font-black uppercase tracking-[0.5em] mb-4">Phase_04 // NEURAL_SYNTHESIS</div>
                                        <h2 className="text-4xl md:text-6xl font-black text-text-primary mb-4 italic tracking-tighter uppercase leading-none">
                                            Optimization <span className="text-brand-primary">Output.</span>
                                        </h2>
                                        <p className="text-text-secondary font-medium tracking-tight opacity-70">
                                            System deconstruction and synthesis complete. Diagnostic results available below.
                                        </p>
                                    </div>

                                    {!optimizedLatex ? (
                                        <div className="text-center py-24 flex flex-col items-center">
                                            <div className="w-32 h-32 mb-12 relative">
                                                <Motion.div
                                                    animate={{ rotate: 360 }}
                                                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                                                    className="absolute inset-0 border-4 border-brand-primary border-t-transparent rounded-full"
                                                />
                                                <Motion.div
                                                    animate={{ rotate: -360 }}
                                                    transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
                                                    className="absolute inset-4 border border-brand-primary/20 border-b-transparent rounded-full"
                                                />
                                                <div className="absolute inset-0 flex items-center justify-center">
                                                    <div className="w-2 h-2 bg-brand-primary rounded-full animate-pulse" />
                                                </div>
                                            </div>
                                            <div className="space-y-6 font-mono max-w-md w-full">
                                                <div className="text-sm font-black text-text-primary italic tracking-widest animate-pulse">SYNTHESIZING_OPTIMAL_PATH...</div>
                                                <div className="grid grid-cols-1 gap-1 text-[8px] text-text-muted uppercase tracking-[0.2em] text-left">
                                                    {[
                                                        { label: 'INITIALIZING_ATS_PARSER', status: 'OK' },
                                                        { label: 'VECTOR_ALIGNMENT_ACTIVE', status: 'RUNNING' },
                                                        { label: 'SURGICAL_KEYWORD_INJECTION', status: 'PENDING' },
                                                        { label: 'HEURISTIC_SCORE_CALCULATION', status: 'PENDING' }
                                                    ].map((log, i) => (
                                                        <Motion.div
                                                            key={log.label}
                                                            initial={{ opacity: 0, x: -10 }}
                                                            animate={{ opacity: 1, x: 0 }}
                                                            transition={{ delay: i * 0.4 }}
                                                            className="flex justify-between border-b border-white/5 py-1"
                                                        >
                                                            <span>[{log.label}]</span>
                                                            <span className={log.status === 'OK' ? 'text-brand-primary' : 'text-text-muted'}>// {log.status}</span>
                                                        </Motion.div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            {/* Split Pane Layout */}
                                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-[650px]">
                                                {/* Left: LaTeX Editor */}
                                                <div className="flex flex-col space-y-4">
                                                    <div className="flex justify-between items-center px-1">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-brand-primary" />
                                                            <label className="text-mono text-[9px] font-bold uppercase tracking-[0.4em] text-text-muted">LaTeX_Source_Editor</label>
                                                        </div>
                                                        <button
                                                            onClick={() => {
                                                                navigator.clipboard.writeText(optimizedLatex);
                                                                setCopyButtonText('Copied');
                                                                setTimeout(() => setCopyButtonText('Copy'), 2000);
                                                            }}
                                                            className="text-brand-primary hover:text-brand-hover text-[9px] font-black uppercase tracking-widest flex items-center gap-2 transition-colors border border-brand-primary/20 px-3 py-1 rounded-lg bg-brand-primary/5"
                                                        >
                                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                            </svg>
                                                            {copyButtonText}
                                                        </button>
                                                    </div>
                                                    <div className="flex-1 relative group">
                                                        <textarea
                                                            value={optimizedLatex}
                                                            onChange={(e) => setOptimizedLatex(e.target.value)}
                                                            className="w-full h-full p-8 bg-black/40 border border-border-muted rounded-[2rem] text-text-primary focus:outline-none focus:border-brand-primary/30 transition-all font-mono text-xs resize-none custom-scrollbar"
                                                        />
                                                        <div className="absolute top-4 right-4 text-[8px] text-text-muted/30 font-mono uppercase">Write_Mode_Active</div>
                                                    </div>
                                                </div>

                                                {/* Right: PDF Preview */}
                                                <div className="flex flex-col space-y-4">
                                                    <div className="flex justify-between items-center px-1">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-brand-primary animate-pulse" />
                                                            <label className="text-mono text-[9px] font-bold uppercase tracking-[0.4em] text-text-muted">High_Fidelity_Render</label>
                                                        </div>
                                                        <button
                                                            onClick={handleCompileLatex}
                                                            disabled={isCompiling}
                                                            className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2 border ${isCompiling
                                                                ? 'bg-white/5 border-white/5 text-text-muted cursor-not-allowed'
                                                                : 'bg-text-primary border-text-primary hover:bg-white text-bg-primary shadow-lg'
                                                                }`}
                                                        >
                                                            {isCompiling ? (
                                                                <>
                                                                    <div className="w-2.5 h-2.5 border-2 border-text-muted border-t-transparent rounded-full animate-spin" />
                                                                    <span>RE_RENDERING...</span>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                                                    </svg>
                                                                    <span>Refresh View</span>
                                                                </>
                                                            )}
                                                        </button>
                                                    </div>

                                                    {/* PDF Viewer Container */}
                                                    <div className="flex-1 relative bg-black/40 border border-border-muted rounded-[2rem] overflow-hidden group">
                                                        {compiledPdfUrl ? (
                                                            <iframe
                                                                src={`${compiledPdfUrl}#toolbar=0&navpanes=0`}
                                                                className="w-full h-full invert opacity-80 group-hover:opacity-100 transition-opacity"
                                                                title="PDF Preview"
                                                            />
                                                        ) : (
                                                            <div className="flex items-center justify-center h-full text-text-muted">
                                                                {isCompiling ? (
                                                                    <div className="text-center space-y-4">
                                                                        <div className="w-12 h-12 mx-auto relative">
                                                                            <Motion.div
                                                                                animate={{ rotate: 360 }}
                                                                                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                                                                                className="absolute inset-0 border-2 border-brand-primary border-t-transparent rounded-full"
                                                                            />
                                                                        </div>
                                                                        <p className="text-mono text-[8px] font-black uppercase tracking-widest">Rendering_Visuals</p>
                                                                    </div>
                                                                ) : (
                                                                    <div className="text-center px-10 space-y-6">
                                                                        <svg className="w-16 h-16 mx-auto text-white/5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                                                        </svg>
                                                                        <p className="text-mono text-[9px] font-black uppercase tracking-[0.3em] leading-relaxed max-w-[200px] mx-auto opacity-40">System requires manual synchronization. <br />Initialize "Refresh View" above.</p>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                        {/* Preview Overlay */}
                                                        <div className="absolute inset-0 pointer-events-none border-[20px] border-black/5" />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Bottom Actions */}
                                            <div className="flex gap-6 mt-12 justify-between items-center border-t border-white/5 pt-10">
                                                <button
                                                    onClick={resetForm}
                                                    className="px-10 py-5 bg-white/5 hover:bg-white/10 text-text-muted hover:text-text-primary rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] transition-all flex items-center gap-4 border border-border-subtle"
                                                >
                                                    <svg className="w-5 h-5 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                                    </svg>
                                                    <span>Cold Restart</span>
                                                </button>

                                                <div className="flex gap-6">
                                                    <button
                                                        onClick={() => navigate('/dashboard')}
                                                        className="px-8 py-5 text-text-muted hover:text-text-primary font-black text-[10px] uppercase tracking-[0.3em] transition-all"
                                                    >
                                                        Exit Protocol
                                                    </button>

                                                    <button
                                                        onClick={handleDownloadPdf}
                                                        disabled={!compiledPdfUrl}
                                                        className={`group relative px-12 py-5 rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] transition-all flex items-center gap-4 ${compiledPdfUrl
                                                            ? 'bg-brand-primary text-black hover:bg-brand-hover shadow-[0_20px_40px_-10px_rgba(141,163,74,0.3)] hover:scale-105 active:scale-95'
                                                            : 'bg-bg-secondary text-text-muted cursor-not-allowed border border-border-muted/50'
                                                            }`}
                                                    >
                                                        <svg className="w-5 h-5 group-hover:translate-y-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                                        </svg>
                                                        <span>Download Artifact</span>
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
            </div>
        </div>
    );
}
