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
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-8">
            {/* API Key Warning Banner */}
            {hasApiKey === false && (
                <div className="max-w-4xl mx-auto mb-6">
                    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 flex items-start gap-3">
                        <svg className="w-6 h-6 text-yellow-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <div className="flex-1">
                            <h3 className="text-yellow-400 font-semibold mb-1">Groq API Key Required</h3>
                            <p className="text-slate-300 text-sm mb-3">
                                You need to add your Groq API key to use the resume optimization feature.
                                Get your free API key from{' '}
                                <a
                                    href="https://console.groq.com/keys"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-cyan-400 hover:text-cyan-300 underline"
                                >
                                    console.groq.com/keys
                                </a>
                            </p>
                            <button
                                onClick={() => navigate('/settings')}
                                className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg font-medium transition-colors text-sm"
                            >
                                Go to Settings
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Step Indicator */}
            <div className="max-w-4xl mx-auto mb-12">
                <div className="flex items-center justify-center gap-4">
                    {steps.map((step, index) => (
                        <React.Fragment key={step.number}>
                            <div className="flex flex-col items-center">
                                <div
                                    className={`w-12 h-12 rounded-full flex items-center justify-center font-semibold transition-all ${currentStep === step.number
                                        ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/50 scale-110'
                                        : currentStep > step.number
                                            ? 'bg-green-500 text-white'
                                            : 'bg-slate-800 text-slate-500'
                                        }`}
                                >
                                    {currentStep > step.number ? (
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                    ) : (
                                        <span className="text-xl">{step.icon}</span>
                                    )}
                                </div>
                                <span className={`text-sm mt-2 font-medium ${currentStep === step.number ? 'text-cyan-400' : 'text-slate-500'}`}>
                                    {step.name}
                                </span>
                            </div>
                            {index < steps.length - 1 && (
                                <div className={`h-1 w-24 rounded transition-all ${currentStep > step.number ? 'bg-green-500' : 'bg-slate-800'}`} />
                            )}
                        </React.Fragment>
                    ))}
                </div>
            </div>

            {/* Main Content Card */}
            <div className="max-w-4xl mx-auto">
                <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-8 shadow-2xl">

                    {/* Step 1: Choose Input Type */}
                    {currentStep === 1 && (
                        <div className="space-y-6">
                            <div className="text-center mb-8">
                                <h2 className="text-3xl font-bold text-white mb-2">Choose Your Input Type</h2>
                                <p className="text-slate-400">How would you like to provide your resume?</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <button
                                    onClick={() => setInputType('pdf')}
                                    className={`p-8 rounded-xl border-2 transition-all ${inputType === 'pdf'
                                        ? 'border-cyan-500 bg-cyan-500/10'
                                        : 'border-slate-700 hover:border-cyan-500/50 hover:bg-slate-800/50'
                                        }`}
                                >
                                    <div className="text-6xl mb-4">📄</div>
                                    <h3 className="text-xl font-bold text-white mb-2">I have a PDF</h3>
                                    <p className="text-slate-400 text-sm">Upload your existing resume in PDF format</p>
                                </button>

                                <button
                                    onClick={() => setInputType('latex')}
                                    className={`p-8 rounded-xl border-2 transition-all ${inputType === 'latex'
                                        ? 'border-cyan-500 bg-cyan-500/10'
                                        : 'border-slate-700 hover:border-cyan-500/50 hover:bg-slate-800/50'
                                        }`}
                                >
                                    <div className="text-6xl mb-4">📝</div>
                                    <h3 className="text-xl font-bold text-white mb-2">I have LaTeX code</h3>
                                    <p className="text-slate-400 text-sm">Paste or upload your LaTeX source code</p>
                                </button>
                            </div>

                            <div className="flex justify-end">
                                <button
                                    onClick={handleContinue}
                                    disabled={!canProceedStep1}
                                    className={`px-8 py-3 rounded-lg font-semibold transition-all flex items-center gap-2 ${canProceedStep1
                                        ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:shadow-lg hover:shadow-cyan-500/50 hover:scale-105'
                                        : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                                        }`}
                                >
                                    <span>Continue</span>
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Upload/Paste */}
                    {currentStep === 2 && (
                        <div className="space-y-6">
                            <div className="text-center mb-8">
                                <h2 className="text-3xl font-bold text-white mb-2">
                                    {inputType === 'pdf' ? 'Upload Your PDF Resume' : 'Paste Your LaTeX Code'}
                                </h2>
                                <p className="text-slate-400">
                                    {inputType === 'pdf'
                                        ? 'We\'ll extract the text for optimization'
                                        : 'Paste your LaTeX resume source code'}
                                </p>
                            </div>

                            {inputType === 'pdf' ? (
                                <>
                                    <div
                                        onDrop={handleDrop}
                                        onDragOver={handleDragOver}
                                        onDragLeave={handleDragLeave}
                                        className={`relative border-2 border-dashed rounded-xl p-12 text-center transition-all ${isDragging
                                            ? 'border-cyan-500 bg-cyan-500/10'
                                            : 'border-slate-700 hover:border-cyan-500/50 hover:bg-slate-800/50'
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
                                            <div className="space-y-4">
                                                <div className="w-16 h-16 mx-auto bg-green-500/20 rounded-full flex items-center justify-center">
                                                    <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                    </svg>
                                                </div>
                                                <div>
                                                    <p className="text-white font-medium">{resumeFile.name}</p>
                                                    <p className="text-slate-500 text-sm">
                                                        {isExtracting ? 'Extracting text...' : 'File uploaded successfully'}
                                                    </p>
                                                </div>
                                                <button
                                                    onClick={() => {
                                                        setResumeFile(null);
                                                        setExtractedText('');
                                                    }}
                                                    className="text-red-400 hover:text-red-300 text-sm"
                                                >
                                                    Remove file
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="space-y-4">
                                                <div className="w-16 h-16 mx-auto bg-cyan-500/20 rounded-full flex items-center justify-center">
                                                    <svg className="w-8 h-8 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                                    </svg>
                                                </div>
                                                <div>
                                                    <p className="text-white font-medium mb-2">Drop your PDF resume here</p>
                                                    <p className="text-slate-500 text-sm mb-4">or click to browse</p>
                                                    <label
                                                        htmlFor="pdf-upload"
                                                        className="inline-block px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg cursor-pointer transition-all"
                                                    >
                                                        Browse Files
                                                    </label>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {extractedText && (
                                        <div>
                                            <label className="block text-white font-medium mb-2">Extracted Text (editable)</label>
                                            <textarea
                                                value={extractedText}
                                                onChange={(e) => setExtractedText(e.target.value)}
                                                className="w-full h-64 p-4 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all resize-none"
                                            />
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div>
                                    <textarea
                                        value={resumeText}
                                        onChange={(e) => setResumeText(e.target.value)}
                                        placeholder="Paste your LaTeX code here...\n\n\\documentclass{article}\n\\begin{document}\n...\n\\end{document}"
                                        className="w-full h-96 p-4 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all font-mono text-sm resize-none"
                                    />
                                </div>
                            )}

                            <div className="flex justify-between">
                                <button
                                    onClick={handleBack}
                                    className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-medium transition-all flex items-center gap-2"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                    </svg>
                                    <span>Back</span>
                                </button>

                                <button
                                    onClick={handleContinue}
                                    disabled={!canProceedStep2 || isExtracting}
                                    className={`px-8 py-3 rounded-lg font-semibold transition-all flex items-center gap-2 ${canProceedStep2 && !isExtracting
                                        ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:shadow-lg hover:shadow-cyan-500/50 hover:scale-105'
                                        : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                                        }`}
                                >
                                    <span>Continue</span>
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Job Description */}
                    {currentStep === 3 && (
                        <div className="space-y-6">
                            <div className="text-center mb-8">
                                <h2 className="text-3xl font-bold text-white mb-2">Enter Job Description</h2>
                                <p className="text-slate-400">Paste the job description you're applying for</p>
                            </div>

                            <div>
                                <textarea
                                    value={jobDescription}
                                    onChange={(e) => setJobDescription(e.target.value)}
                                    placeholder="Paste the complete job description here..."
                                    className="w-full h-80 p-4 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all resize-none"
                                />
                                <div className="flex justify-between items-center mt-2">
                                    <p className="text-sm text-slate-500">Minimum 50 characters required</p>
                                    <p className={`text-sm ${jobDescription.length >= 50 ? 'text-green-400' : 'text-slate-500'}`}>
                                        {jobDescription.length} / 50+
                                    </p>
                                </div>
                            </div>

                            <div className="flex justify-between">
                                <button
                                    onClick={handleBack}
                                    className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-medium transition-all flex items-center gap-2"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                    </svg>
                                    <span>Back</span>
                                </button>

                                <button
                                    onClick={handleContinue}
                                    disabled={!canProceedStep3}
                                    className={`px-8 py-3 rounded-lg font-semibold transition-all flex items-center gap-2 ${canProceedStep3
                                        ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:shadow-lg hover:shadow-cyan-500/50 hover:scale-105'
                                        : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                                        }`}
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                    </svg>
                                    <span>Start Optimization</span>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Step 4: Results */}
                    {currentStep === 4 && (
                        <div className="space-y-6">
                            <div className="text-center mb-8">
                                <h2 className="text-3xl font-bold text-white mb-2">Optimized Resume</h2>
                                <p className="text-slate-400">Review, edit, and compile your optimized LaTeX resume</p>
                            </div>

                            {!optimizedLatex ? (
                                <div className="text-center py-16">
                                    <div className="w-24 h-24 mx-auto mb-6">
                                        <div className="w-full h-full border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                                    </div>
                                    <h3 className="text-2xl font-bold text-white mb-4">Optimizing Your Resume</h3>
                                    <p className="text-slate-400">AI is analyzing and optimizing your resume...</p>
                                </div>
                            ) : (
                                <>
                                    {/* Split Pane Layout */}
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                        {/* Left: LaTeX Editor */}
                                        <div className="space-y-3">
                                            <div className="flex justify-between items-center">
                                                <label className="text-white font-medium">LaTeX Code (editable)</label>
                                                <button
                                                    onClick={() => {
                                                        navigator.clipboard.writeText(optimizedLatex);
                                                        setCopyButtonText('Copied!');
                                                        setTimeout(() => setCopyButtonText('Copy'), 2000);
                                                    }}
                                                    className="text-cyan-400 hover:text-cyan-300 text-sm flex items-center gap-1"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                    </svg>
                                                    {copyButtonText}
                                                </button>
                                            </div>
                                            <textarea
                                                value={optimizedLatex}
                                                onChange={(e) => setOptimizedLatex(e.target.value)}
                                                className="w-full h-[600px] p-4 bg-slate-800/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all font-mono text-sm resize-none"
                                            />
                                        </div>

                                        {/* Right: PDF Preview */}
                                        <div className="space-y-3">
                                            <div className="flex justify-between items-center">
                                                <label className="text-white font-medium">PDF Preview</label>
                                                <button
                                                    onClick={handleCompileLatex}
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

                                            {/* PDF Viewer */}
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

                                    {/* Bottom Actions */}
                                    <div className="flex gap-4 justify-between">
                                        <button
                                            onClick={resetForm}
                                            className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-medium transition-all flex items-center gap-2"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                            </svg>
                                            <span>Start Over</span>
                                        </button>

                                        <div className="flex gap-4">
                                            <button
                                                onClick={() => navigate('/dashboard')}
                                                className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-medium transition-all"
                                            >
                                                Back to Dashboard
                                            </button>

                                            <button
                                                onClick={handleDownloadPdf}
                                                disabled={!compiledPdfUrl}
                                                className={`px-8 py-3 rounded-lg font-semibold transition-all flex items-center gap-2 ${compiledPdfUrl
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
