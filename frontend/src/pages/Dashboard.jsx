import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getUserRuns, getCurrentUser } from '../services/api';

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
            lastRunDate: new Date(runs[0].created_at).toLocaleDateString()
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
      }
    };

    fetchData();
  }, []);

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-black text-text-primary mb-2 italic tracking-tighter uppercase">
          Welcome back, <span className="text-brand-primary drop-shadow-[0_0_15px_rgba(141,163,74,0.1)]">
            {user ? (user.full_name || user.email.split('@')[0]) : 'User'}
          </span>
        </h1>
        <p className="text-text-secondary text-lg font-medium">
          Ready to optimize your resume with AI-powered analysis?
        </p>
      </div>

      {/* Start New Optimization Card */}
      <div className="mb-8 bg-bg-surface border border-border-muted rounded-[2.5rem] p-10 shadow-xl shadow-black/5 relative overflow-hidden group">
        <div className="absolute top-0 left-0 w-full h-1 bg-brand-primary/10" />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="w-16 h-16 bg-brand-primary rounded-2xl flex items-center justify-center shadow-lg shadow-brand-primary/20">
              <svg className="w-8 h-8 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h3 className="text-2xl font-black text-text-primary mb-2 italic tracking-tighter uppercase">Start New Optimization</h3>
              <p className="text-text-secondary font-medium max-w-xl leading-relaxed">
                Upload your resume and paste a job description to get AI-powered improvements with detailed decision tracking.
              </p>
            </div>
          </div>
          <Link
            to="/new-optimization"
            className="px-8 py-4 bg-brand-primary text-black font-black text-[10px] uppercase tracking-[0.2em] rounded-2xl hover:bg-brand-hover transition-all active:scale-95 shadow-xl shadow-brand-primary/10 flex items-center gap-3 whitespace-nowrap"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            <span>Optimize Resume</span>
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <StatCard
          icon={
            <svg className="w-6 h-6 text-[#606c38]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
      </div>

      {/* Bottom Section - Latest Optimization & Recent History */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Latest Optimization */}
        <div className="bg-bg-surface border border-border-muted rounded-[2.5rem] p-10 shadow-xl shadow-black/5 relative overflow-hidden">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-brand-primary/10 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-brand-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-xl font-black text-text-primary tracking-tighter uppercase italic">Latest Optimization</h3>
          </div>

          {latestRun ? (
            <>
              <p className="text-neutral-400 text-xs font-black uppercase tracking-widest mb-8">Your most recent resume analysis</p>

              <div className="flex items-center justify-between px-4">
                {/* Before Score */}
                <div className="relative">
                  <div className="w-28 h-28 rounded-full border-2 border-border-subtle flex items-center justify-center bg-bg-secondary shadow-inner">
                    <div className="text-center">
                      <div className="text-3xl font-black text-text-primary italic tracking-tighter">{Math.round(latestRun.ats_score_before || 0)}</div>
                      <div className="text-[8px] font-black uppercase tracking-widest text-text-muted">Before</div>
                    </div>
                  </div>
                </div>

                {/* Arrow */}
                <div className="flex-1 flex flex-col items-center justify-center">
                  <div className="flex items-center gap-2">
                    <svg className="w-6 h-6 text-brand-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                    <span className="text-brand-primary font-black text-2xl italic tracking-tighter">+{Math.round(latestRun.improvement_delta || 0)}</span>
                  </div>
                  <div className="text-[7px] font-black uppercase tracking-[0.3em] text-text-muted mt-1">Optimization Yield</div>
                </div>

                {/* After Score */}
                <div className="relative">
                  <div className="w-28 h-28 rounded-full border-2 border-brand-primary/20 flex items-center justify-center bg-brand-primary/5 shadow-lg shadow-brand-primary/5">
                    <div className="text-center">
                      <div className="text-3xl font-black text-brand-primary italic tracking-tighter">{Math.round(latestRun.ats_score_after || 0)}</div>
                      <div className="text-[8px] font-black uppercase tracking-widest text-brand-primary/60">After</div>
                    </div>
                  </div>
                </div>
              </div>

              <Link
                to={`/optimization/${latestRun.id}`}
                className="mt-8 w-full py-4 bg-text-primary text-bg-primary font-black text-[10px] uppercase tracking-[0.2em] rounded-2xl hover:bg-white hover:text-black transition-all flex items-center justify-center gap-3 shadow-xl shadow-black/10"
              >
                <span>View Full Intelligence Report</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </>
          ) : (
            <div className="text-center py-8">
              <p className="text-slate-400 mb-4">No optimizations yet</p>
              <Link to="/new-optimization" className="text-cyan-400 hover:text-cyan-300 font-medium">Start your first run</Link>
            </div>
          )}
        </div>

        {/* Recent History */}
        <div className="bg-bg-surface border border-border-muted rounded-[2.5rem] p-10 shadow-xl shadow-black/5 relative overflow-hidden">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-brand-primary/10 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-brand-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-black text-text-primary tracking-tighter uppercase italic">Recent History</h3>
            </div>
            <Link to="/history" className="text-brand-primary hover:text-brand-hover text-[10px] font-black uppercase tracking-widest px-4 py-2 bg-bg-secondary rounded-full transition-colors border border-border-subtle">
              View All
            </Link>
          </div>

          {recentRuns.length > 0 ? (
            <div className="space-y-4">
              {recentRuns.map(run => (
                <HistoryItem
                  key={run.id}
                  title={run.job_description ? (run.job_description.substring(0, 30) + "...") : "Optimization Run"}
                  date={new Date(run.created_at).toLocaleDateString()}
                  improvement={run.improvement_delta ? `+${Math.round(run.improvement_delta)}` : '0'}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-slate-500 text-sm">Your past optimization runs will appear here</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, title, value, highlight }) {
  return (
    <div className="bg-bg-surface border border-border-muted rounded-[2rem] p-8 hover:border-brand-primary/30 transition-all shadow-lg shadow-black/5 group">
      <div className="flex items-center gap-4 mb-4">
        <div className="p-3 bg-bg-secondary rounded-xl group-hover:bg-brand-primary/5 transition-colors">
          {icon}
        </div>
        <p className="text-text-muted text-[10px] font-black uppercase tracking-widest">{title}</p>
      </div>
      <p className={`text-4xl font-black italic tracking-tighter ${highlight ? 'text-brand-primary' : 'text-text-primary'}`}>
        {value}
      </p>
    </div>
  );
}

function HistoryItem({ title, date, improvement }) {
  return (
    <div className="flex items-center justify-between p-5 bg-bg-secondary rounded-2xl hover:bg-bg-primary transition-all border border-border-subtle group">
      <div className="flex items-center gap-4">
        <div className="w-2 h-2 bg-brand-primary rounded-full animate-pulse shadow-[0_0_8px_rgba(141,163,74,0.4)]" />
        <div>
          <p className="text-text-primary font-black text-sm uppercase tracking-tight italic">{title}</p>
          <p className="text-text-muted text-[10px] font-medium uppercase tracking-widest mt-0.5">{date}</p>
        </div>
      </div>
      <span className="text-brand-primary font-black text-lg italic tracking-tighter">{improvement}</span>
    </div>
  );
}
