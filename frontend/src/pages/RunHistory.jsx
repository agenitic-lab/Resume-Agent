import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUserRuns, deleteRun } from '../services/api';
import ConfirmDialog from '../components/ConfirmDialog';

export default function RunHistory() {
    const navigate = useNavigate();
    const [historyItems, setHistoryItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, runId: null, runTitle: '' });
    const [deleting, setDeleting] = useState(false);

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

    const handleDeleteClick = (id, jobDescription) => {
        const title = jobDescription ? (jobDescription.substring(0, 50) + "...") : "Optimization Run";
        setDeleteConfirm({ isOpen: true, runId: id, runTitle: title });
    };

    const handleDeleteConfirm = async () => {
        if (!deleteConfirm.runId) return;

        setDeleting(true);
        try {
            await deleteRun(deleteConfirm.runId);
            // Remove the deleted item from the list
            setHistoryItems(prev => prev.filter(item => item.id !== deleteConfirm.runId));
            setDeleteConfirm({ isOpen: false, runId: null, runTitle: '' });
        } catch (error) {
            console.error("Failed to delete run:", error);
            alert("Failed to delete optimization. Please try again.");
        } finally {
            setDeleting(false);
        }
    };

    const handleDeleteCancel = () => {
        setDeleteConfirm({ isOpen: false, runId: null, runTitle: '' });
    };

    return (
        <div className="min-h-screen bg-primary p-8">
            <div className="max-w-5xl mx-auto">
                {/* Header */}
                <div className="mb-12">
                    <h1 className="text-3xl font-bold text-primary mb-2 tracking-tight">Run History</h1>
                    <p className="text-gray-500 text-sm">Your complete history of optimization runs</p>
                </div>

                {/* History List */}
                <div className="space-y-4">
                    {loading ? (
                        <div className="text-center py-20">
                            <div className="w-12 h-12 mx-auto relative">
                                <div className="absolute inset-0 border-4 border-brand-primary/10 rounded-full" />
                                <div className="absolute inset-0 border-4 border-brand-primary border-t-transparent rounded-full animate-spin" />
                            </div>
                            <p className="text-gray-500 text-sm mt-6">Loading...</p>
                        </div>
                    ) : historyItems.length === 0 ? (
                        <div className="bg-surface border border-gray-200 rounded-[2.5rem] p-16 text-center shadow-xl shadow-black/5">
                            <div className="w-24 h-24 bg-secondary rounded-3xl flex items-center justify-center mx-auto mb-8 border border-gray-100">
                                <svg className="w-12 h-12 text-border-subtle" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-semibold text-primary mb-2">No Runs Yet</h3>
                            <p className="text-gray-500 text-sm mb-10 font-medium">Your historical data manifest is currently empty.</p>
                            <button
                                onClick={() => navigate('/new-optimization')}
                                className="px-8 py-3 bg-brand text-black rounded-2xl font-semibold text-sm tracking-wide shadow-xl hover:hover:bg-red-600 transition-all active:scale-95"
                            >
                                Initiate Primary Cycle
                            </button>
                        </div>
                    ) : (
                        historyItems.map((item) => (
                            <div
                                key={item.id}
                                className="bg-surface border border-gray-200 rounded-3xl p-8 hover:border-brand-primary/30 hover:shadow-xl hover:shadow-black/10 transition-all group"
                            >
                                <div className="flex items-center justify-between gap-8">
                                    {/* Left Side - Status, Date, Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-4 mb-3">
                                            <span className="px-3 py-1 bg-brand/10 text-brand rounded-full text-xs font-medium border border-brand-primary/10">
                                                {item.status}
                                            </span>
                                            <span className="text-gray-500 text-xs">
                                                {new Date(item.created_at).toLocaleDateString()}
                                            </span>
                                        </div>

                                        <h3 className="text-lg font-semibold text-primary mb-1 truncate">
                                            {item.job_description ? (item.job_description.substring(0, 60) + "...") : "Optimization Run"}
                                        </h3>
                                        <p className="text-gray-500 text-xs font-medium truncate">{item.job_description}</p>
                                    </div>

                                    {/* Right Side - Scores and Actions */}
                                    <div className="flex items-center gap-8 shrink-0">
                                        {/* Score Display */}
                                        <div className="text-right border-r border-gray-200 pr-8">
                                            <div className="flex items-center gap-3 mb-1">
                                                <span className="text-xl font-semibold text-gray-500">{Math.round(item.ats_score_before || 0)}</span>
                                                <svg className="w-4 h-4 text-border-subtle" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                                </svg>
                                                <span className="text-2xl font-bold text-primary underline decoration-brand-primary decoration-2 underline-offset-4">{Math.round(item.ats_score_after || 0)}</span>
                                            </div>
                                            <div className="text-brand text-xs font-medium">
                                                +{Math.round(item.improvement_delta || 0)} improvement
                                            </div>
                                        </div>

                                        {/* Action Buttons */}
                                        <div className="flex items-center gap-3">
                                            <button
                                                onClick={() => handleView(item.id)}
                                                className="p-4 bg-secondary hover:bg-brand text-gray-500 hover:text-black rounded-2xl transition-all shadow-inner border border-gray-100 hover:border-brand-primary active:scale-95"
                                                title="View Details"
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                </svg>
                                            </button>
                                            <button
                                                onClick={() => handleDeleteClick(item.id, item.job_description)}
                                                className="p-4 bg-secondary hover:bg-red-500 text-gray-500 hover:text-white rounded-2xl transition-all shadow-inner border border-gray-100 hover:border-red-500 active:scale-95"
                                                title="Delete"
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
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

            {/* Delete Confirmation Dialog */}
            <ConfirmDialog
                isOpen={deleteConfirm.isOpen}
                title="Delete Optimization"
                message={`Are you sure you want to delete "${deleteConfirm.runTitle}"? This action cannot be undone.`}
                confirmText={deleting ? "Deleting..." : "Delete"}
                cancelText="Cancel"
                onConfirm={handleDeleteConfirm}
                onCancel={handleDeleteCancel}
                variant="danger"
            />
        </div>
    );
}
