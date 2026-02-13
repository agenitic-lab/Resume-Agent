import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUserRuns } from '../services/api';

export default function RunHistory() {
    const navigate = useNavigate();
    const [historyItems, setHistoryItems] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchRuns = async () => {
            try {
                const runs = await getUserRuns(100);
                setHistoryItems(runs);
            } catch (error) {
                console.error("Failed to fetch history:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchRuns();
    }, []);

    const handleView = (id) => {
        navigate(`/optimization/${id}`);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-8">
            <div className="max-w-5xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-4xl font-bold text-white mb-2">Run History</h1>
                    <p className="text-slate-400">View all your past resume optimization runs</p>
                </div>

                {/* History List */}
                <div className="space-y-4">
                    {loading ? (
                        <div className="text-center text-slate-400 py-12">Loading history...</div>
                    ) : historyItems.length === 0 ? (
                        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-12 text-center">
                            <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg className="w-10 h-10 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-semibold text-white mb-2">No optimization history yet</h3>
                            <p className="text-slate-400 mb-6">Start optimizing your resume to see your history here</p>
                            <button
                                onClick={() => navigate('/new-optimization')}
                                className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg font-semibold hover:shadow-lg hover:shadow-cyan-500/50 transition-all"
                            >
                                Start New Optimization
                            </button>
                        </div>
                    ) : (
                        historyItems.map((item) => (
                            <div
                                key={item.id}
                                className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 hover:border-slate-700 transition-all"
                            >
                                <div className="flex items-start justify-between gap-6">
                                    {/* Left Side - Status, Date, Info */}
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-xs font-semibold">
                                                {item.status}
                                            </span>
                                            <span className="text-slate-500 text-sm">{new Date(item.created_at).toLocaleDateString()}</span>
                                        </div>

                                        <h3 className="text-xl font-bold text-white mb-1">
                                            {item.job_description ? (item.job_description.substring(0, 50) + "...") : "Optimization Run"}
                                        </h3>
                                        <p className="text-slate-400 text-sm mb-4 line-clamp-1">{item.job_description}</p>
                                    </div>

                                    {/* Right Side - Scores and Actions */}
                                    <div className="flex items-center gap-6">
                                        {/* Score Display */}
                                        <div className="text-right">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-2xl font-bold text-white">{Math.round(item.ats_score_before || 0)}</span>
                                                <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                                </svg>
                                                <span className="text-2xl font-bold text-cyan-400">{Math.round(item.ats_score_after || 0)}</span>
                                            </div>
                                            <div className="text-green-400 text-sm font-semibold">
                                                +{Math.round(item.improvement_delta || 0)} points
                                            </div>
                                        </div>

                                        {/* Action Buttons */}
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => handleView(item.id)}
                                                className="p-3 bg-slate-800 hover:bg-slate-700 rounded-lg transition-all group"
                                                title="View Details"
                                            >
                                                <svg className="w-5 h-5 text-slate-400 group-hover:text-cyan-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
