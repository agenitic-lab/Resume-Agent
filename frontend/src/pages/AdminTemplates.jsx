import React, { useState, useEffect, useCallback } from 'react';
import { getTemplates, getTemplatePreviewUrl, getToken, updateAdminTemplate, deleteAdminTemplate, getAdminTemplateContent } from '../services/api';
import toast from 'react-hot-toast';
import { Skeleton } from '../components/ui/skeleton';
import { Button } from "../components/ui/button";
import PdfViewer from '../components/PdfViewer';

const TAG_COLORS = {
    'modern': 'bg-blue-50 text-blue-600',
    'minimal': 'bg-gray-50 text-gray-500',
    'sans-serif': 'bg-purple-50 text-purple-600',
    'ats-friendly': 'bg-green-50 text-green-600',
    'ats-optimized': 'bg-green-50 text-green-600',
    'classic': 'bg-amber-50 text-amber-600',
    'popular': 'bg-orange-50 text-orange-600',
    'compact': 'bg-teal-50 text-teal-600',
    'single-column': 'bg-slate-50 text-slate-500',
    'clean': 'bg-emerald-50 text-emerald-600',
    'professional': 'bg-indigo-50 text-indigo-600',
    'tech': 'bg-violet-50 text-violet-600',
    'admin-custom': 'bg-brand/10 text-brand font-bold',
};

function getTagClass(tag) {
    return TAG_COLORS[tag] || 'bg-gray-50 text-gray-500';
}

// PDF preview modal overlay
function PreviewModal({ templateId, templateName, onClose }) {
    const [pdfUrl, setPdfUrl] = useState(null);
    const [loadError, setLoadError] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        async function loadPdf() {
            setLoading(true);
            setLoadError(false);
            try {
                const url = getTemplatePreviewUrl(templateId);
                const token = getToken();
                const response = await fetch(url, {
                    headers: token ? { Authorization: `Bearer ${token}` } : {},
                });
                if (!response.ok) throw new Error('Failed to load preview');
                const blob = await response.blob();
                if (!cancelled) {
                    setPdfUrl(URL.createObjectURL(blob));
                }
            } catch {
                if (!cancelled) setLoadError(true);
            } finally {
                if (!cancelled) setLoading(false);
            }
        }
        loadPdf();
        return () => {
            cancelled = true;
            if (pdfUrl) URL.revokeObjectURL(pdfUrl);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [templateId]);

    // Close on Escape key
    useEffect(() => {
        function handleKey(e) {
            if (e.key === 'Escape') onClose();
        }
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [onClose]);

    return (
        <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={onClose}
        >
            <div
                className="bg-surface rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Modal Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white">
                    <div>
                        <h3 className="text-lg font-bold text-primary">{templateName}</h3>
                        <p className="text-xs text-gray-500">Sample resume compiled with this template</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-9 h-9 rounded-xl bg-secondary hover:bg-gray-100 flex items-center justify-center transition-all text-gray-400 hover:text-primary"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Modal Body */}
                <div className="flex-1 min-h-0 p-4 bg-white">
                    {loading && (
                        <div className="flex flex-col items-center justify-center h-96 gap-4">
                            <div className="w-10 h-10 border-4 border-brand border-t-transparent rounded-full animate-spin" />
                            <p className="text-sm text-gray-500 font-medium">Compiling preview...</p>
                        </div>
                    )}
                    {loadError && (
                        <div className="flex flex-col items-center justify-center h-96 gap-3">
                            <svg className="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <p className="text-sm text-gray-500 font-medium">Failed to generate preview</p>
                            <p className="text-xs text-gray-400">The LaTeX compilation service may be unavailable</p>
                        </div>
                    )}
                    {pdfUrl && !loading && (
                        <div className="w-full h-[70vh]">
                            <PdfViewer
                                url={pdfUrl}
                                filename={`${templateName.replace(/\s+/g, '_')}_preview.pdf`}
                                className="rounded-xl border border-gray-100"
                                title={`${templateName} preview`}
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function AdminTemplates() {
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(true);

    // Editor state
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState('');
    const [formName, setFormName] = useState('');
    const [formLatex, setFormLatex] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    // Preview modal state
    const [previewTemplate, setPreviewTemplate] = useState(null);

    useEffect(() => {
        fetchBuiltinTemplates();
    }, []);

    const fetchBuiltinTemplates = async () => {
        try {
            setLoading(true);
            const data = await getTemplates();
            setTemplates(data.templates || []);
        } catch (error) {
            toast.error('Failed to load system templates');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateNew = () => {
        setEditingId('');
        setFormName('');
        setFormLatex('% Paste your LaTeX preamble here\n\\documentclass[a4paper,11pt]{article}\n\\usepackage[empty]{fullpage}\n% ... custom styles');
        setShowForm(true);
    };

    const handleEdit = async (templateId) => {
        try {
            setLoading(true);
            const data = await getAdminTemplateContent(templateId);
            setEditingId(templateId);
            setFormName(data.name || templateId);
            setFormLatex(data.content || '');
            setShowForm(true);
        } catch (error) {
            toast.error('Failed to load template content');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!formLatex.trim()) {
            toast.error('Template preamble cannot be empty');
            return;
        }

        let targetId = editingId;
        if (!targetId) {
            // new template, generate id from name or prompt
            const promptId = window.prompt("Enter a unique short ID for this template (no spaces, e.g. 'modern_v2'):");
            if (!promptId) return;
            targetId = promptId.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
        }

        try {
            setIsSaving(true);
            await updateAdminTemplate(targetId, formName, formLatex);
            toast.success('Template saved successfully');
            setShowForm(false);
            fetchBuiltinTemplates();
        } catch (error) {
            toast.error(error.message || 'Failed to save template');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (templateId) => {
        if (!window.confirm(`Are you sure you want to delete template '${templateId}'?`)) return;
        try {
            await deleteAdminTemplate(templateId);
            toast.success('Template deleted successfully');
            fetchBuiltinTemplates();
        } catch (error) {
            toast.error(error.message || 'Failed to delete template');
        }
    };

    const closePreview = useCallback(() => setPreviewTemplate(null), []);

    if (showForm) {
        return (
            <div className="min-h-screen p-4 md:p-8">
                <div className="max-w-5xl mx-auto">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold text-primary">
                            {editingId ? `Editing Template: ${editingId}` : 'Create New Template'}
                        </h2>
                        <div className="space-x-4">
                            <Button variant="outline" className="rounded-xl border-gray-200" onClick={() => setShowForm(false)}>Cancel</Button>
                            <Button className="rounded-xl bg-brand hover:opacity-90 transition-all text-white shadow-lg shadow-brand/20" onClick={handleSave} disabled={isSaving}>
                                {isSaving ? 'Saving...' : 'Save Template'}
                            </Button>
                        </div>
                    </div>

                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Display Name</label>
                        <input
                            type="text"
                            value={formName}
                            onChange={(e) => setFormName(e.target.value)}
                            className="w-full p-3 rounded-xl border border-gray-200 focus:ring-1 focus:ring-brand focus:border-brand outline-none"
                            placeholder="e.g. My Custom Corporate Style"
                        />
                    </div>

                    <div className="mb-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">LaTeX Preamble</label>
                        <p className="text-xs text-gray-500 mb-2">Define your document class, packages, and custom commands. Do NOT include \begin{`{document}`} or \end{`{document}`}.</p>
                    </div>

                    <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden h-[600px] flex p-2">
                        <textarea
                            className="w-full p-4 font-mono text-sm bg-gray-50 text-gray-800 resize-none outline-none rounded-2xl border border-gray-100 focus:ring-1 focus:ring-brand focus:border-brand transition-colors"
                            value={formLatex}
                            onChange={(e) => setFormLatex(e.target.value)}
                            spellCheck="false"
                        />
                    </div>
                </div>
            </div>
        );
    }

    if (loading) return (
        <div className="min-h-screen p-4 md:p-8">
            <div className="max-w-5xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <Skeleton className="h-7 w-48" />
                    <Skeleton className="h-10 w-32 rounded-xl" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="bg-white border border-gray-100 rounded-[2rem] p-5 shadow-sm">
                            <Skeleton className="w-full h-48 rounded-xl mb-4" />
                            <Skeleton className="h-5 w-40 mb-2" />
                            <Skeleton className="h-3 w-full mb-1" />
                            <Skeleton className="h-3 w-2/3 mb-4" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen p-4 md:p-8">
            <div className="max-w-5xl mx-auto">
                <div className="flex justify-between items-center mb-10">
                    <div>
                        <h1 className="text-3xl font-bold text-primary mb-2 tracking-tight">System Templates</h1>
                        <p className="text-gray-500 text-sm">View and manage the built-in ATS-friendly LaTeX templates available to all users.</p>
                    </div>
                    <Button
                        onClick={handleCreateNew}
                        className="bg-brand text-white hover:opacity-90 rounded-xl shadow-lg shadow-brand/20 px-6"
                    >
                        + Add Template
                    </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
                    {templates.map((tmpl) => {
                        return (
                            <div
                                key={tmpl.id}
                                className="bg-white border border-gray-100 rounded-[2rem] p-5 shadow-sm transition-all hover:shadow-xl hover:-translate-y-0.5 relative overflow-hidden flex flex-col"
                            >
                                {/* Clickable preview area */}
                                <button
                                    type="button"
                                    onClick={() => setPreviewTemplate({ id: tmpl.id, name: tmpl.name })}
                                    className="w-full h-52 rounded-xl mb-4 bg-gray-50 border border-gray-100 flex flex-col items-center justify-center overflow-hidden relative group cursor-pointer hover:bg-gray-100 transition-all"
                                >
                                    {/* Template color accent bar */}
                                    <div
                                        className="absolute top-0 left-0 w-full h-1.5 rounded-t-xl"
                                        style={{ backgroundColor: tmpl.preview_color || '#4A5568' }}
                                    />
                                    {/* Stylized document wireframe */}
                                    <div className="w-28 bg-white rounded-lg shadow-md p-3 border border-gray-100 space-y-1.5 transition-transform group-hover:scale-105">
                                        <div className="h-2.5 rounded-sm w-16" style={{ backgroundColor: tmpl.preview_color || '#4A5568', opacity: 0.85 }} />
                                        <div className="h-1.5 bg-gray-200 rounded-sm w-20" />
                                        <div className="h-px w-full mt-1" style={{ backgroundColor: tmpl.preview_color || '#4A5568', opacity: 0.4 }} />
                                        <div className="h-1.5 rounded-sm w-10" style={{ backgroundColor: tmpl.preview_color || '#4A5568', opacity: 0.6 }} />
                                        <div className="space-y-1">
                                            <div className="h-1 bg-gray-100 rounded-sm w-full" />
                                            <div className="h-1 bg-gray-100 rounded-sm w-5/6" />
                                            <div className="h-1 bg-gray-100 rounded-sm w-4/6" />
                                        </div>
                                        <div className="h-px w-full" style={{ backgroundColor: tmpl.preview_color || '#4A5568', opacity: 0.4 }} />
                                        <div className="h-1.5 rounded-sm w-8" style={{ backgroundColor: tmpl.preview_color || '#4A5568', opacity: 0.6 }} />
                                        <div className="space-y-1">
                                            <div className="h-1 bg-gray-100 rounded-sm w-full" />
                                            <div className="h-1 bg-gray-100 rounded-sm w-4/5" />
                                        </div>
                                    </div>
                                    {/* Hover overlay */}
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-all flex items-center justify-center">
                                        <span className="opacity-0 group-hover:opacity-100 transition-all bg-white/90 backdrop-blur-sm text-gray-700 text-xs font-semibold px-4 py-2 rounded-full shadow-lg flex items-center gap-1.5">
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                            </svg>
                                            Preview PDF
                                        </span>
                                    </div>
                                </button>

                                {/* Info */}
                                <div className="flex-1">
                                    <h3 className="text-base font-bold text-primary mb-1">{tmpl.name}</h3>
                                    <p className="text-gray-500 text-xs leading-relaxed mb-3 line-clamp-2">{tmpl.description}</p>

                                    {/* Tags */}
                                    <div className="flex flex-wrap gap-1.5 mb-4">
                                        {(tmpl.tags || []).slice(0, 4).map((tag) => (
                                            <span key={tag} className={`px-2 py-0.5 text-[10px] font-semibold rounded-full ${getTagClass(tag)}`}>
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex gap-2 w-full mt-2 pt-4 border-t border-gray-50">
                                    <Button
                                        onClick={() => handleEdit(tmpl.id)}
                                        variant="outline"
                                        className="flex-1 py-4 rounded-xl font-semibold text-sm transition-all border border-brand/20 bg-brand/5 text-brand hover:bg-brand/10"
                                    >
                                        Edit LaTeX
                                    </Button>
                                    {tmpl.is_admin_custom && (
                                        <Button
                                            onClick={() => handleDelete(tmpl.id)}
                                            variant="outline"
                                            className="py-4 rounded-xl font-semibold text-sm transition-all border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 px-3"
                                            title="Delete Template"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </Button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
                {templates.length === 0 && (
                    <div className="text-center py-12 bg-gray-50 rounded-[2rem] border border-gray-100">
                        <p className="text-gray-500 font-medium">No templates found in the system.</p>
                    </div>
                )}
            </div>

            {/* PDF Preview Modal */}
            {previewTemplate && (
                <PreviewModal
                    templateId={previewTemplate.id}
                    templateName={previewTemplate.name}
                    onClose={closePreview}
                />
            )}
        </div>
    );
}
