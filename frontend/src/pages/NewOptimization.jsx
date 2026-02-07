import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function NewOptimization() {
    const navigate = useNavigate();
    const [currentStep, setCurrentStep] = useState(1);
    const [resumeFile, setResumeFile] = useState(null);
    const [resumeText, setResumeText] = useState('');
    const [jobDescription, setJobDescription] = useState('');
    const [isDragging, setIsDragging] = useState(false);

    const steps = [
        { number: 1, name: 'Upload Resume', icon: '📄' },
        { number: 2, name: 'Job Description', icon: '💼' },
        { number: 3, name: 'Processing', icon: '⚡' }
    ];

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            setResumeFile(file);
            // In a real app, you'd read the file content here
            console.log('File uploaded:', file.name);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) {
            setResumeFile(file);
            console.log('File dropped:', file.name);
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const canProceedStep1 = resumeFile || resumeText.trim().length > 0;
    const canProceedStep2 = jobDescription.trim().length >= 50;

    const handleContinue = () => {
        if (currentStep === 1 && canProceedStep1) {
            setCurrentStep(2);
        } else if (currentStep === 2 && canProceedStep2) {
            setCurrentStep(3);
            // In a real app, trigger the optimization process here
            setTimeout(() => {
                navigate('/dashboard');
            }, 2000);
        }
    };

    const handleBack = () => {
        if (currentStep > 1) {
            setCurrentStep(currentStep - 1);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-8">
            {/* Step Indicator */}
            <div className="max-w-4xl mx-auto mb-12">
                <div className="flex items-center justify-center gap-4">
                    {steps.map((step, index) => (
                        <React.Fragment key={step.number}>
                            {/* Step Circle */}
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
                                <span
                                    className={`text-sm mt-2 font-medium ${currentStep === step.number ? 'text-cyan-400' : 'text-slate-500'
                                        }`}
                                >
                                    {step.name}
                                </span>
                            </div>

                            {/* Connector Line */}
                            {index < steps.length - 1 && (
                                <div
                                    className={`h-1 w-24 rounded transition-all ${currentStep > step.number ? 'bg-green-500' : 'bg-slate-800'
                                        }`}
                                />
                            )}
                        </React.Fragment>
                    ))}
                </div>
            </div>

            {/* Main Content Card */}
            <div className="max-w-4xl mx-auto">
                <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-8 shadow-2xl">
                    {/* Step 1: Upload Resume */}
                    {currentStep === 1 && (
                        <div className="space-y-6">
                            <div className="text-center mb-8">
                                <h2 className="text-3xl font-bold text-white mb-2">Upload Your Resume</h2>
                                <p className="text-slate-400">Upload your resume in LaTeX (.tex) or text (.txt) format</p>
                            </div>

                            {/* File Upload Area */}
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
                                    id="file-upload"
                                    accept=".tex,.txt"
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
                                            <p className="text-slate-500 text-sm">File uploaded successfully</p>
                                        </div>
                                        <button
                                            onClick={() => setResumeFile(null)}
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
                                            <p className="text-white font-medium mb-2">Drop your resume here</p>
                                            <p className="text-slate-500 text-sm mb-4">or click to browse (.tex, .txt)</p>
                                            <label
                                                htmlFor="file-upload"
                                                className="inline-block px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg cursor-pointer transition-all"
                                            >
                                                Browse Files
                                            </label>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Divider */}
                            <div className="relative flex items-center my-8">
                                <div className="flex-grow border-t border-slate-700" />
                                <span className="px-4 text-sm text-slate-500">or paste your resume content</span>
                                <div className="flex-grow border-t border-slate-700" />
                            </div>

                            {/* Paste Textarea */}
                            <div>
                                <textarea
                                    value={resumeText}
                                    onChange={(e) => setResumeText(e.target.value)}
                                    placeholder="Paste your LaTeX resume content here..."
                                    className="w-full h-48 p-4 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all font-mono text-sm resize-none"
                                />
                            </div>

                            {/* Continue Button */}
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

                    {/* Step 2: Job Description */}
                    {currentStep === 2 && (
                        <div className="space-y-6">
                            <div className="text-center mb-8">
                                <h2 className="text-3xl font-bold text-white mb-2">Enter Job Description</h2>
                                <p className="text-slate-400">Paste the job description you're applying for</p>
                            </div>

                            {/* Job Description Textarea */}
                            <div>
                                <textarea
                                    value={jobDescription}
                                    onChange={(e) => setJobDescription(e.target.value)}
                                    placeholder="Paste the complete job description here...&#10;&#10;Example:&#10;We are looking for a Python Backend Developer with experience in:&#10;- FastAPI or Django&#10;- PostgreSQL database design&#10;- Docker and containerization&#10;- REST API development&#10;&#10;Responsibilities:&#10;- Design and implement scalable APIs&#10;- Optimize database queries&#10;- Write clean, maintainable code&#10;..."
                                    className="w-full h-80 p-4 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all resize-none"
                                />
                                <div className="flex justify-between items-center mt-2">
                                    <p className="text-sm text-slate-500">Minimum 50 characters required</p>
                                    <p className={`text-sm ${jobDescription.length >= 50 ? 'text-green-400' : 'text-slate-500'}`}>
                                        {jobDescription.length} / 50+
                                    </p>
                                </div>
                            </div>

                            {/* Navigation Buttons */}
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
                                    disabled={!canProceedStep2}
                                    className={`px-8 py-3 rounded-lg font-semibold transition-all flex items-center gap-2 ${canProceedStep2
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

                    {/* Step 3: Processing */}
                    {currentStep === 3 && (
                        <div className="text-center py-16">
                            <div className="w-24 h-24 mx-auto mb-6">
                                <div className="w-full h-full border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                            </div>
                            <h2 className="text-3xl font-bold text-white mb-4">Processing Your Resume</h2>
                            <p className="text-slate-400 mb-8">
                                AI agents are analyzing your resume and optimizing it for the job description...
                            </p>
                            <div className="max-w-md mx-auto space-y-3">
                                {['Analyzing resume structure', 'Matching job requirements', 'Generating improvements'].map((step, i) => (
                                    <div key={i} className="flex items-center gap-3 text-slate-300">
                                        <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
                                        <span>{step}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
