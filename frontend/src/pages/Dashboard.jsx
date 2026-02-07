import React from 'react';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-white mb-2">
          Welcome back, <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">resumeagent2026</span>
        </h1>
        <p className="text-slate-400 text-lg">
          Ready to optimize your resume with AI-powered analysis?
        </p>
      </div>

      {/* Start New Optimization Card */}
      <div className="mb-8 bg-gradient-to-r from-cyan-900/30 to-blue-900/30 border border-cyan-500/20 rounded-2xl p-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-cyan-500/50">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h3 className="text-2xl font-bold text-white mb-2">Start New Optimization</h3>
              <p className="text-slate-400">
                Upload your resume and paste a job description to get AI-powered improvements with detailed decision tracking.
              </p>
            </div>
          </div>
          <Link
            to="/new-optimization"
            className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold rounded-lg hover:shadow-lg hover:shadow-cyan-500/50 transition-all duration-300 hover:scale-105 flex items-center gap-2 whitespace-nowrap"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>Optimize Resume</span>
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <StatCard
          icon={
            <svg className="w-6 h-6 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          }
          title="Total Optimizations"
          value="1"
        />
        <StatCard
          icon={
            <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          }
          title="Avg. Improvement"
          value="+22.0"
          highlight
        />
        <StatCard
          icon={
            <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
            </svg>
          }
          title="Best Score"
          value="84"
        />
        <StatCard
          icon={
            <svg className="w-6 h-6 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          title="Last Run"
          value="Today"
        />
      </div>

      {/* Bottom Section - Latest Optimization & Recent History */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Latest Optimization */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-6">
            <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <h3 className="text-xl font-bold text-white">Latest Optimization</h3>
          </div>
          <p className="text-slate-500 text-sm mb-6">Your most recent resume analysis</p>

          <div className="flex items-center justify-between">
            {/* Before Score */}
            <div className="relative">
              <div className="w-24 h-24 rounded-full border-4 border-slate-700 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">62</div>
                  <div className="text-xs text-slate-500">Before</div>
                </div>
              </div>
            </div>

            {/* Arrow */}
            <div className="flex-1 flex items-center justify-center">
              <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
              <span className="text-green-400 font-bold text-xl ml-2">+22</span>
            </div>

            {/* After Score */}
            <div className="relative">
              <div className="w-24 h-24 rounded-full border-4 border-green-500 flex items-center justify-center bg-green-500/10">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-400">84</div>
                  <div className="text-xs text-slate-500">After</div>
                </div>
              </div>
            </div>
          </div>

          <Link
            to="/optimization/details"
            className="mt-6 w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-lg transition-all flex items-center justify-center gap-2"
          >
            <span>View Details</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        {/* Recent History */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="text-xl font-bold text-white">Recent History</h3>
            </div>
            <Link to="/history" className="text-cyan-400 hover:text-cyan-300 text-sm font-medium">
              View All
            </Link>
          </div>
          <p className="text-slate-500 text-sm mb-6">Your past optimization runs</p>

          <div className="space-y-4">
            <HistoryItem
              title="Junior Position"
              date="1/15/2024"
              improvement="+22"
            />
            <HistoryItem
              title="Senior Developer"
              date="1/10/2024"
              improvement="+18"
            />
            <HistoryItem
              title="Full Stack Role"
              date="1/5/2024"
              improvement="+15"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, title, value, highlight }) {
  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 hover:border-slate-700 transition-all">
      <div className="flex items-center gap-3 mb-3">
        {icon}
        <p className="text-slate-400 text-sm font-medium">{title}</p>
      </div>
      <p className={`text-3xl font-bold ${highlight ? 'text-green-400' : 'text-white'}`}>
        {value}
      </p>
    </div>
  );
}

function HistoryItem({ title, date, improvement }) {
  return (
    <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg hover:bg-slate-800 transition-all border border-slate-700/50">
      <div className="flex items-center gap-3">
        <div className="w-2 h-2 bg-green-500 rounded-full" />
        <div>
          <p className="text-white font-medium">{title}</p>
          <p className="text-slate-500 text-sm">{date}</p>
        </div>
      </div>
      <span className="text-green-400 font-semibold">{improvement}</span>
    </div>
  );
}

