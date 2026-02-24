import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
    getTemplates,
    getTemplatePreference,
    getTemplatePreviewUrl,
    setTemplatePreference,
    resetTemplatePreference,
    addCustomTemplate,
    updateCustomTemplate,
    deleteCustomTemplate,
    getToken,
} from '../services/api';
import { Skeleton } from '../components/ui/skeleton';

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
};

function getTagClass(tag) {
    return TAG_COLORS[tag] || 'bg-gray-50 text-gray-500';
}

const MAX_CUSTOM = 3;

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
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <div>
                        <h3 className="text-lg font-bold text-primary">{templateName}</h3>
                        <p className="text-xs text-gray-500">Sample resume compiled with this template</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-9 h-9 rounded-xl bg-secondary hover:bg-primary flex items-center justify-center transition-all text-gray-400 hover:text-primary"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Modal Body */}
                <div className="flex-1 min-h-0 p-4">
                    {loading && (
                        <div className="flex flex-col items-center justify-center h-96 gap-4">
                            <div className="w-10 h-10 border-3 border-brand border-t-transparent rounded-full animate-spin" />
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
                        <iframe
                            src={pdfUrl}
                            title={`${templateName} preview`}
                            className="w-full h-[75vh] rounded-xl border border-gray-100"
                        />
                    )}
                </div>
            </div>
        </div>
    );
}

export default function Templates() {
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentPref, setCurrentPref] = useState(null);
    const [customTemplates, setCustomTemplates] = useState([]);
    const [saving, setSaving] = useState(false);

    // Preview modal state
    const [previewTemplate, setPreviewTemplate] = useState(null); // { id, name }

    // Custom template form state
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingIndex, setEditingIndex] = useState(null);
    const [formName, setFormName] = useState('');
    const [formLatex, setFormLatex] = useState('');

    async function loadData() {
        setLoading(true);
        try {
            const [tmplRes, prefRes] = await Promise.all([
                getTemplates(),
                getTemplatePreference(),
            ]);
            setTemplates(tmplRes.templates || []);
            setCurrentPref(prefRes.template_id || null);
            setCustomTemplates(prefRes.custom_templates || []);
        } catch (err) {
            toast.error(err.message || 'Failed to load templates');
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadData();
    }, []);

    async function handleSelectBuiltin(templateId) {
        setSaving(true);
        try {
            await setTemplatePreference(templateId);
            setCurrentPref(templateId);
            toast.success('Default template set');
        } catch (err) {
            toast.error(err.message || 'Failed to set preference');
        } finally {
            setSaving(false);
        }
    }

    async function handleSelectCustom(index) {
        setSaving(true);
        try {
            await setTemplatePreference(`custom_${index}`);
            setCurrentPref(`custom_${index}`);
            toast.success('Default template set');
        } catch (err) {
            toast.error(err.message || 'Failed to set preference');
        } finally {
            setSaving(false);
        }
    }

    async function handleReset() {
        setSaving(true);
        try {
            await resetTemplatePreference();
            setCurrentPref(null);
            toast.success('Template preference cleared');
        } catch (err) {
            toast.error(err.message || 'Failed to clear preference');
        } finally {
            setSaving(false);
        }
    }

    function openAddForm() {
        setEditingIndex(null);
        setFormName('');
        setFormLatex('');
        setShowAddForm(true);
    }

    function openEditForm(index) {
        setEditingIndex(index);
        setFormName(customTemplates[index]?.name || '');
        setFormLatex(customTemplates[index]?.latex || '');
        setShowAddForm(true);
    }

    function closeForm() {
        setShowAddForm(false);
        setEditingIndex(null);
        setFormName('');
        setFormLatex('');
    }

    async function handleSaveCustom() {
        if (!formName.trim() || !formLatex.trim()) {
            toast.error('Please provide both a name and LaTeX preamble');
            return;
        }
        setSaving(true);
        try {
            if (editingIndex !== null) {
                const res = await updateCustomTemplate(editingIndex, formName, formLatex);
                setCustomTemplates(res.custom_templates || []);
                toast.success('Custom template updated');
            } else {
                const res = await addCustomTemplate(formName, formLatex);
                setCustomTemplates(res.custom_templates || []);
                toast.success('Custom template added');
            }
            closeForm();
        } catch (err) {
            toast.error(err.message || 'Failed to save custom template');
        } finally {
            setSaving(false);
        }
    }

    async function handleDeleteCustom(index) {
        setSaving(true);
        try {
            const res = await deleteCustomTemplate(index);
            setCustomTemplates(res.custom_templates || []);
            // If deleted template was the default, reflect that
            if (currentPref === `custom_${index}`) {
                setCurrentPref(null);
            } else if (currentPref?.startsWith('custom_')) {
                const currIdx = parseInt(currentPref.replace('custom_', ''), 10);
                if (currIdx > index) {
                    setCurrentPref(`custom_${currIdx - 1}`);
                }
            }
            toast.success('Custom template deleted');
        } catch (err) {
            toast.error(err.message || 'Failed to delete template');
        } finally {
            setSaving(false);
        }
    }

    const closePreview = useCallback(() => setPreviewTemplate(null), []);

    // Determine active template display name
    function getActiveName() {
        if (!currentPref) return null;
        if (currentPref.startsWith('custom_')) {
            const idx = parseInt(currentPref.replace('custom_', ''), 10);
            return customTemplates[idx]?.name || 'Custom Template';
        }
        const builtin = templates.find(t => t.id === currentPref);
        return builtin?.name || currentPref;
    }

    return (
        <div className="min-h-screen bg-primary text-primary p-4 md:p-8">
            <div className="max-w-5xl mx-auto">
                {/* Header */}
                <div className="mb-10">
                    <h1 className="text-3xl font-bold text-primary mb-2 tracking-tight">Resume Templates</h1>
                    <p className="text-gray-500 text-sm">Choose a default template for your optimized resumes. Click any template to preview. You can also add up to {MAX_CUSTOM} custom LaTeX templates.</p>
                </div>

                {/* Current Selection Banner */}
                {!loading && currentPref && (
                    <div className="bg-surface border border-brand-primary/20 rounded-2xl p-5 mb-8 flex items-center justify-between shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-brand/10 rounded-xl flex items-center justify-center flex-shrink-0">
                                <svg className="w-5 h-5 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-primary">Active: {getActiveName()}</p>
                                <p className="text-xs text-gray-500">This template will be used for future optimizations</p>
                            </div>
                        </div>
                        <button
                            onClick={handleReset}
                            disabled={saving}
                            className="px-5 py-2 bg-secondary text-gray-500 rounded-xl font-medium text-xs hover:bg-primary hover:text-primary transition-all active:scale-95 border border-gray-100 disabled:opacity-50"
                        >
                            Clear
                        </button>
                    </div>
                )}

                {/* Loading Skeleton */}
                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="bg-surface border border-gray-200 rounded-[2rem] p-5 shadow-xl shadow-black/5">
                                <Skeleton className="w-full h-48 rounded-xl mb-4" />
                                <Skeleton className="h-5 w-40 mb-2" />
                                <Skeleton className="h-3 w-full mb-1" />
                                <Skeleton className="h-3 w-2/3 mb-4" />
                                <Skeleton className="h-9 w-full rounded-xl" />
                            </div>
                        ))}
                    </div>
                ) : (
                    <>
                        {/* Built-in Templates */}
                        <h2 className="text-lg font-semibold text-primary mb-4 tracking-tight">Built-in Templates</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
                            {templates.map((tmpl) => {
                                const isActive = currentPref === tmpl.id;
                                return (
                                    <div
                                        key={tmpl.id}
                                        className={`bg-surface border rounded-[2rem] p-5 shadow-xl shadow-black/5 transition-all hover:shadow-2xl hover:-translate-y-0.5 relative overflow-hidden ${isActive ? 'border-brand-primary/40 ring-2 ring-brand/20' : 'border-gray-200'}`}
                                    >
                                        {isActive && <div className="absolute top-0 left-0 w-full h-1 bg-brand" />}

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
                                            {isActive && (
                                                <div className="absolute top-3 right-3 w-7 h-7 bg-brand rounded-full flex items-center justify-center shadow-lg z-10">
                                                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                    </svg>
                                                </div>
                                            )}
                                        </button>

                                        {/* Info */}
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

                                        {/* Action */}
                                        <button
                                            onClick={() => handleSelectBuiltin(tmpl.id)}
                                            disabled={saving || isActive}
                                            className={`w-full py-2.5 rounded-xl font-semibold text-sm transition-all active:scale-[0.98] disabled:opacity-50 ${isActive
                                                ? 'bg-brand/10 text-brand border border-brand-primary/20 cursor-default'
                                                : 'bg-brand text-white hover:opacity-90 shadow-lg shadow-brand-primary/10'
                                            }`}
                                        >
                                            {isActive ? 'Active' : 'Set as Default'}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Custom Templates Section */}
                        <div className="bg-surface border border-gray-200 rounded-[2.5rem] p-6 md:p-10 shadow-xl shadow-black/5 overflow-hidden relative">
                            <div className="absolute top-0 left-0 w-full h-1 bg-brand/20" />
                            <div className="flex items-center justify-between mb-2">
                                <h2 className="text-lg font-semibold text-primary">Custom Templates</h2>
                                <span className="text-xs text-gray-400 font-medium">{customTemplates.length}/{MAX_CUSTOM} slots used</span>
                            </div>
                            <p className="text-secondary text-sm leading-relaxed mb-6 font-medium">
                                Add your own LaTeX preamble and styles. The AI agent will generate content using your custom design.
                            </p>

                            {/* Existing custom templates */}
                            {customTemplates.length > 0 && (
                                <div className="space-y-4 mb-6">
                                    {customTemplates.map((ct, idx) => {
                                        const isActive = currentPref === `custom_${idx}`;
                                        return (
                                            <div
                                                key={idx}
                                                className={`bg-secondary rounded-2xl p-5 border transition-all ${isActive ? 'border-brand-primary/30 ring-1 ring-brand/10' : 'border-gray-100'}`}
                                            >
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0 ${isActive ? 'bg-brand text-white' : 'bg-gray-200 text-gray-500'}`}>
                                                            {idx + 1}
                                                        </div>
                                                        <h4 className="text-sm font-semibold text-primary">{ct.name}</h4>
                                                        {isActive && (
                                                            <span className="px-2 py-0.5 bg-brand/10 text-brand text-[10px] font-bold rounded-full">Active</span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={() => handleSelectCustom(idx)}
                                                            disabled={saving || isActive}
                                                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${isActive ? 'text-brand cursor-default' : 'bg-brand text-white hover:opacity-90'}`}
                                                        >
                                                            {isActive ? 'Default' : 'Set Default'}
                                                        </button>
                                                        <button
                                                            onClick={() => openEditForm(idx)}
                                                            disabled={saving}
                                                            className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-500 hover:text-primary hover:bg-gray-100 transition-all border border-gray-200"
                                                        >
                                                            Edit
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteCustom(idx)}
                                                            disabled={saving}
                                                            className="px-3 py-1.5 rounded-lg text-xs font-medium text-red-400 hover:text-red-500 hover:bg-red-50 transition-all border border-gray-200"
                                                        >
                                                            Delete
                                                        </button>
                                                    </div>
                                                </div>
                                                <div className="bg-primary/50 rounded-xl p-3 mt-2">
                                                    <pre className="text-[10px] text-gray-500 font-mono whitespace-pre-wrap line-clamp-3 overflow-hidden">
                                                        {ct.latex?.substring(0, 200) || ''}...
                                                    </pre>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Add/Edit form */}
                            {showAddForm ? (
                                <div className="space-y-4 border-t border-gray-100 pt-6">
                                    <h3 className="text-sm font-semibold text-primary">
                                        {editingIndex !== null ? 'Edit Custom Template' : 'Add Custom Template'}
                                    </h3>
                                    <input
                                        type="text"
                                        value={formName}
                                        onChange={(e) => setFormName(e.target.value)}
                                        placeholder="Template name (e.g. My ATS Template)"
                                        maxLength={50}
                                        className="w-full px-5 py-3 bg-secondary border border-gray-100 rounded-xl text-primary placeholder-gray-400 focus:outline-none focus:border-brand-primary/30 focus:ring-1 focus:ring-brand/20 transition-all text-sm"
                                    />
                                    <textarea
                                        value={formLatex}
                                        onChange={(e) => setFormLatex(e.target.value)}
                                        placeholder={`% Paste your LaTeX preamble here\n\\documentclass[letterpaper,10pt]{article}\n\\usepackage[empty]{fullpage}\n\\usepackage{titlesec}\n% ... your custom styles`}
                                        rows={10}
                                        className="w-full px-5 py-4 bg-secondary border border-gray-100 rounded-2xl text-primary placeholder-gray-400 focus:outline-none focus:border-brand-primary/30 focus:ring-1 focus:ring-brand/20 transition-all font-mono text-xs leading-relaxed resize-y"
                                    />
                                    <div className="flex flex-col sm:flex-row gap-3">
                                        <button
                                            onClick={handleSaveCustom}
                                            disabled={saving || !formName.trim() || !formLatex.trim()}
                                            className="px-8 py-3 bg-brand text-white rounded-2xl font-semibold text-sm tracking-wide shadow-lg hover:opacity-90 transition-all disabled:opacity-50 active:scale-95"
                                        >
                                            {saving ? 'Saving...' : editingIndex !== null ? 'Update Template' : 'Save Template'}
                                        </button>
                                        <button
                                            onClick={closeForm}
                                            className="px-8 py-3 bg-secondary text-gray-500 rounded-2xl font-medium text-sm hover:bg-primary transition-all active:scale-95 border border-gray-100"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                customTemplates.length < MAX_CUSTOM && (
                                    <button
                                        onClick={openAddForm}
                                        className="px-8 py-3 bg-brand text-white rounded-2xl font-semibold text-sm tracking-wide hover:bg-white transition-all active:scale-95 flex items-center gap-2"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                                        </svg>
                                        Add Custom Template
                                    </button>
                                )
                            )}
                        </div>
                    </>
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
