import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import ConfirmDialog from '../components/ConfirmDialog';
import { clearRunHistory, deleteRun, getCachedRuns, getRuns } from '../services/api';

function formatScore(value) {
  if (value === null || value === undefined) return '-';
  return Number(value).toFixed(1);
}

function formatDelta(value) {
  if (value === null || value === undefined) return 'N/A';
  const num = Number(value);
  return `${num >= 0 ? '+' : ''}${num.toFixed(1)}`;
}

function statusClass(status) {
  const value = String(status || '').toLowerCase();
  if (value.includes('failed')) return 'bg-red-500/20 text-red-300 border-red-500/40';
  if (value.includes('processing')) return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40';
  if (value.includes('completed')) return 'bg-green-500/20 text-green-300 border-green-500/40';
  return 'bg-slate-700/40 text-slate-300 border-slate-600';
}

function fitClass(fitDecision) {
  if (fitDecision === 'good_fit') return 'bg-green-500/20 text-green-300';
  if (fitDecision === 'partial_fit') return 'bg-yellow-500/20 text-yellow-300';
  if (fitDecision === 'poor_fit') return 'bg-red-500/20 text-red-300';
  return 'bg-slate-700/40 text-slate-300';
}

function formatFitLabel(value) {
  if (!value) return 'Unknown';
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

export default function RunHistory() {
  const navigate = useNavigate();
  const cachedRuns = getCachedRuns(100);
  const [runs, setRuns] = useState(cachedRuns || []);
  const [loading, setLoading] = useState(!cachedRuns);
  const [error, setError] = useState('');
  const [runPendingDelete, setRunPendingDelete] = useState(null);
  const [deletingRunId, setDeletingRunId] = useState('');
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [clearingAll, setClearingAll] = useState(false);

  useEffect(() => {
    let active = true;
    async function load() {
      if (!cachedRuns) {
        setLoading(true);
      }
      try {
        const data = await getRuns(100);
        if (!active) return;
        setRuns(Array.isArray(data) ? data : []);
        setError('');
      } catch (err) {
        if (!active) return;
        setError(err.message || 'Failed to load run history.');
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [cachedRuns]);

  async function confirmDeleteRun() {
    if (!runPendingDelete) return;
    const runId = runPendingDelete.run_id;

    setDeletingRunId(runId);
    try {
      await deleteRun(runId);
      setRuns((prev) => prev.filter((item) => item.run_id !== runId));
      toast.success('History entry deleted.');
    } catch (err) {
      toast.error(err.message || 'Failed to delete history entry.');
    } finally {
      setDeletingRunId('');
      setRunPendingDelete(null);
    }
  }

  async function confirmClearAll() {
    setClearingAll(true);
    try {
      const result = await clearRunHistory();
      setRuns([]);
      const deletedCount = Number(result?.deleted || 0);
      toast.success(deletedCount > 0 ? `Deleted ${deletedCount} history entries.` : 'History is already empty.');
    } catch (err) {
      toast.error(err.message || 'Failed to clear history.');
    } finally {
      setClearingAll(false);
      setShowClearDialog(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Run History</h1>
            <p className="text-slate-400">All your past resume optimization runs.</p>
          </div>
          {!!runs.length && (
            <button
              type="button"
              onClick={() => setShowClearDialog(true)}
              className="px-4 py-2.5 rounded-lg border border-red-500/40 bg-red-500/10 hover:bg-red-500/20 text-red-200"
            >
              Clear All
            </button>
          )}
        </div>

        {error && <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/40 text-red-300">{error}</div>}

        <div className="space-y-4">
          {loading ? (
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-8 text-slate-300">Loading...</div>
          ) : runs.length === 0 ? (
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-12 text-center">
              <h3 className="text-xl font-semibold text-white mb-2">No optimization history yet</h3>
              <p className="text-slate-400 mb-6">Start optimizing your resume to see your history here.</p>
              <button
                onClick={() => navigate('/new-optimization')}
                className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg font-semibold"
              >
                Start New Optimization
              </button>
            </div>
          ) : (
            runs.map((run) => (
              <RunCard
                key={run.run_id}
                run={run}
                isDeleting={deletingRunId === run.run_id}
                onOpen={() => navigate(`/optimization/${run.run_id}`)}
                onDelete={() => setRunPendingDelete(run)}
                onBlocked={() => toast('Detailed result is unavailable for poor-fit runs.', { icon: 'ℹ️' })}
              />
            ))
          )}
        </div>
      </div>

      <ConfirmDialog
        isOpen={Boolean(runPendingDelete)}
        onCancel={() => setRunPendingDelete(null)}
        onConfirm={confirmDeleteRun}
        title="Delete History Entry"
        message="This run will be permanently removed from your history."
        confirmText={deletingRunId ? 'Deleting...' : 'Delete'}
        variant="danger"
      />

      <ConfirmDialog
        isOpen={showClearDialog}
        onCancel={() => setShowClearDialog(false)}
        onConfirm={confirmClearAll}
        title="Clear Full History"
        message="This will remove all runs from your history permanently."
        confirmText={clearingAll ? 'Clearing...' : 'Clear All'}
        variant="danger"
      />
    </div>
  );
}

function RunCard({ run, onOpen, onBlocked, onDelete, isDeleting }) {
  const isPoorFit = run.fit_decision === 'poor_fit' || run.final_status === 'rejected_poor_fit';
  const cardClassName = 'w-full text-left bg-slate-900/50 border border-slate-800 rounded-xl p-6 hover:border-slate-700 transition-all cursor-pointer';

  const handleDeleteClick = (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (!isDeleting) onDelete();
  };

  const content = (
    <>
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${statusClass(run.status)}`}>
          {String(run.status || 'unknown').toUpperCase()}
        </span>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${fitClass(run.fit_decision)}`}>
          {formatFitLabel(run.fit_decision)}
        </span>
        <span className="text-slate-500 text-sm">
          {run.created_at ? new Date(run.created_at).toLocaleString() : '-'}
        </span>
        <button
          type="button"
          onClick={handleDeleteClick}
          disabled={isDeleting}
          className="ml-auto px-3 py-1.5 text-xs rounded-md bg-red-500/10 border border-red-500/30 text-red-200 hover:bg-red-500/20 disabled:opacity-50"
        >
          {isDeleting ? 'Deleting...' : 'Delete'}
        </button>
      </div>

      <p className="text-slate-300 text-sm line-clamp-2 mb-3">
        {run.job_description || 'Resume optimization run'}
      </p>

      {run.fit_reason && (
        <p className="text-xs text-slate-400 mb-4 line-clamp-2">{run.fit_reason}</p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="rounded-lg bg-slate-800/50 p-3">
          <p className="text-xs text-slate-400">ATS Score</p>
          <p className="text-white font-semibold">
            {formatScore(run.ats_score_before)} {'->'} <span className="text-cyan-300">{formatScore(run.ats_score_after)}</span>
          </p>
        </div>
        <div className="rounded-lg bg-slate-800/50 p-3">
          <p className="text-xs text-slate-400">Improvement</p>
          <p className="font-semibold text-green-400">{formatDelta(run.improvement_delta)}</p>
        </div>
        <div className="rounded-lg bg-slate-800/50 p-3">
          <p className="text-xs text-slate-400">Iterations</p>
          <p className="text-white font-semibold">{run.iteration_count ?? 0}</p>
        </div>
      </div>
    </>
  );

  const handleOpen = () => {
    if (isPoorFit) {
      onBlocked();
      return;
    }
    onOpen();
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleOpen}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          handleOpen();
        }
      }}
      className={cardClassName}
    >
      {content}
    </div>
  );
}
