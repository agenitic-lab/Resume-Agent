import React, { useState, useRef } from 'react';
import { findMissingSkills, getApiKeyStatus } from '../services/api';
import { useEffect } from 'react';
import toast from 'react-hot-toast';

const MAX_JDS = 20;
const API_BASE_URL = (import.meta.env.VITE_API_URL || '').trim();

// ─── Category accent colours ───────────────────────────────────────────────
const CATEGORY_COLORS = {
  'Programming Languages': { bg: 'bg-blue-50', border: 'border-blue-200', badge: 'bg-blue-100 text-blue-700', dot: 'bg-blue-500' },
  'Frameworks & Libraries': { bg: 'bg-purple-50', border: 'border-purple-200', badge: 'bg-purple-100 text-purple-700', dot: 'bg-purple-500' },
  'Cloud & DevOps': { bg: 'bg-orange-50', border: 'border-orange-200', badge: 'bg-orange-100 text-orange-700', dot: 'bg-orange-500' },
  'Databases': { bg: 'bg-cyan-50', border: 'border-cyan-200', badge: 'bg-cyan-100 text-cyan-700', dot: 'bg-cyan-500' },
  'Tools & Platforms': { bg: 'bg-yellow-50', border: 'border-yellow-200', badge: 'bg-yellow-100 text-yellow-700', dot: 'bg-yellow-500' },
  'Soft Skills & Concepts': { bg: 'bg-green-50', border: 'border-green-200', badge: 'bg-green-100 text-green-700', dot: 'bg-green-500' },
};
const DEFAULT_COLORS = { bg: 'bg-gray-50', border: 'border-gray-200', badge: 'bg-gray-100 text-gray-600', dot: 'bg-gray-400' };

function getCategoryColors(cat) {
  return CATEGORY_COLORS[cat] || DEFAULT_COLORS;
}

// ─── Small reusable components ─────────────────────────────────────────────
function SectionLabel({ children }) {
  return (
    <p className="text-muted text-xs font-semibold uppercase tracking-wide mb-2">
      {children}
    </p>
  );
}

function IconBtn({ onClick, title, disabled, children, variant = 'ghost' }) {
  const base = 'transition-all rounded-lg p-1.5 disabled:opacity-40 disabled:cursor-not-allowed';
  const variants = {
    ghost: 'text-muted hover:text-primary hover:bg-secondary',
    danger: 'text-red-400/60 hover:text-red-400 hover:bg-red-400/10',
  };
  return (
    <button onClick={onClick} title={title} disabled={disabled} className={`${base} ${variants[variant]}`}>
      {children}
    </button>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────
export default function MissingSkills() {
  // Resume
  const [resumeInputType, setResumeInputType] = useState('text'); // 'text' | 'pdf'
  const [resumeText, setResumeText] = useState('');
  const [isExtractingPdf, setIsExtractingPdf] = useState(false);
  const fileInputRef = useRef(null);

  // JDs
  const [jobDescriptions, setJobDescriptions] = useState(['']);

  // State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [hasApiKey, setHasApiKey] = useState(null);

  // Check API key on mount
  useEffect(() => {
    getApiKeyStatus()
      .then(s => setHasApiKey(Boolean(s.has_api_key)))
      .catch(() => setHasApiKey(false));
  }, []);

  // ── Resume helpers ──────────────────────────────────────────────────────
  async function handlePdfUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf') { toast.error('Please upload a PDF file'); return; }

    setIsExtractingPdf(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch(`${API_BASE_URL}/api/pdf/extract`, { method: 'POST', body: formData, credentials: 'include' });
      if (!res.ok) throw new Error('PDF extraction failed');
      const data = await res.json();
      setResumeText(data.text || '');
      toast.success('PDF text extracted');
    } catch (err) {
      toast.error(err.message || 'Failed to extract PDF');
    } finally {
      setIsExtractingPdf(false);
      e.target.value = '';
    }
  }

  // ── JD helpers ──────────────────────────────────────────────────────────
  function addJD() {
    if (jobDescriptions.length >= MAX_JDS) {
      toast.error(`Maximum ${MAX_JDS} job descriptions allowed`);
      return;
    }
    setJobDescriptions(prev => [...prev, '']);
  }

  function updateJD(index, value) {
    setJobDescriptions(prev => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }

  function removeJD(index) {
    setJobDescriptions(prev => prev.filter((_, i) => i !== index));
  }

  function moveJD(index, direction) {
    setJobDescriptions(prev => {
      const next = [...prev];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  // ── Analysis ────────────────────────────────────────────────────────────
  async function handleAnalyze() {
    if (!resumeText.trim()) { toast.error('Please provide your resume'); return; }

    const nonEmpty = jobDescriptions.filter(jd => jd.trim());
    if (nonEmpty.length === 0) { toast.error('Add at least one job description'); return; }

    if (!hasApiKey) { toast.error('Set your Groq API key in Settings first'); return; }

    setIsAnalyzing(true);
    setResult(null);
    try {
      const data = await findMissingSkills(resumeText.trim(), nonEmpty);
      setResult(data);

      // Show rate-limit-aware toast messages
      if (data.rate_limit_hit && data.rate_limit_type === 'daily') {
        toast.error(
          'Daily API limit reached. Showing partial results from JDs analyzed before the limit was hit.',
          { duration: 6000 }
        );
      } else if (data.rate_limit_hit && data.rate_limit_type === 'tpm') {
        toast(
          '⚠ Token-per-minute limit hit. Try shorter JDs or fewer at once.',
          { duration: 5000, icon: '⚠️' }
        );
      } else if (data.warning) {
        toast(data.warning, { duration: 5000, icon: 'ℹ️' });
      } else if (data.total_missing === 0) {
        toast.success('No missing skills found — your resume covers all the requirements!');
      } else {
        toast.success(`Found ${data.total_missing} missing skills across ${data.jds_analyzed} JDs`);
      }
    } catch (err) {
      // Parse backend error message for specific rate limit errors
      const msg = err.message || '';
      if (msg.toLowerCase().includes('daily') || msg.toLowerCase().includes('rate limit')) {
        toast.error('Groq API rate limit exceeded. ' + msg, { duration: 7000 });
      } else {
        toast.error(msg || 'Analysis failed. Please try again.');
      }
    } finally {
      setIsAnalyzing(false);
    }
  }

  function copyAllSkills() {
    if (!result || !result.missing_skills) return;
    const lines = result.missing_skills.map(cat =>
      `${cat.category}:\n${cat.skills.map(s => `  • ${s}`).join('\n')}`
    ).join('\n\n');
    navigator.clipboard.writeText(lines);
    toast.success('Copied to clipboard');
  }

  function resetAll() {
    setResumeText('');
    setJobDescriptions(['']);
    setResult(null);
  }

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-primary text-primary p-4 md:p-8">
      <div className="max-w-7xl mx-auto">

        {/* Page header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-primary mb-2 tracking-tight">
            Find Missing{' '}
            <span className="text-brand">Skills</span>
          </h1>
          <p className="text-secondary text-sm font-medium">
            Paste your resume + up to 20 job descriptions · AI identifies the skills you need to learn
          </p>
        </div>

        {/* API key warning */}
        {hasApiKey === false && (
          <div className="mb-6 flex items-center gap-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-5 py-4">
            <svg className="w-5 h-5 text-yellow-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
            <p className="text-yellow-700 text-xs font-bold">
              No API key set.{' '}
              <a href="/settings" className="underline hover:text-yellow-200">Go to Settings</a>{' '}
              to add your Groq API key before running analysis.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">

          {/* ── Left panel: Resume ─────────────────────────────────────────── */}
          <div className="bg-surface border border-gray-100 rounded-4xl p-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-0.5 bg-brand/30" />

            <div className="flex items-center justify-between mb-4">
              <div>
                <SectionLabel>Step 1 — Your Resume</SectionLabel>
                <h2 className="text-sm font-semibold text-primary">Resume</h2>
              </div>
              {/* Toggle: text or PDF */}
              <div className="flex gap-1 bg-secondary rounded-lg p-1">
                {['text', 'pdf'].map(t => (
                  <button
                    key={t}
                    onClick={() => setResumeInputType(t)}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${resumeInputType === t
                      ? 'bg-brand text-white'
                      : 'text-muted hover:text-primary'
                      }`}
                  >
                    {t === 'text' ? 'Paste Text' : 'Upload PDF'}
                  </button>
                ))}
              </div>
            </div>

            {resumeInputType === 'text' ? (
              <textarea
                value={resumeText}
                onChange={e => setResumeText(e.target.value)}
                placeholder="Paste your resume content here…"
                rows={16}
                className="w-full bg-secondary border border-gray-100 rounded-xl px-4 py-3 text-primary text-sm placeholder:text-muted resize-none focus:outline-none focus:border-brand/50 transition-colors"
              />
            ) : (
              <div className="space-y-3">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-xl py-10 cursor-pointer hover:border-brand/50 transition-colors"
                >
                  {isExtractingPdf ? (
                    <div className="flex items-center gap-2 text-muted text-xs font-medium">
                      <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      Extracting text…
                    </div>
                  ) : (
                    <>
                      <svg className="w-8 h-8 text-muted mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                      <p className="text-muted text-xs font-medium">Click to upload PDF resume</p>
                    </>
                  )}
                </div>
                <input ref={fileInputRef} type="file" accept=".pdf" className="hidden" onChange={handlePdfUpload} />

                {resumeText && (
                  <div className="bg-secondary border border-gray-100 rounded-xl px-4 py-3">
                    <p className="text-brand text-xs font-semibold mb-1">Text extracted ✓</p>
                    <p className="text-muted text-xs line-clamp-3">{resumeText.slice(0, 200)}…</p>
                  </div>
                )}
              </div>
            )}

            {resumeText && (
              <p className="mt-2 text-muted text-xs font-medium">
                {resumeText.length.toLocaleString()} characters · ready
              </p>
            )}
          </div>

          {/* ── Right panel: Job Descriptions ──────────────────────────────── */}
          <div className="bg-surface border border-gray-100 rounded-4xl p-6 relative overflow-hidden flex flex-col">
            <div className="absolute top-0 left-0 w-full h-0.5 bg-brand/30" />

            <div className="flex items-center justify-between mb-4">
              <div>
                <SectionLabel>Step 2 — Job Descriptions</SectionLabel>
                <h2 className="text-sm font-semibold text-primary">
                  JDs{' '}
                  <span className="text-muted font-normal">
                    ({jobDescriptions.length}/{MAX_JDS})
                  </span>
                </h2>
              </div>
              <button
                onClick={addJD}
                disabled={jobDescriptions.length >= MAX_JDS}
                className="flex items-center gap-1.5 px-3 py-2 bg-brand/10 border border-brand/20 rounded-lg text-brand text-xs font-semibold hover:bg-brand/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                </svg>
                Add JD
              </button>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto max-h-130 pr-1 scrollbar-thin">
              {jobDescriptions.map((jd, idx) => (
                <div key={idx} className="group relative bg-secondary border border-gray-100 rounded-xl overflow-hidden focus-within:border-brand/40 transition-colors">
                  {/* JD header bar */}
                  <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100 bg-gray-50">
                    <span className="text-xs font-medium text-muted">
                      JD #{idx + 1}
                    </span>
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <IconBtn onClick={() => moveJD(idx, -1)} disabled={idx === 0} title="Move up">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" />
                        </svg>
                      </IconBtn>
                      <IconBtn onClick={() => moveJD(idx, 1)} disabled={idx === jobDescriptions.length - 1} title="Move down">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                        </svg>
                      </IconBtn>
                      <IconBtn onClick={() => removeJD(idx)} title="Remove" variant="danger" disabled={jobDescriptions.length === 1}>
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </IconBtn>
                    </div>
                  </div>
                  <textarea
                    value={jd}
                    onChange={e => updateJD(idx, e.target.value)}
                    placeholder={`Paste job description #${idx + 1} here…`}
                    rows={5}
                    className="w-full bg-transparent px-3 py-2.5 text-primary text-xs placeholder:text-muted resize-none focus:outline-none"
                  />
                  {jd.trim() && (
                    <div className="absolute bottom-1.5 right-2 text-[9px] font-medium text-muted opacity-60">
                      {jd.length} chars
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Add more hint */}
            {jobDescriptions.length < MAX_JDS && (
              <button
                onClick={addJD}
                className="mt-3 w-full py-2.5 border border-dashed border-gray-200 rounded-xl text-muted text-xs font-medium hover:border-brand/40 hover:text-brand/70 transition-all"
              >
                + Add another job description
              </button>
            )}
          </div>
        </div>

        {/* ── Analyze button ───────────────────────────────────────────────── */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={handleAnalyze}
            disabled={isAnalyzing || !resumeText.trim() || jobDescriptions.every(j => !j.trim())}
            className="flex items-center gap-2 px-8 py-3.5 bg-brand text-white font-semibold text-sm rounded-xl shadow-lg shadow-brand/20 hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isAnalyzing ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Analyzing…
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                Analyze Missing Skills
              </>
            )}
          </button>

          {result && (
            <button
              onClick={resetAll}
              className="px-5 py-3.5 border border-gray-200 rounded-xl text-muted text-xs font-medium hover:border-red-400/40 hover:text-red-400 transition-all"
            >
              Reset
            </button>
          )}

          {isAnalyzing && (
            <p className="text-muted text-xs font-medium animate-pulse">
              Running {Math.min(jobDescriptions.filter(j => j.trim()).length, 10)} API calls…
            </p>
          )}
        </div>

        {/* ── Results ──────────────────────────────────────────────────────── */}
        {result && (
          <div className="space-y-4">

            {/* Rate-limit / warning banner */}
            {result.rate_limit_hit && result.rate_limit_type === 'daily' && (
              <div className="flex gap-3 bg-red-500/10 border border-red-500/25 rounded-2xl px-5 py-4">
                <svg className="w-5 h-5 text-red-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-12.728 12.728M5.636 5.636l12.728 12.728" />
                </svg>
                <div>
                  <p className="text-red-600 text-xs font-semibold uppercase tracking-wide mb-1">Daily API Limit Reached</p>
                  <p className="text-red-600/80 text-xs">
                    Your Groq API key has exhausted its daily request quota (free tier: ~25–1000 RPD).
                    Results below are from the <strong>{result.jds_analyzed}</strong> JD{result.jds_analyzed !== 1 ? 's' : ''} analyzed before the limit was hit.
                    Try again tomorrow or{' '}
                    <a href="https://console.groq.com/settings/billing/plans" target="_blank" rel="noreferrer" className="underline hover:text-red-200">upgrade your Groq plan</a>.
                  </p>
                </div>
              </div>
            )}

            {result.rate_limit_hit && result.rate_limit_type === 'tpm' && (
              <div className="flex gap-3 bg-yellow-500/10 border border-yellow-500/25 rounded-2xl px-5 py-4">
                <svg className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
                <div>
                  <p className="text-yellow-700 text-xs font-semibold uppercase tracking-wide mb-1">Token Rate Limit Hit (12K TPM)</p>
                  <p className="text-yellow-700/80 text-xs">
                    llama-3.3-70b-versatile allows 12,000 tokens per minute. Your JDs + resume exceeded this.
                    Partial results shown for <strong>{result.jds_analyzed}</strong> of <strong>{result.jds_submitted}</strong> JDs.
                    Try shorter JDs or submit fewer at once.
                  </p>
                </div>
              </div>
            )}

            {!result.rate_limit_hit && result.warning && (
              <div className="flex gap-3 bg-blue-500/10 border border-blue-500/25 rounded-2xl px-5 py-4">
                <svg className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-blue-300/80 text-xs">{result.warning}</p>
              </div>
            )}

            {/* Summary bar */}
            <div className="bg-surface border border-gray-100 rounded-4xl p-6 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-0.5 bg-brand/30" />
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4 sm:gap-6 flex-wrap">
                  <div>
                    <p className="text-4xl font-bold text-brand">{result.total_missing}</p>
                    <p className="text-muted text-xs font-medium uppercase tracking-wide">Missing Skills</p>
                  </div>
                  <div className="w-px h-10 bg-gray-200" />
                  <div>
                    <p className="text-2xl font-bold text-primary">{result.jds_analyzed}</p>
                    <p className="text-muted text-xs font-medium uppercase tracking-wide">JDs Analysed</p>
                  </div>
                  {result.jds_failed > 0 && (
                    <>
                      <div className="w-px h-10 bg-gray-200" />
                      <div>
                        <p className="text-2xl font-bold text-red-500">{result.jds_failed}</p>
                        <p className="text-muted text-xs font-medium uppercase tracking-wide">JDs Failed</p>
                      </div>
                    </>
                  )}
                  <div className="w-px h-10 bg-gray-200" />
                  <div>
                    <p className="text-2xl font-bold text-primary">{(result.missing_skills || []).length}</p>
                    <p className="text-muted text-xs font-medium uppercase tracking-wide">Categories</p>
                  </div>
                </div>

                <button
                  onClick={copyAllSkills}
                  className="flex items-center gap-2 px-4 py-2.5 bg-secondary border border-gray-100 rounded-xl text-secondary text-xs font-medium hover:border-brand/40 hover:text-brand transition-all self-start sm:self-auto"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3" />
                  </svg>
                  Copy All
                </button>
              </div>
            </div>

            {result.total_missing === 0 ? (
              <div className="bg-surface border border-green-500/20 rounded-4xl p-10 text-center">
                <div className="w-14 h-14 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-7 h-7 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-green-600 mb-2">Excellent Coverage!</h3>
                <p className="text-secondary text-sm">Your resume already covers all the skills mentioned across the provided job descriptions.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {(result.missing_skills || []).map(cat => {
                  const colors = getCategoryColors(cat.category);
                  return (
                    <div key={cat.category} className={`${colors.bg} border ${colors.border} rounded-[1.5rem] p-5 relative overflow-hidden`}>
                      {/* Category header */}
                      <div className="flex items-center gap-2 mb-4">
                        <div className={`w-2 h-2 rounded-full ${colors.dot} shrink-0`} />
                        <h3 className="text-xs font-semibold uppercase tracking-wide text-primary">
                          {cat.category}
                        </h3>
                        <span className={`ml-auto text-[10px] font-black px-2 py-0.5 rounded-full ${colors.badge}`}>
                          {cat.skills.length}
                        </span>
                      </div>

                      {/* Skills list */}
                      <div className="flex flex-wrap gap-1.5">
                        {cat.skills.map(skill => (
                          <span
                            key={skill}
                            className="inline-block px-2.5 py-1 bg-white border border-gray-200 rounded-lg text-primary text-[11px] font-semibold"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
