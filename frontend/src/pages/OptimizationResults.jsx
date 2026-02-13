import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { compileLatex, getRun } from '../services/api';

function formatScore(value) {
  if (value === null || value === undefined) return '-';
  return Number(value).toFixed(1);
}

function formatLabel(value) {
  if (!value) return 'Unknown';
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function toArray(value) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

function renderValue(value) {
  if (value === null || value === undefined || value === '') return 'N/A';
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

export default function OptimizationResults() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [run, setRun] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [compiledPdfUrl, setCompiledPdfUrl] = useState(null);
  const [isCompiling, setIsCompiling] = useState(false);
  const [compileError, setCompileError] = useState('');
  const [autoCompileTried, setAutoCompileTried] = useState(false);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setCompileError('');
      setAutoCompileTried(false);
      setCompiledPdfUrl((previousUrl) => {
        if (previousUrl) {
          window.URL.revokeObjectURL(previousUrl);
        }
        return null;
      });
      try {
        const data = await getRun(id);
        if (!active) return;
        setRun(data);
        setError('');
      } catch (err) {
        if (!active) return;
        setError(err.message || 'Failed to load run details.');
      } finally {
        if (active) setLoading(false);
      }
    }
    if (id) load();
    return () => {
      active = false;
    };
  }, [id]);

  const result = run?.result_json || {};
  const modifiedResume = result.modified_resume || '';

  const requirements = result.job_requirements || {};
  const analysis = result.resume_analysis || {};
  const improvementPlan = result.improvement_plan || {};
  const scoreHistory = Array.isArray(result.score_history) ? result.score_history : [];
  const decisionLog = Array.isArray(result.decision_log) ? result.decision_log : [];

  const fitDecision = run?.fit_decision || result.fit_decision || 'unknown';
  const fitReason = run?.fit_reason || result.fit_reason || '';
  const isPoorFitRun = fitDecision === 'poor_fit' || run?.final_status === 'rejected_poor_fit' || result?.final_status === 'rejected_poor_fit';
  const hasDetailedResult = Boolean(modifiedResume.trim());

  useEffect(() => {
    return () => {
      if (compiledPdfUrl) {
        window.URL.revokeObjectURL(compiledPdfUrl);
      }
    };
  }, [compiledPdfUrl]);

  const compileResume = async () => {
    if (!modifiedResume.trim()) return;

    setCompileError('');
    setIsCompiling(true);
    try {
      const blob = await compileLatex(modifiedResume);
      if (compiledPdfUrl) {
        window.URL.revokeObjectURL(compiledPdfUrl);
      }
      const nextUrl = window.URL.createObjectURL(blob);
      setCompiledPdfUrl(nextUrl);
    } catch (err) {
      setCompileError(err.message || 'Failed to compile LaTeX');
    } finally {
      setIsCompiling(false);
    }
  };

  const handleCopyLatex = async () => {
    if (!modifiedResume) return;
    await navigator.clipboard.writeText(modifiedResume);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const handleDownloadPdf = () => {
    if (!compiledPdfUrl) return;
    const a = document.createElement('a');
    a.href = compiledPdfUrl;
    a.download = 'optimized_resume.pdf';
    a.click();
  };

  const summaryItems = useMemo(
    () => [
      { title: 'Status', value: run?.status || 'unknown' },
      { title: 'Fit Decision', value: formatLabel(fitDecision) },
      { title: 'Before Score', value: formatScore(run?.ats_score_before) },
      { title: 'After Score', value: formatScore(run?.ats_score_after) },
      {
        title: 'Improvement',
        value:
          run?.improvement_delta === null || run?.improvement_delta === undefined
            ? 'N/A'
            : `${Number(run.improvement_delta) >= 0 ? '+' : ''}${Number(run.improvement_delta).toFixed(1)}`,
      },
      { title: 'Iterations', value: result.iteration_count ?? run?.iteration_count ?? 0 },
    ],
    [fitDecision, result.iteration_count, run]
  );

  useEffect(() => {
    if (!modifiedResume.trim()) return;
    if (compiledPdfUrl) return;
    if (isCompiling) return;
    if (autoCompileTried) return;

    setAutoCompileTried(true);
    compileResume();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modifiedResume, compiledPdfUrl, isCompiling, autoCompileTried]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-start justify-between mb-8 gap-3">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Optimization Results</h1>
            <p className="text-slate-400">Run ID: {id}</p>
          </div>
          <button
            onClick={() => navigate('/history')}
            className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg"
          >
            Back to History
          </button>
        </div>

        {loading && <div className="p-6 bg-slate-900/50 rounded-lg border border-slate-800 text-slate-300">Loading...</div>}
        {!loading && error && <div className="p-6 bg-red-500/10 rounded-lg border border-red-500/40 text-red-300">{error}</div>}

        {!loading && !error && run && (
          <div className="space-y-6">
            {isPoorFitRun && !hasDetailedResult && (
              <div className="bg-red-500/10 border border-red-500/40 rounded-xl p-6">
                <h2 className="text-2xl font-bold text-red-200 mb-3">No Detailed Result For Poor-Fit Run</h2>
                <p className="text-red-100 mb-4">
                  {fitReason || 'This run was stopped because the resume and job requirements were too far apart.'}
                </p>
                <button
                  onClick={() => navigate('/history')}
                  className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg"
                >
                  Back to History
                </button>
              </div>
            )}

            {(!isPoorFitRun || hasDetailedResult) && (
              <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {summaryItems.map((item) => (
                <Metric key={item.title} title={item.title} value={item.value} />
              ))}
            </div>

            {!!fitReason && (
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
                <p className="text-xs uppercase tracking-wide text-slate-400 mb-1">Fit Assessment</p>
                <p className="text-slate-200">{fitReason}</p>
              </div>
            )}

            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
              <h2 className="text-xl font-bold text-white mb-3">Score History</h2>
              <div className="flex flex-wrap gap-2">
                {scoreHistory.length ? (
                  scoreHistory.map((score, idx) => (
                    <span key={idx} className="px-3 py-1 rounded-full bg-slate-800 text-slate-200 text-sm">
                      {formatScore(score)}
                    </span>
                  ))
                ) : (
                  <span className="text-slate-400">No score history available.</span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-xl font-bold text-white">Optimized Resume (LaTeX)</h2>
                  <button
                    onClick={handleCopyLatex}
                    disabled={!modifiedResume}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white rounded-lg"
                  >
                    {copied ? 'Copied' : 'Copy LaTeX'}
                  </button>
                </div>
                <pre className="bg-slate-950 border border-slate-800 rounded-lg p-4 text-slate-300 overflow-auto max-h-[32rem] text-sm whitespace-pre-wrap">
                  {modifiedResume || 'No optimized resume output available.'}
                </pre>
              </div>

              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-xl font-bold text-white">PDF Preview</h2>
                  <div className="flex gap-2">
                    <button
                      onClick={compileResume}
                      disabled={!modifiedResume || isCompiling}
                      className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 text-white rounded-lg"
                    >
                      {isCompiling ? 'Compiling...' : compiledPdfUrl ? 'Recompile' : 'Generate Preview'}
                    </button>
                    <button
                      onClick={handleDownloadPdf}
                      disabled={!compiledPdfUrl}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg"
                    >
                      Download
                    </button>
                  </div>
                </div>

                {compileError && <p className="text-red-300 text-sm mb-3">{compileError}</p>}

                <div className="h-[32rem] bg-slate-950 border border-slate-800 rounded-lg overflow-hidden">
                  {compiledPdfUrl ? (
                    <iframe src={compiledPdfUrl} className="w-full h-full" title="PDF Preview" />
                  ) : (
                    <div className="h-full flex items-center justify-center text-slate-400 text-sm p-6 text-center">
                      {isCompiling ? (
                        <div className="text-center">
                          <div className="w-12 h-12 mx-auto mb-3 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                          <p>Generating PDF preview...</p>
                        </div>
                      ) : modifiedResume
                        ? 'PDF preview is not ready yet. Click Generate Preview.'
                        : 'No optimized LaTeX found for this run.'}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <ListPanel title="Job Requirements" items={toArray(requirements.required_skills)} fallback="No required skills extracted." />
              <ListPanel title="Strengths" items={toArray(analysis.strengths)} fallback="No strengths listed." />
              <ListPanel title="Weaknesses" items={toArray(analysis.weaknesses)} fallback="No weaknesses listed." />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <ListPanel title="Missing Keywords" items={toArray(analysis.missing_keywords)} fallback="No missing keywords identified." />
              <ListPanel title="Priority Changes" items={toArray(improvementPlan.priority_changes)} fallback="No priority changes listed." />
              <ListPanel title="Keyword Insertions" items={toArray(improvementPlan.keyword_insertions)} fallback="No keyword insertion plan available." />
            </div>

            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
              <h2 className="text-xl font-bold text-white mb-3">Decision Log</h2>
              {!decisionLog.length ? (
                <p className="text-slate-400 text-sm">No decision log available.</p>
              ) : (
                <div className="space-y-3">
                  {decisionLog.map((item, idx) => (
                    <div key={idx} className="border border-slate-800 rounded-lg p-3 bg-slate-900/40">
                      <p className="text-slate-200 text-sm font-semibold mb-1">{formatLabel(item.node || 'step')}</p>
                      <p className="text-slate-400 text-xs">{formatLabel(item.action || 'update')}</p>
                      <div className="mt-2 text-xs text-slate-300 grid grid-cols-1 md:grid-cols-2 gap-1">
                        {Object.entries(item)
                          .filter(([key]) => !['node', 'action'].includes(key))
                          .map(([key, value]) => (
                            <div key={key}>
                              <span className="text-slate-500">{formatLabel(key)}:</span> {renderValue(value)}
                            </div>
                          ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Metric({ title, value }) {
  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
      <p className="text-slate-400 text-xs uppercase tracking-wide">{title}</p>
      <p className="text-xl font-bold mt-2 text-white">{value}</p>
    </div>
  );
}

function ListPanel({ title, items, fallback }) {
  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
      <h3 className="text-white font-semibold mb-3">{title}</h3>
      {items.length ? (
        <ul className="space-y-2">
          {items.map((item, idx) => (
            <li key={`${title}-${idx}`} className="text-sm text-slate-300 flex gap-2">
              <span className="text-cyan-400">•</span>
              <span>{String(item)}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-slate-400 text-sm">{fallback}</p>
      )}
    </div>
  );
}
