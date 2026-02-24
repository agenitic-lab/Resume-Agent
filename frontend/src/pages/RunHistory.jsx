import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUserRuns, deleteRun, getMissingSkillsHistory, deleteMissingSkillsRun } from '../services/api';
import ConfirmDialog from '../components/ConfirmDialog';
import { Skeleton } from '../components/ui/skeleton';

// ── Category accent colours (for skills history) ────────────────────────
const CATEGORY_COLORS = {
    'Programming Languages': { bg: 'bg-blue-500/10', border: 'border-blue-500/20', badge: 'bg-blue-500/20 text-blue-400', dot: 'bg-blue-400' },
    'Frameworks & Libraries': { bg: 'bg-purple-500/10', border: 'border-purple-500/20', badge: 'bg-purple-500/20 text-purple-400', dot: 'bg-purple-400' },
    'Cloud & DevOps': { bg: 'bg-orange-500/10', border: 'border-orange-500/20', badge: 'bg-orange-500/20 text-orange-400', dot: 'bg-orange-400' },
    'Databases': { bg: 'bg-cyan-500/10', border: 'border-cyan-500/20', badge: 'bg-cyan-500/20 text-cyan-400', dot: 'bg-cyan-400' },
    'Tools & Platforms': { bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', badge: 'bg-yellow-500/20 text-yellow-400', dot: 'bg-yellow-400' },
    'Soft Skills & Concepts': { bg: 'bg-green-500/10', border: 'border-green-500/20', badge: 'bg-green-500/20 text-green-400', dot: 'bg-green-400' },
};
const DEFAULT_COLORS = { bg: 'bg-gray-500/10', border: 'border-gray-500/20', badge: 'bg-gray-500/20 text-gray-400', dot: 'bg-gray-400' };
function getCategoryColors(cat) { return CATEGORY_COLORS[cat] || DEFAULT_COLORS; }

export default function RunHistory() {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('runs'); // 'runs' | 'skills'

    // ── Run History state ────────────────────────────────────────────────
    const [historyItems, setHistoryItems] = useState([]);
    const [loadingRuns, setLoadingRuns] = useState(true);
    const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, runId: null, runTitle: '', type: '' });
    const [deleting, setDeleting] = useState(false);

    // ── Skills History state ─────────────────────────────────────────────
    const [skillsItems, setSkillsItems] = useState([]);
    const [loadingSkills, setLoadingSkills] = useState(true);
    const [expandedId, setExpandedId] = useState(null);

    // ── Fetch data ───────────────────────────────────────────────────────
    useEffect(() => {
        const fetchRuns = async () => {
            try {
                const runs = await getUserRuns(100);
                setHistoryItems(runs);
            } catch (error) {
                console.error("Failed to fetch history:", error);
            } finally {
                setLoadingRuns(false);
            }
        };
        fetchRuns();
    }, []);

    useEffect(() => {
        const fetchSkills = async () => {
            try {
                const runs = await getMissingSkillsHistory(100);
                setSkillsItems(runs);
            } catch (error) {
                console.error("Failed to fetch skills history:", error);
            } finally {
                setLoadingSkills(false);
            }
        };
        fetchSkills();
    }, []);

    // ── Handlers ─────────────────────────────────────────────────────────
    const handleView = (id) => navigate(`/optimization/${id}`);

    const handleDeleteClick = (id, title, type) => {
        setDeleteConfirm({ isOpen: true, runId: id, runTitle: title, type });
    };

    const handleDeleteConfirm = async () => {
        if (!deleteConfirm.runId) return;
        setDeleting(true);
        try {
            if (deleteConfirm.type === 'run') {
                await deleteRun(deleteConfirm.runId);
                setHistoryItems(prev => prev.filter(item => item.id !== deleteConfirm.runId));
            } else {
                await deleteMissingSkillsRun(deleteConfirm.runId);
                setSkillsItems(prev => prev.filter(item => item.id !== deleteConfirm.runId));
            }
            setDeleteConfirm({ isOpen: false, runId: null, runTitle: '', type: '' });
        } catch (error) {
            console.error("Failed to delete:", error);
            alert("Failed to delete. Please try again.");
        } finally {
            setDeleting(false);
        }
    };

    const handleDeleteCancel = () => {
        setDeleteConfirm({ isOpen: false, runId: null, runTitle: '', type: '' });
    };

    // ── Skeleton loader ──────────────────────────────────────────────────
    const renderSkeletons = () => (
        <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="bg-surface border border-gray-100 rounded-3xl p-8">
                    <div className="flex items-center justify-between gap-8">
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-4 mb-3">
                                <Skeleton className="h-6 w-20 rounded-full" />
                                <Skeleton className="h-4 w-28" />
                            </div>
                            <Skeleton className="h-5 w-2/3 mb-2" />
                            <Skeleton className="h-4 w-1/2" />
                        </div>
                        <div className="flex items-center gap-8 shrink-0">
                            <div className="text-right border-r border-gray-100 pr-8 space-y-2">
                                <Skeleton className="h-8 w-12" />
                                <Skeleton className="h-3 w-24 ml-auto" />
                            </div>
                            <div className="flex items-center gap-3">
                                <Skeleton className="h-12 w-12 rounded-2xl" />
                                <Skeleton className="h-12 w-12 rounded-2xl" />
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );

    return (
        <div className="min-h-screen bg-primary p-4 md:p-8">
            <div className="max-w-5xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-primary mb-2 tracking-tight">History</h1>
                    <p className="text-gray-500 text-sm">Your complete history of optimization runs and skill analyses</p>
                </div>

                {/* Tabs */}
                <div className="flex items-center gap-1 bg-secondary rounded-2xl p-1.5 mb-8 w-fit border border-gray-200">
                    <button
                        onClick={() => setActiveTab('runs')}
                        className={`px-6 py-2.5 rounded-xl text-sm font-semibold transition-all ${activeTab === 'runs'
                            ? 'bg-brand text-white shadow-lg shadow-brand-primary/20'
                            : 'text-gray-500 hover:text-primary'
                            }`}
                    >
                        Run History
                    </button>
                    <button
                        onClick={() => setActiveTab('skills')}
                        className={`px-6 py-2.5 rounded-xl text-sm font-semibold transition-all ${activeTab === 'skills'
                            ? 'bg-brand text-white shadow-lg shadow-brand-primary/20'
                            : 'text-gray-500 hover:text-primary'
                            }`}
                    >
                        Skills History
                    </button>
                </div>

                {/* ════════════════ RUN HISTORY TAB ════════════════ */}
                {activeTab === 'runs' && (
                    <div className="space-y-4">
                        {loadingRuns ? renderSkeletons() : historyItems.length === 0 ? (
                            <div className="bg-surface border border-gray-200 rounded-[2.5rem] p-8 md:p-16 text-center shadow-xl shadow-black/5">
                                <div className="w-24 h-24 bg-secondary rounded-3xl flex items-center justify-center mx-auto mb-8 border border-gray-100">
                                    <svg className="w-12 h-12 text-border-subtle" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                </div>
                                <h3 className="text-xl font-semibold text-primary mb-2">No Runs Yet</h3>
                                <p className="text-gray-500 text-sm mb-10 font-medium">You haven't run any optimizations yet.</p>
                                <button
                                    onClick={() => navigate('/new-optimization')}
                                    className="px-8 py-3 bg-brand text-white rounded-2xl font-semibold text-sm tracking-wide shadow-xl hover:bg-brand-hover transition-all active:scale-95"
                                >
                                    Start First Optimization
                                </button>
                            </div>
                        ) : (
                            historyItems.map((item) => (
                                <div
                                    key={item.id}
                                    className="bg-surface border border-gray-200 rounded-3xl p-6 md:p-8 hover:border-brand-primary/30 hover:shadow-xl hover:shadow-black/10 transition-all group"
                                >
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 md:gap-8">
                                        {/* Left Side */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-4 mb-3">
                                                <span className="px-3 py-1 bg-brand/10 text-brand rounded-full text-xs font-medium border border-brand-primary/10">
                                                    {item.status}
                                                </span>
                                                <span className="text-gray-500 text-xs">
                                                    {item.created_at ? new Date(item.created_at).toLocaleDateString() : 'Unknown'}
                                                </span>
                                            </div>
                                            <h3 className="text-lg font-semibold text-primary mb-1 truncate">
                                                {item.job_description ? (item.job_description.substring(0, 60) + "...") : "Optimization Run"}
                                            </h3>
                                            <p className="text-gray-500 text-xs font-medium truncate">{item.job_description}</p>
                                        </div>

                                        {/* Right Side */}
                                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 sm:gap-8 shrink-0 w-full md:w-auto">
                                            <div className="text-left sm:text-right border-b sm:border-b-0 sm:border-r border-gray-200 pb-4 sm:pb-0 pr-0 sm:pr-8 w-full sm:w-auto">
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
                                            <div className="flex items-center gap-3 w-full sm:w-auto justify-end sm:justify-start">
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
                                                    onClick={() => handleDeleteClick(item.id, item.job_description ? (item.job_description.substring(0, 50) + "...") : "Optimization Run", 'run')}
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
                )}

                {/* ════════════════ SKILLS HISTORY TAB ════════════════ */}
                {activeTab === 'skills' && (
                    <div className="space-y-4">
                        {loadingSkills ? renderSkeletons() : skillsItems.length === 0 ? (
                            <div className="bg-surface border border-gray-200 rounded-[2.5rem] p-8 md:p-16 text-center shadow-xl shadow-black/5">
                                <div className="w-24 h-24 bg-secondary rounded-3xl flex items-center justify-center mx-auto mb-8 border border-gray-100">
                                    <svg className="w-12 h-12 text-border-subtle" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                    </svg>
                                </div>
                                <h3 className="text-xl font-semibold text-primary mb-2">No Analyses Yet</h3>
                                <p className="text-gray-500 text-sm mb-10 font-medium">You haven&apos;t run any missing skills analyses yet.</p>
                                <button
                                    onClick={() => navigate('/missing-skills')}
                                    className="px-8 py-3 bg-brand text-white rounded-2xl font-semibold text-sm tracking-wide shadow-xl hover:bg-brand-hover transition-all active:scale-95"
                                >
                                    Analyze Missing Skills
                                </button>
                            </div>
                        ) : (
                            skillsItems.map((item) => {
                                const isExpanded = expandedId === item.id;
                                const missingSkills = item.result_json?.missing_skills || [];

                                return (
                                    <div
                                        key={item.id}
                                        className="bg-surface border border-gray-200 rounded-3xl overflow-hidden hover:border-brand-primary/30 hover:shadow-xl hover:shadow-black/10 transition-all group"
                                    >
                                        {/* Card Header */}
                                        <div className="p-6 md:p-8">
                                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 md:gap-8">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-4 mb-3">
                                                        <span className="px-3 py-1 bg-brand/10 text-brand rounded-full text-xs font-medium border border-brand-primary/10">
                                                            Completed
                                                        </span>
                                                        <span className="text-gray-500 text-xs">
                                                            {item.created_at ? new Date(item.created_at).toLocaleDateString() : 'Unknown'}
                                                        </span>
                                                    </div>
                                                    <h3 className="text-lg font-semibold text-primary mb-1 truncate">
                                                        {item.resume_snippet ? (item.resume_snippet.substring(0, 60) + "…") : "Missing Skills Analysis"}
                                                    </h3>
                                                    <p className="text-gray-500 text-xs font-medium">
                                                        {item.jds_count} JD{item.jds_count !== 1 ? 's' : ''} submitted · {item.jds_analyzed} analyzed
                                                    </p>
                                                </div>

                                                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 sm:gap-8 shrink-0 w-full md:w-auto">
                                                    <div className="text-left sm:text-right border-b sm:border-b-0 sm:border-r border-gray-200 pb-4 sm:pb-0 pr-0 sm:pr-8 w-full sm:w-auto">
                                                        <span className="text-2xl font-bold text-primary underline decoration-brand-primary decoration-2 underline-offset-4">
                                                            {item.total_missing}
                                                        </span>
                                                        <div className="text-brand text-xs font-medium mt-1">missing skills</div>
                                                    </div>
                                                    <div className="flex items-center gap-3 w-full sm:w-auto justify-end sm:justify-start">
                                                        <button
                                                            onClick={() => setExpandedId(prev => prev === item.id ? null : item.id)}
                                                            className={`p-4 rounded-2xl transition-all shadow-inner border active:scale-95 ${isExpanded
                                                                ? 'bg-brand text-white border-brand-primary'
                                                                : 'bg-secondary hover:bg-brand text-gray-500 hover:text-black border-gray-100 hover:border-brand-primary'
                                                                }`}
                                                            title={isExpanded ? "Collapse" : "Expand Details"}
                                                        >
                                                            <svg className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                                                            </svg>
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteClick(item.id, 'Missing Skills Analysis', 'skills')}
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

                                        {/* Expanded Skills Breakdown */}
                                        {isExpanded && missingSkills.length > 0 && (
                                            <div className="border-t border-gray-200 p-6 md:p-8 bg-secondary/30">
                                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                                    {missingSkills.map(cat => {
                                                        const colors = getCategoryColors(cat.category);
                                                        return (
                                                            <div key={cat.category} className={`${colors.bg} border ${colors.border} rounded-2xl p-4`}>
                                                                <div className="flex items-center gap-2 mb-3">
                                                                    <div className={`w-2 h-2 rounded-full ${colors.dot} flex-shrink-0`} />
                                                                    <h4 className="text-[11px] font-black uppercase tracking-widest text-primary">{cat.category}</h4>
                                                                    <span className={`ml-auto text-[10px] font-black px-2 py-0.5 rounded-full ${colors.badge}`}>{cat.skills.length}</span>
                                                                </div>
                                                                <div className="flex flex-wrap gap-1.5">
                                                                    {cat.skills.map(skill => (
                                                                        <span key={skill} className="inline-block px-2.5 py-1 bg-surface/60 border border-gray-200 rounded-lg text-primary text-[11px] font-semibold">
                                                                            {skill}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}

                                        {isExpanded && missingSkills.length === 0 && (
                                            <div className="border-t border-gray-200 p-6 md:p-8 bg-secondary/30 text-center">
                                                <p className="text-green-500 text-sm font-semibold">✓ No missing skills — your resume covered all requirements!</p>
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                )}
            </div>

            {/* Delete Confirmation Dialog */}
            <ConfirmDialog
                isOpen={deleteConfirm.isOpen}
                title={deleteConfirm.type === 'run' ? "Delete Optimization" : "Delete Analysis"}
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
