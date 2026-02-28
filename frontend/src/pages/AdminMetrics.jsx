import React, { useState, useEffect } from 'react';
import { getAdminMetrics, getAdminActivityUsers } from '../services/api';
import toast from 'react-hot-toast';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, Legend
} from 'recharts';
import { Skeleton } from '../components/ui/skeleton';
import { format, parseISO, subDays } from 'date-fns';

export default function AdminMetrics() {
    const [metrics, setMetrics] = useState(null);
    const [activity, setActivity] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const metricsData = await getAdminMetrics();
            setMetrics(metricsData);
        } catch (error) {
            toast.error('Failed to load metrics');
        } finally {
            setLoading(false);
        }
    };

    if (loading || !metrics) {
        return (
            <div className="space-y-8">
                <div>
                    <h2 className="text-xl font-bold mb-6 text-primary">
                        <Skeleton className="h-7 w-48" />
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col">
                                <Skeleton className="h-4 w-24 mb-2" />
                                <div className="mt-auto inline-flex items-center justify-center w-12 h-12 rounded-lg bg-gray-50 mb-2">
                                    <Skeleton className="h-6 w-8" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                        <Skeleton className="h-6 w-64 mb-6" />
                        <Skeleton className="h-[300px] w-full rounded-lg" />
                    </div>
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                        <Skeleton className="h-6 w-56 mb-6" />
                        <Skeleton className="h-[300px] w-full rounded-lg" />
                    </div>
                </div>
            </div>
        );
    }

    const statCards = [
        { title: 'Total Users', value: metrics.total_users, color: 'text-blue-600', bg: 'bg-blue-50' },
        { title: 'New Users (30d)', value: metrics.new_users_30d, color: 'text-green-600', bg: 'bg-green-50' },
        { title: 'Resumes Generated', value: metrics.total_resumes_generated, color: 'text-purple-600', bg: 'bg-purple-50' },
        { title: 'Failed Runs', value: metrics.failed_runs, color: 'text-red-600', bg: 'bg-red-50' },
    ];

    // Process activity data into a daily count for charting
    const processChartData = () => {
        const last7Days = Array.from({ length: 7 }, (_, i) => {
            const d = subDays(new Date(), Math.abs(i - 6));
            return format(d, 'MMM dd');
        });

        const dataMap = {};
        last7Days.forEach(dateStr => {
            dataMap[dateStr] = { date: dateStr, runs: 0, failed: 0 };
        });

        if (metrics.recent_activity && Array.isArray(metrics.recent_activity)) {
            metrics.recent_activity.forEach(run => {
                if (!run.created_at) return;
                const runDate = format(parseISO(run.created_at), 'MMM dd');
                if (dataMap[runDate]) {
                    if (run.status === 'failed') {
                        dataMap[runDate].failed += 1;
                    } else {
                        dataMap[runDate].runs += 1;
                    }
                }
            });
        }

        return last7Days.map(dateStr => dataMap[dateStr]);
    };

    const chartData = processChartData();

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-xl font-bold mb-6 text-primary">Dashboard Metrics</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {statCards.map((stat, index) => (
                        <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col hover:shadow-md transition-shadow">
                            <h3 className="text-sm font-medium text-gray-500 mb-2">{stat.title}</h3>
                            <div className={`mt-auto inline-flex items-center justify-center w-12 h-12 rounded-lg ${stat.bg} mb-2`}>
                                <span className={`text-2xl font-bold ${stat.color}`}>{stat.value}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <h3 className="text-lg font-semibold text-primary mb-6">Resume Generations (Last 7 Days)</h3>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorRuns" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} allowDecimals={false} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '8px', border: 'none', fontStyle: 'sans-serif', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Area type="monotone" dataKey="runs" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#colorRuns)" activeDot={{ r: 6 }} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <h3 className="text-lg font-semibold text-primary mb-6">Run Status Distribution</h3>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} allowDecimals={false} />
                                <Tooltip
                                    cursor={{ fill: '#f9fafb' }}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                                <Bar dataKey="runs" name="Successful" stackId="a" fill="#10b981" radius={[0, 0, 4, 4]} barSize={24} />
                                <Bar dataKey="failed" name="Failed" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={24} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
}
