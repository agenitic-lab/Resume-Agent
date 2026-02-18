import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
        { number: 1, name: 'Choose Input', icon: '📝' },
        { number: 2, name: 'Upload/Paste', icon: '📄' },
        { number: 3, name: 'Job Description', icon: '💼' },
        { number: 4, name: 'Results', icon: '⚡' }
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
        <div className="min-h-screen bg-[#f5f5f5] text-neutral-900 p-8">
            {/* API Key Warning Banner */}
            {hasApiKey === false && (
                <div className="max-w-4xl mx-auto mb-8">
                    <div className="bg-white border-l-4 border-[#606c38] rounded-2xl p-8 shadow-xl shadow-neutral-200/50 flex items-start gap-6">
                        <div className="w-12 h-12 bg-[#606c38]/10 rounded-xl flex items-center justify-center flex-shrink-0">
                            <svg className="w-6 h-6 text-[#606c38]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                        <div className="flex-1">
                            <h3 className="text-xl font-black text-neutral-900 mb-2 italic tracking-tighter uppercase font-black">Groq API Key Required</h3>
                            <p className="text-neutral-500 font-medium mb-4 leading-relaxed">
                                You need to add your Groq API key to use the resume optimization feature.
                                Get your free API key from{' '}
                                <a
                                    href="https://console.groq.com/keys"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[#606c38] hover:underline font-black"
                                >
                                    console.groq.com/keys
                                </a>
                            </p>
                            <button
                                onClick={() => navigate('/settings')}
                                className="px-6 py-2.5 bg-neutral-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all hover:bg-black active:scale-95"
                            >
                                Go to Settings
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Step Indicator */}
            <div className="max-w-4xl mx-auto mb-16">
                <div className="flex items-center justify-center gap-6">
                    {steps.map((step, index) => (
                        <React.Fragment key={step.number}>
                            <div className="flex flex-col items-center">
                                <div
                                    className={`w-14 h-14 rounded-full flex items-center justify-center font-black transition-all ${currentStep === step.number
                                        ? 'bg-[#606c38] text-white shadow-xl shadow-olive-500/20 scale-110'
                                        : currentStep > step.number
                                            ? 'bg-neutral-900 text-white'
                                            : 'bg-white border border-neutral-200 text-neutral-300'
                                        }`}
                                >
                                    {currentStep > step.number ? (
                                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                        </svg>
                                    ) : (
                                        <span className="text-xl opacity-80">{step.icon}</span>
                                    )}
                                </div>
                                <span className={`text-[10px] font-black uppercase tracking-widest mt-4 transition-colors ${currentStep === step.number ? 'text-[#606c38]' : 'text-neutral-400'}`}>
                                    {step.name}
                                </span>
                            </div>
                            {index < steps.length - 1 && (
                                <div className={`h-[2px] w-20 rounded transition-all ${currentStep > step.number ? 'bg-neutral-900' : 'bg-neutral-200'}`} />
                            )}
                        </React.Fragment>
                    ))}
                </div>
            </div>

            {/* Main Content Card */}
            <div className="max-w-4xl mx-auto">
                <div className="bg-white border border-neutral-200 rounded-[2.5rem] p-10 shadow-2xl shadow-neutral-200/50 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-[#606c38]/10" />

                    {/* Step 1: Choose Input Type */}
                    {currentStep === 1 && (
                        <div className="space-y-8">
                            <div className="text-center mb-10">
                                <h2 className="text-3xl font-black text-neutral-900 mb-2 italic tracking-tighter uppercase font-black">Choose Your Input Type</h2>
                                <p className="text-neutral-500 font-medium tracking-tight">How would you like to provide your resume?</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <button
                                    onClick={() => setInputType('pdf')}
                                    className={`p-10 rounded-3xl border-2 transition-all ${inputType === 'pdf'
                                        ? 'border-[#606c38] bg-[#606c38]/5 shadow-lg shadow-olive-500/5'
                                        : 'border-neutral-100 hover:border-neutral-200 hover:bg-neutral-50 bg-neutral-50/50'
                                        }`}
                                >
                                    <div className="text-6xl mb-6">📄</div>
                                    <h3 className="text-xl font-black text-neutral-900 mb-2 italic tracking-tighter uppercase">I have a PDF</h3>
                                    <p className="text-neutral-400 text-[10px] font-black uppercase tracking-widest leading-relaxed">Upload your existing resume in PDF format</p>
                                </button>

                                <button
                                    onClick={() => setInputType('latex')}
                                    className={`p-10 rounded-3xl border-2 transition-all ${inputType === 'latex'
                                        ? 'border-[#606c38] bg-[#606c38]/5 shadow-lg shadow-olive-500/5'
                                        : 'border-neutral-100 hover:border-neutral-200 hover:bg-neutral-50 bg-neutral-50/50'
                                        }`}
                                >
                                    <div className="text-6xl mb-6">📝</div>
                                    <h3 className="text-xl font-black text-neutral-900 mb-2 italic tracking-tighter uppercase">I have LaTeX code</h3>
                                    <p className="text-neutral-400 text-[10px] font-black uppercase tracking-widest leading-relaxed">Paste or upload your LaTeX source code</p>
                                </button>
                            </div>

                            <div className="flex justify-end mt-12">
                                <button
                                    onClick={handleContinue}
                                    disabled={!canProceedStep1}
                                    className={`px-10 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.25em] transition-all flex items-center gap-3 ${canProceedStep1
                                        ? 'bg-[#606c38] text-white hover:bg-[#4a532b] shadow-xl shadow-olive-500/20 hover:scale-105 active:scale-95'
                                        : 'bg-neutral-100 text-neutral-300 cursor-not-allowed'
                                        }`}
                                >
                                    <span>Proceed</span>
                                    <svg className="w-5 h-5 font-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Upload/Paste */}
                    {currentStep === 2 && (
                        <div className="space-y-8">
                            <div className="text-center mb-10">
                                <h2 className="text-3xl font-black text-neutral-900 mb-2 italic tracking-tighter uppercase font-black">
                                    {inputType === 'pdf' ? 'Resume Upload' : 'LaTeX Source Injection'}
                                </h2>
                                <p className="text-neutral-500 font-medium tracking-tight">
                                    {inputType === 'pdf'
                                        ? 'Upload your resume for analysis'
                                        : 'Initialize system with LaTeX source code'}
                                </p>
                            </div>

                            {inputType === 'pdf' ? (
                                <>
                                    <div
                                        onDrop={handleDrop}
                                        onDragOver={handleDragOver}
                                        onDragLeave={handleDragLeave}
                                        className={`relative border-2 border-dashed rounded-3xl p-16 text-center transition-all ${isDragging
                                            ? 'border-[#606c38] bg-[#606c38]/5'
                                            : 'border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50 bg-neutral-50/50'
                                            }`}
                                    >
                                        <input
                                            type="file"
                                            id="pdf-upload"
                                            accept=".pdf"
                                            onChange={handleFileUpload}
                                            className="hidden"
                                        />

                                        {resumeFile ? (
                                            <div className="space-y-6">
                                                <div className="w-20 h-20 mx-auto bg-[#606c38]/10 rounded-full flex items-center justify-center">
                                                    <svg className="w-10 h-10 text-[#606c38]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                    </svg>
                                                </div>
                                                <div>
                                                    <p className="text-neutral-900 font-black tracking-tight">{resumeFile.name}</p>
                                                    <p className="text-neutral-400 text-[10px] font-black uppercase tracking-widest mt-1">
                                                        {isExtracting ? 'Analyzing Content' : 'Resume Ready'}
                                                    </p>
                                                </div>
                                                <button
                                                    onClick={() => {
                                                        setResumeFile(null);
                                                        setExtractedText('');
                                                    }}
                                                    className="px-6 py-2 border border-neutral-200 text-neutral-400 hover:text-red-500 hover:border-red-500 rounded-full text-[10px] font-black uppercase tracking-widest transition-all"
                                                >
                                                    Reset Upload
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="space-y-6">
                                                <div className="w-20 h-20 mx-auto bg-[#606c38]/10 rounded-3xl flex items-center justify-center">
                                                    <svg className="w-10 h-10 text-[#606c38]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                                    </svg>
                                                </div>
                                                <div>
                                                    <p className="text-neutral-900 font-black text-lg mb-2 italic tracking-tighter uppercase">Drop Resume Here</p>
                                                    <p className="text-neutral-400 text-[10px] font-black uppercase tracking-[0.2em] mb-6">or click to browse local files</p>
                                                    <label
                                                        htmlFor="pdf-upload"
                                                        className="inline-block px-10 py-3 bg-neutral-900 text-white rounded-2xl cursor-pointer font-black text-[10px] uppercase tracking-widest hover:bg-black transition-all active:scale-95"
                                                    >
                                                        Access Files
                                                    </label>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {extractedText && (
                                        <div className="pt-6">
                                            <label className="block text-neutral-900 font-black text-[10px] uppercase tracking-widest mb-3">Extracted Data (Auditable)</label>
                                            <textarea
                                                value={extractedText}
                                                onChange={(e) => setExtractedText(e.target.value)}
                                                className="w-full h-64 p-6 bg-neutral-50 border border-neutral-100 rounded-3xl text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-[#606c38]/30 transition-all resize-none shadow-inner text-sm font-medium"
                                            />
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div>
                                    <textarea
                                        value={resumeText}
                                        onChange={(e) => setResumeText(e.target.value)}
                                        placeholder="Paste your LaTeX source code here...\n\n\\documentclass{article}\n\\begin{document}\n...\n\\end{document}"
                                        className="w-full h-96 p-8 bg-neutral-50 border border-neutral-100 rounded-[2.5rem] text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-[#606c38]/30 transition-all font-mono text-sm resize-none shadow-inner"
                                    />
                                </div>
                            )}

                            <div className="flex justify-between mt-12">
                                <button
                                    onClick={handleBack}
                                    className="px-8 py-3 bg-neutral-100 hover:bg-neutral-200 text-neutral-500 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-3"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" />
                                    </svg>
                                    <span>Withdraw</span>
                                </button>

                                <button
                                    onClick={handleContinue}
                                    disabled={!canProceedStep2 || isExtracting}
                                    className={`px-10 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.25em] transition-all flex items-center gap-3 ${canProceedStep2 && !isExtracting
                                        ? 'bg-[#606c38] text-white hover:bg-[#4a532b] shadow-xl shadow-olive-500/20 hover:scale-105 active:scale-95'
                                        : 'bg-neutral-100 text-neutral-300 cursor-not-allowed'
                                        }`}
                                >
                                    <span>Advance</span>
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Job Description */}
                    {currentStep === 3 && (
                        <div className="space-y-8">
                            <div className="text-center mb-10">
                                <h2 className="text-3xl font-black text-neutral-900 mb-2 italic tracking-tighter uppercase font-black">Target Parameters</h2>
                                <p className="text-neutral-500 font-medium tracking-tight">Paste the job description for AI alignment analysis</p>
                            </div>

                            <div>
                                <textarea
                                    value={jobDescription}
                                    onChange={(e) => setJobDescription(e.target.value)}
                                    placeholder="Paste the complete job description here..."
                                    className="w-full h-80 p-8 bg-neutral-50 border border-neutral-100 rounded-[2.5rem] text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-[#606c38]/30 transition-all resize-none shadow-inner text-sm font-medium leading-relaxed"
                                />
                                <div className="flex justify-between items-center mt-4 px-2">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-neutral-300">Minimum 50 characters required for system lock</p>
                                    <div className="flex items-center gap-3">
                                        <div className={`h-1.5 w-12 rounded-full overflow-hidden bg-neutral-100`}>
                                            <div
                                                className={`h-full transition-all duration-500 ${jobDescription.length >= 50 ? 'bg-green-500' : 'bg-[#606c38]/30'}`}
                                                style={{ width: `${Math.min(100, (jobDescription.length / 50) * 100)}%` }}
                                            />
                                        </div>
                                        <p className={`text-[10px] font-black uppercase tracking-widest ${jobDescription.length >= 50 ? 'text-green-500' : 'text-neutral-400'}`}>
                                            {jobDescription.length} Units
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-between mt-12">
                                <button
                                    onClick={handleBack}
                                    className="px-8 py-3 bg-neutral-100 hover:bg-neutral-200 text-neutral-500 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-3"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" />
                                    </svg>
                                    <span>Withdraw</span>
                                </button>

                                <button
                                    onClick={handleContinue}
                                    disabled={!canProceedStep3}
                                    className={`px-10 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all flex items-center gap-3 ${canProceedStep3
                                        ? 'bg-[#606c38] text-white hover:bg-[#4a532b] shadow-xl shadow-olive-500/20 hover:scale-105 active:scale-95'
                                        : 'bg-neutral-100 text-neutral-300 cursor-not-allowed'
                                        }`}
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                    </svg>
                                    <span>Run Optimization</span>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Step 4: Results */}
                    {currentStep === 4 && (
                        <div className="space-y-8">
                            <div className="text-center mb-10">
                                <h2 className="text-3xl font-black text-neutral-900 mb-2 italic tracking-tighter uppercase font-black">Intelligence Output</h2>
                                <p className="text-neutral-500 font-medium tracking-tight">System analysis complete. Optimized results available below.</p>
                            </div>

                            {!optimizedLatex ? (
                                <div className="text-center py-24">
                                    <div className="w-24 h-24 mx-auto mb-8 relative">
                                        <div className="absolute inset-0 border-4 border-[#606c38]/10 rounded-full" />
                                        <div className="absolute inset-0 border-4 border-[#606c38] border-t-transparent rounded-full animate-spin" />
                                    </div>
                                    <h3 className="text-2xl font-black text-neutral-900 mb-3 italic tracking-tighter uppercase">Analyzing Resume...</h3>
                                    <p className="text-neutral-500 font-medium max-w-xs mx-auto leading-relaxed">Our AI is currently aligning your professional data with the job requirements.</p>
                                </div>
                            ) : (
                                <>
                                    {/* Split Pane Layout */}
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                        {/* Left: LaTeX Editor */}
                                        <div className="space-y-4">
                                            <div className="flex justify-between items-center px-1">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">LaTeX Source Code</label>
                                                <button
                                                    onClick={() => {
                                                        navigator.clipboard.writeText(optimizedLatex);
                                                        setCopyButtonText('Copied');
                                                        setTimeout(() => setCopyButtonText('Copy'), 2000);
                                                    }}
                                                    className="text-[#606c38] hover:text-[#4a532b] text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-colors"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                    </svg>
                                                    {copyButtonText}
                                                </button>
                                            </div>
                                            <textarea
                                                value={optimizedLatex}
                                                onChange={(e) => setOptimizedLatex(e.target.value)}
                                                className="w-full h-[600px] p-8 bg-neutral-50 border border-neutral-100 rounded-3xl text-neutral-900 focus:outline-none focus:border-[#606c38]/30 transition-all font-mono text-sm resize-none shadow-inner"
                                            />
                                        </div>

                                        {/* Right: PDF Preview */}
                                        <div className="space-y-4">
                                            <div className="flex justify-between items-center px-1">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Resume Preview</label>
                                                <button
                                                    onClick={handleCompileLatex}
                                                    disabled={isCompiling}
                                                    className={`px-5 py-2 rounded-full text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${isCompiling
                                                        ? 'bg-neutral-100 text-neutral-300 cursor-not-allowed'
                                                        : 'bg-neutral-900 hover:bg-black text-white shadow-lg'
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

                                            {/* PDF Viewer */}
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
                                                                <p className="text-[10px] font-black uppercase tracking-widest">Rendering PDF Visual</p>
                                                            </div>
                                                        ) : (
                                                            <div className="text-center px-10">
                                                                <svg className="w-16 h-16 mx-auto mb-6 text-neutral-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                                                </svg>
                                                                <p className="text-[10px] font-black uppercase tracking-widest leading-relaxed">System requires visual synchronization. <br />Click "Refresh View" above.</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Bottom Actions */}
                                    <div className="flex gap-6 mt-12 justify-between items-center">
                                        <button
                                            onClick={resetForm}
                                            className="px-8 py-3 bg-neutral-100 hover:bg-neutral-200 text-neutral-500 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-3"
                                        >
                                            <svg className="w-5 h-5 font-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                            </svg>
                                            <span>Reset All</span>
                                        </button>

                                        <div className="flex gap-4">
                                            <button
                                                onClick={() => navigate('/dashboard')}
                                                className="px-8 py-3 bg-neutral-50 border border-neutral-100 text-neutral-400 hover:text-neutral-900 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all"
                                            >
                                                Exit to Hub
                                            </button>

                                            <button
                                                onClick={handleDownloadPdf}
                                                disabled={!compiledPdfUrl}
                                                className={`px-10 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all flex items-center gap-3 ${compiledPdfUrl
                                                    ? 'bg-[#606c38] text-white hover:bg-[#4a532b] shadow-xl shadow-olive-500/20 hover:scale-105 active:scale-95'
                                                    : 'bg-neutral-100 text-neutral-300 cursor-not-allowed'
                                                    }`}
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                                </svg>
                                                <span>Download PDF</span>
                                            </button>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </div>
    );
}
