import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getCachedCurrentUser, getCachedRuns, getCurrentUser, getRuns } from '../services/api';

function formatNumber(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '-';
  return Number(value).toFixed(1);
}

function formatFitLabel(value) {
  if (!value) return 'Unknown';
  return value.replace(/_/g, ' ').replace(/\b\w/g, (match) => match.toUpperCase());
}

function fitTone(value) {
  if (value === 'good_fit') return 'text-green-400';
  if (value === 'partial_fit') return 'text-yellow-300';
  if (value === 'poor_fit') return 'text-red-300';
  return 'text-slate-300';
}

export default function Dashboard() {
  const navigate = useNavigate();
  const cachedUser = getCachedCurrentUser();
  const cachedRuns = getCachedRuns(20);
  const [user, setUser] = useState(cachedUser);
  const [runs, setRuns] = useState(cachedRuns || []);
  const [loading, setLoading] = useState(!(cachedUser && cachedRuns));
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    async function load() {
      if (!cachedUser || !cachedRuns) {
        setLoading(true);
      }
      try {
        const [me, runList] = await Promise.all([getCurrentUser(), getRuns(20)]);
        if (!active) return;
        setUser(me);
        setRuns(Array.isArray(runList) ? runList : []);
        setError('');
      } catch (err) {
        if (!active) return;
        setError(err.message || 'Failed to load dashboard data.');
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [cachedRuns, cachedUser]);

  const stats = useMemo(() => {
    if (!runs.length) {
      return {
        total: 0,
        avgImprovement: null,
        bestScore: null,
        poorFitCount: 0,
      };
    }

    const completed = runs.filter((run) => run.status === 'completed');
    const withImprovement = completed.filter((run) => run.improvement_delta !== null && run.improvement_delta !== undefined);
    const avgImprovement = withImprovement.length
      ? withImprovement.reduce((sum, run) => sum + Number(run.improvement_delta), 0) / withImprovement.length
      : null;

    const bestScore = completed.reduce((max, run) => {
      const score = run.ats_score_after ?? run.ats_score_before;
      if (score === null || score === undefined) return max;
      return max === null ? Number(score) : Math.max(max, Number(score));
    }, null);

    const poorFitCount = runs.filter((run) => run.fit_decision === 'poor_fit').length;

    return {
      total: runs.length,
      avgImprovement,
      bestScore,
      poorFitCount,
    };
  }, [runs]);

  const latestRun = runs[0];

  function openRun(run) {
    const isPoorFit = run?.fit_decision === 'poor_fit' || run?.final_status === 'rejected_poor_fit';
    if (isPoorFit) {
      toast('Detailed result is unavailable for poor-fit runs.', { icon: 'ℹ️' });
      return;
    }
    navigate(`/optimization/${run.run_id}`);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-white mb-2">
          Welcome back,{' '}
          <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
            {user?.email || 'User'}
          </span>
        </h1>
        <p className="text-slate-400 text-lg">Track optimization quality, fit outcomes, and resume improvements.</p>
      </div>

      <div className="mb-8 bg-gradient-to-r from-cyan-900/30 to-blue-900/30 border border-cyan-500/20 rounded-2xl p-8">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-bold text-white mb-2">Start New Optimization</h3>
            <p className="text-slate-400">Upload your resume and target role to run the agent workflow.</p>
          </div>
          <Link
            to="/new-optimization"
            className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold rounded-lg hover:shadow-lg hover:shadow-cyan-500/50 transition-all duration-300 hover:scale-105"
          >
            Optimize Resume
          </Link>
        </div>
      </div>

      {error && <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/40 text-red-300">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <StatCard title="Total Runs" value={stats.total} />
        <StatCard
          title="Average Improvement"
          value={stats.avgImprovement === null ? 'N/A' : `${stats.avgImprovement >= 0 ? '+' : ''}${formatNumber(stats.avgImprovement)}`}
          highlight
        />
        <StatCard title="Best Score" value={stats.bestScore === null ? 'N/A' : formatNumber(stats.bestScore)} />
        <StatCard title="Poor Fit Runs" value={stats.poorFitCount} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-white mb-3">Latest Run</h3>
          {loading ? (
            <p className="text-slate-400">Loading...</p>
          ) : latestRun ? (
            <div className="space-y-3">
              <p className="text-slate-300 text-sm">
                Status: <span className="text-cyan-400">{String(latestRun.status || 'unknown')}</span>
              </p>
              <p className="text-slate-300 text-sm">
                Fit: <span className={fitTone(latestRun.fit_decision)}>{formatFitLabel(latestRun.fit_decision)}</span>
              </p>
              {latestRun.fit_reason && <p className="text-slate-400 text-xs">{latestRun.fit_reason}</p>}
              <p className="text-slate-300 text-sm">
                Score: {formatNumber(latestRun.ats_score_before)} {'->'} {formatNumber(latestRun.ats_score_after)}
              </p>
              <p className="text-slate-300 text-sm">
                Improvement:{' '}
                {latestRun.improvement_delta === null || latestRun.improvement_delta === undefined
                  ? 'N/A'
                  : `${Number(latestRun.improvement_delta) >= 0 ? '+' : ''}${formatNumber(latestRun.improvement_delta)}`}
              </p>
              <button
                type="button"
                onClick={() => openRun(latestRun)}
                className="inline-flex mt-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg"
              >
                View Details
              </button>
            </div>
          ) : (
            <p className="text-slate-400">No runs yet.</p>
          )}
        </div>

        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-white">Recent Runs</h3>
            <Link to="/history" className="text-cyan-400 hover:text-cyan-300 text-sm">
              View All
            </Link>
          </div>
          <div className="space-y-3">
            {runs.slice(0, 4).map((run) => (
              <button
                type="button"
                key={run.run_id}
                onClick={() => openRun(run)}
                className="block p-3 rounded-lg border border-slate-700 bg-slate-800/40 hover:bg-slate-800"
              >
                <p className="text-sm text-slate-300 line-clamp-1">{run.job_description || 'Resume optimization run'}</p>
                <p className="text-xs mt-1">
                  <span className="text-slate-500">{run.status}</span>{' '}
                  <span className={`ml-2 ${fitTone(run.fit_decision)}`}>{formatFitLabel(run.fit_decision)}</span>
                </p>
              </button>
            ))}
            {!runs.length && !loading && <p className="text-slate-400">No recent runs.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, highlight = false }) {
  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
      <p className="text-slate-400 text-sm mb-2">{title}</p>
      <p className={`text-3xl font-bold ${highlight ? 'text-green-400' : 'text-white'}`}>{value}</p>
    </div>
  );
}
