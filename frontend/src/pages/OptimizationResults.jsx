import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function OptimizationResults() {
    const navigate = useNavigate();
    const [coverLetterCopied, setCoverLetterCopied] = useState(false);

    // Mock data - replace with actual API data
    const resultsData = {
        date: 'February 7, 2026',
        originalScore: 58,
        optimizedScore: 76,
        improvement: 18,
        iterations: 2,
        scoreProgression: [58, 68, 76],
        jobRequirements: {
            mustHave: ['Python', 'FastAPI', 'PostgreSQL'],
            niceToHave: ['Docker', 'AWS'],
            keywords: ['backend', 'API'],
            seniorityLevel: 'junior'
        },
        resumeAnalysis: {
            skillsPresent: ['Python', 'Django'],
            skillsMissing: ['FastAPI'],
            strongSections: ['education'],
            weakSections: ['projects']
        },
        changes: [
            {
                id: 1,
                title: 'add keywords',
                description: 'Added relevant keywords to skills section',
                reason: 'Improve ATS matching'
            }
        ],
        coverLetter: `Dear Hiring Manager,

I am writing to express my strong interest in the Junior Python Developer position at your company. With my background in Python development and experience with Django, I am excited about the opportunity to contribute to your team.

My experience includes:
- Building scalable backend systems with Python and Django
- Working with PostgreSQL databases
- Developing RESTful APIs
- Strong foundation in software engineering principles

I am particularly drawn to this role because it aligns perfectly with my career goals of working with modern Python frameworks like FastAPI and expanding my expertise in backend development.

I am eager to bring my skills and enthusiasm to your team and would welcome the opportunity to discuss how I can contribute to your projects.

Thank you for considering my application.

Best regards,
John Doe`
    };

    const handleCopyCoverLetter = () => {
        navigator.clipboard.writeText(resultsData.coverLetter);
        setCoverLetterCopied(true);
        setTimeout(() => setCoverLetterCopied(false), 2000);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-8">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex items-start justify-between mb-8">
                    <div>
                        <h1 className="text-4xl font-bold text-white mb-2">Optimization Results</h1>
                        <p className="text-slate-400">{resultsData.date}</p>
                    </div>
                    <button className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg font-semibold hover:shadow-lg hover:shadow-cyan-500/50 transition-all flex items-center gap-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        <span>Download PDF</span>
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
                                        {resultsData.jobRequirements.mustHave.map((skill) => (
                                            <span key={skill} className="px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-sm">
                                                {skill}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <h3 className="text-white font-semibold mb-2">Nice to Have</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {resultsData.jobRequirements.niceToHave.map((skill) => (
                                            <span key={skill} className="px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-sm">
                                                {skill}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <h3 className="text-white font-semibold mb-2">Keywords</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {resultsData.jobRequirements.keywords.map((keyword) => (
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
                                        {resultsData.resumeAnalysis.skillsPresent.map((skill) => (
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
                                        {resultsData.resumeAnalysis.skillsMissing.map((skill) => (
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
                                        {resultsData.resumeAnalysis.strongSections.map((section) => (
                                            <li key={section} className="text-slate-300 text-sm">{section}</li>
                                        ))}
                                    </ul>
                                </div>

                                <div>
                                    <h3 className="text-white font-semibold mb-2">Weak Sections</h3>
                                    <ul className="space-y-1">
                                        {resultsData.resumeAnalysis.weakSections.map((section) => (
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

                            <button className="mt-4 w-full py-3 bg-slate-800 hover:bg-slate-700 text-cyan-400 font-medium rounded-lg transition-all">
                                Agent Decision Log
                            </button>
                        </div>
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
                        onClick={() => navigate('/dashboard')}
                        className="px-8 py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-semibold transition-all"
                    >
                        Back to Dashboard
                    </button>
                </div>
            </div>
        </div>
    );
}
