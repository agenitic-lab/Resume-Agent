import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getUserRuns, getCurrentUser } from '../services/api';
import { Skeleton } from '../components/ui/skeleton';

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalRuns: 0,
    avgImprovement: 0,
    bestScore: 0,
    lastRunDate: 'Never'
  });
  const [latestRun, setLatestRun] = useState(null);
  const [recentRuns, setRecentRuns] = useState([]);

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch user profile
        try {
          const userData = await getCurrentUser();
          setUser(userData);
        } catch (e) {
          console.error("Failed to fetch user:", e);
        }

        const runs = await getUserRuns(5); // Get last 5 runs

        if (runs.length > 0) {
          // Calculate stats

          const improvements = runs
            .map(r => r.improvement_delta || 0)
            .filter(i => i !== null);

          // Find best score (after optimization)
          const allScores = runs.map(r => r.ats_score_after || 0);
          const maxScore = allScores.length > 0 ? Math.max(...allScores) : 0;

          const avgImp = improvements.length
            ? (improvements.reduce((a, b) => a + b, 0) / improvements.length).toFixed(1)
            : 0;

          setStats({
            totalRuns: runs.length, // Only shows loaded count, ideally fetch total count
            avgImprovement: avgImp,
            bestScore: Math.round(maxScore),
            lastRunDate: runs[0].created_at ? new Date(runs[0].created_at).toLocaleDateString() : 'Unknown'
          });

          setLatestRun(runs[0]);
          setRecentRuns(runs.slice(0, 3));
        } else {
          // No runs found - clear stats
          setStats({
            totalRuns: 0,
            avgImprovement: 0,
            bestScore: 0,
            lastRunDate: 'Never'
          });
          setLatestRun(null);
          setRecentRuns([]);
        }
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="min-h-screen bg-primary text-primary p-4 md:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-primary mb-2 tracking-tight flex items-center gap-2 flex-wrap">
          Welcome back,{' '}
          {loading
            ? <Skeleton className="inline-block h-9 w-36 rounded-xl" />
            : <span className="text-brand">{user ? (user.full_name || user.email?.split('@')[0] || 'User') : 'User'}</span>
          }
        </h1>
        <p className="text-secondary text-lg font-medium">
          Ready to optimize your resume with AI-powered analysis?
        </p>
      </div>

      {/* Start New Optimization Card */}
      <div className="mb-8 bg-surface border border-gray-200 rounded-[2.5rem] p-6 md:p-10 shadow-xl shadow-black/5 relative overflow-hidden group">
        <div className="absolute top-0 left-0 w-full h-1 bg-brand/10" />
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:justify-between">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 sm:gap-8">
            <div className="w-16 h-16 bg-brand rounded-2xl flex flex-shrink-0 items-center justify-center shadow-lg shadow-brand/10">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-primary mb-1">Start New Optimization</h3>
              <p className="text-secondary font-medium max-w-xl leading-relaxed">
                Upload your resume and paste a job description to get AI-powered improvements with detailed decision tracking.
              </p>
            </div>
          </div>
          <Link
            to="/new-optimization"
            className="w-full sm:w-auto px-6 py-3 bg-brand text-white font-semibold text-sm tracking-wide rounded-2xl hover:bg-brand-hover transition-all active:scale-95 shadow-xl shadow-brand/10 flex items-center justify-center gap-3 whitespace-nowrap"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            <span>Optimize Resume</span>
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-surface border border-gray-100 rounded-[2rem] p-5 md:p-8 shadow-lg shadow-black/5 flex flex-col justify-between">
              <div className="flex items-center gap-3 md:gap-4 mb-4 md:mb-6">
                <Skeleton className="w-12 h-12 rounded-xl shrink-0" />
                <Skeleton className="h-4 w-24" />
              </div>
              <Skeleton className="h-8 md:h-10 w-20 rounded-xl" />
            </div>
          ))
        ) : (<>
          <StatCard
            icon={
              <svg className="w-6 h-6 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            }
            title="Total Optimizations"
            value={stats.totalRuns}
          />
          <StatCard
            icon={
              <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            }
            title="Avg. Improvement"
            value={stats.avgImprovement > 0 ? `+${stats.avgImprovement}` : '0'}
            highlight
          />
          <StatCard
            icon={
              <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138z" />
              </svg>
            }
            title="Best Score"
            value={stats.bestScore}
          />
          <StatCard
            icon={
              <svg className="w-6 h-6 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            title="Last Run"
            value={stats.lastRunDate}
          />
        </>)}
      </div>

      {/* Bottom Section - Latest Optimization & Recent History */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Latest Optimization */}
        <div className="bg-surface border border-gray-200 rounded-[2.5rem] p-6 md:p-10 shadow-xl shadow-black/5 relative overflow-hidden">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-brand/10 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-primary">Latest Optimization</h3>
          </div>

          {loading ? (
            <div className="space-y-6">
              <Skeleton className="h-4 w-48" />
              <div className="flex items-center justify-between px-4">
                <Skeleton className="w-28 h-28 rounded-full" />
                <div className="flex flex-col items-center gap-2">
                  <Skeleton className="h-7 w-20" />
                  <Skeleton className="h-3 w-28" />
                </div>
                <Skeleton className="w-28 h-28 rounded-full" />
              </div>
              <Skeleton className="h-12 w-full rounded-2xl mt-2" />
            </div>
          ) : latestRun ? (
            <>
              <p className="text-secondary text-sm mb-8">Your most recent resume analysis</p>

              <div className="flex items-center justify-between px-2 sm:px-4">
                {/* Before Score */}
                <div className="relative shrink-0">
                  <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-full border-2 border-gray-100 flex items-center justify-center bg-secondary shadow-inner">
                    <div className="text-center">
                      <div className="text-2xl sm:text-3xl font-bold text-primary">{Math.round(latestRun.ats_score_before || 0)}</div>
                      <div className="text-[10px] sm:text-xs text-gray-500 mt-1">Before</div>
                    </div>
                  </div>
                </div>

                {/* Arrow */}
                <div className="flex-1 flex flex-col items-center justify-center px-2">
                  <div className="flex items-center gap-1 sm:gap-2">
                    <svg className="w-4 h-4 sm:w-6 sm:h-6 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                    <span className="text-brand font-bold text-lg sm:text-xl">+{Math.round(latestRun.improvement_delta || 0)}</span>
                  </div>
                  <div className="text-[6px] sm:text-[7px] font-black uppercase tracking-wider sm:tracking-[0.3em] text-gray-500 mt-1 text-center leading-tight">Score Improvement</div>
                </div>

                {/* After Score */}
                <div className="relative shrink-0">
                  <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-full border-2 border-brand-primary/20 flex items-center justify-center bg-brand/5 shadow-lg shadow-brand-primary/5">
                    <div className="text-center">
                      <div className="text-2xl sm:text-3xl font-bold text-brand">{Math.round(latestRun.ats_score_after || 0)}</div>
                      <div className="text-[10px] sm:text-xs text-brand/60 mt-1">After</div>
                    </div>
                  </div>
                </div>
              </div>

              <Link
                to={`/optimization/${latestRun.id}`}
                className="mt-8 w-full py-4 bg-brand text-white font-semibold text-sm tracking-wide rounded-2xl hover:bg-brand-hover transition-all flex items-center justify-center gap-3 shadow-xl shadow-brand/10"
              >
                <span>View Full Report</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">No optimizations yet</p>
              <Link to="/new-optimization" className="text-brand hover:text-brand-hover font-medium">Start your first run</Link>
            </div>
          )}
        </div>

        {/* Recent History */}
        <div className="bg-surface border border-gray-200 rounded-[2.5rem] p-6 md:p-10 shadow-xl shadow-black/5 relative overflow-hidden">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-brand/10 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-primary">Recent History</h3>
            </div>
            <Link to="/history" className="text-brand hover:text-brand-hover text-xs font-medium px-4 py-2 bg-secondary rounded-full transition-colors border border-gray-100">
              View All
            </Link>
          </div>

          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between p-5 bg-secondary rounded-2xl border border-gray-100">
                  <div className="flex items-center gap-4">
                    <Skeleton className="w-2 h-2 rounded-full" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                  <Skeleton className="h-6 w-12" />
                </div>
              ))}
            </div>
          ) : recentRuns.length > 0 ? (
            <div className="space-y-4">
              {recentRuns.map(run => (
                <HistoryItem
                  key={run.id}
                  title={run.job_description ? (run.job_description.substring(0, 30) + "...") : "Optimization Run"}
                  date={run.created_at ? new Date(run.created_at).toLocaleDateString() : 'Unknown'}
                  improvement={run.improvement_delta ? `+${Math.round(run.improvement_delta)}` : '0'}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500 text-sm">Your past optimization runs will appear here</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, title, value, highlight }) {
  return (
    <div className="bg-surface border border-gray-200 rounded-[2rem] p-5 md:p-8 hover:border-brand-primary/30 transition-all shadow-lg shadow-black/5 group flex flex-col justify-between overflow-hidden">
      <div className="flex items-center gap-3 md:gap-4 mb-4 md:mb-6 min-w-0">
        <div className="p-3 bg-secondary rounded-xl group-hover:bg-brand/5 transition-colors shrink-0">
          {icon}
        </div>
        <p className="text-gray-500 text-xs font-medium truncate" title={title}>{title}</p>
      </div>
      <p className={`text-3xl md:text-4xl font-bold tracking-tight truncate ${highlight ? 'text-brand' : 'text-primary'}`} title={String(value)}>
        {value}
      </p>
    </div>
  );
}

function HistoryItem({ title, date, improvement }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-5 bg-secondary rounded-2xl hover:bg-primary transition-all border border-gray-100 group gap-2 sm:gap-4 relative overflow-hidden">
      <div className="flex items-start sm:items-center gap-3 sm:gap-4 min-w-0">
        <div className="w-2 h-2 bg-brand rounded-full animate-pulse shadow-[0_0_8px_rgba(255,75,114,0.4)] shrink-0 mt-2 sm:mt-0" />
        <div className="min-w-0">
          <p className="text-primary font-semibold text-sm truncate" title={title}>{title}</p>
          <p className="text-gray-500 text-xs mt-0.5">{date}</p>
        </div>
      </div>
      <span className="text-brand font-bold text-lg whitespace-nowrap self-start sm:self-center">+{improvement}</span>
    </div>
  );
}
