import React, { useState, useEffect } from 'react';
import { getAdminActivityUsers, getAdminActivityUserDetails, getAdminGlobalActivity, getAdminActivityLogDetails, getAdminMetrics } from '../services/api';
import toast from 'react-hot-toast';
import { Skeleton } from '../components/ui/skeleton';
import { Button } from "../components/ui/button";
const RecursiveDataViewer = ({ data }) => {
    if (data === null || data === undefined) return <span className="text-gray-400 italic">Empty</span>;
    if (typeof data !== 'object') {
        return <span className="text-gray-700 whitespace-pre-wrap">{String(data)}</span>;
    }

    if (Array.isArray(data)) {
        if (data.length === 0) return <span className="text-gray-400 italic">Empty List</span>;
        return (
            <ul className="list-disc list-outside ml-6 space-y-2 mt-2">
                {data.map((item, index) => (
                    <li key={index} className="text-sm text-gray-700">
                        <RecursiveDataViewer data={item} />
                    </li>
                ))}
            </ul>
        );
    }

    const entries = Object.entries(data);
    if (entries.length === 0) return <span className="text-gray-400 italic">Empty</span>;

    return (
        <div className="space-y-3 mt-2">
            {entries.map(([k, v]) => (
                <div key={k} className="ml-2 border-l-2 border-primary/20 pl-3 py-1">
                    <div className="font-semibold text-gray-800 text-xs tracking-wider uppercase mb-1">{k.replace(/_/g, ' ')}</div>
                    <div>
                        <RecursiveDataViewer data={v} />
                    </div>
                </div>
            ))}
        </div>
    );
};

export default function AdminActivity() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [page, setPage] = useState(1);
    const [pageSize] = useState(15);
    const [sort, setSort] = useState("latest");
    const [totalUsers, setTotalUsers] = useState(0);

    // Detail view state
    const [selectedUser, setSelectedUser] = useState(null);
    const [userLogs, setUserLogs] = useState([]);
    const [logsLoading, setLogsLoading] = useState(false);
    const [logsPage, setLogsPage] = useState(1);
    const [totalLogs, setTotalLogs] = useState(0);

    // Global logs state
    const [globalLogs, setGlobalLogs] = useState([]);
    const [globalLoading, setGlobalLoading] = useState(true);
    const [metrics, setMetrics] = useState(null);
    const [globalPage, setGlobalPage] = useState(1);
    const [globalTotal, setGlobalTotal] = useState(0);
    const GLOBAL_PAGE_SIZE = 5;

    // Detail Modal state
    const [detailModalOpen, setDetailModalOpen] = useState(false);
    const [selectedLogDetail, setSelectedLogDetail] = useState(null);
    const [detailLoading, setDetailLoading] = useState(false);

    const handleViewLogDetails = async (log) => {
        setSelectedLogDetail({ ...log, data: null });
        setDetailModalOpen(true);
        setDetailLoading(true);
        try {
            console.log("Fetching details for:", log.type, log.id);
            const details = await getAdminActivityLogDetails(log.type, log.id);
            console.log("Received details JSON:", details);
            setSelectedLogDetail(prev => ({ ...prev, data: details }));
        } catch (error) {
            console.error("View Details API Error:", error);
            toast.error("Failed to load log details");
        } finally {
            setDetailLoading(false);
        }
    };

    const formatActionType = (type) => {
        switch (type) {
            case 'resume_optimization': return 'Resume Optimization';
            case 'resume_creation': return 'New Resume Created';
            case 'missing_skills_scan': return 'Missing Skills Scan';
            case 'api_key_updated': return 'API Key Updated';
            case 'new_user_registered': return 'New User Registered';
            case 'new_template_added': return 'New Template Added';
            default: return type;
        }
    };

    const fetchActivityUsers = async () => {
        try {
            setLoading(true);
            const data = await getAdminActivityUsers(page, pageSize, searchTerm, sort);
            if (data && data.items) {
                setUsers(data.items);
                setTotalUsers(data.total);
            }
        } catch {
            toast.error('Failed to load activity users');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            fetchActivityUsers();
        }, 300);
        return () => clearTimeout(timeoutId);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchTerm, page, pageSize, sort]);

    const fetchGlobalActivity = async () => {
        try {
            setGlobalLoading(true);
            const data = await getAdminGlobalActivity(globalPage, GLOBAL_PAGE_SIZE);
            if (data && data.items) {
                setGlobalLogs(data.items);
                setGlobalTotal(data.total);
            }
        } catch {
            toast.error('Failed to load global activity logs');
        } finally {
            setGlobalLoading(false);
        }
    };

    useEffect(() => {
        fetchGlobalActivity();
        const fetchMetrics = async () => {
            try {
                const metricsData = await getAdminMetrics();
                setMetrics(metricsData);
            } catch (err) {
                console.error("Failed to fetch admin metrics", err);
            }
        };
        fetchMetrics();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [globalPage]);

    const fetchUserDetails = async (userId, targetPage) => {
        try {
            setLogsLoading(true);
            const data = await getAdminActivityUserDetails(userId, targetPage, pageSize);
            if (data && data.items) {
                setUserLogs(data.items);
                setTotalLogs(data.total);
            }
        } catch {
            toast.error('Failed to load user logs');
        } finally {
            setLogsLoading(false);
        }
    };

    const handleUserClick = (user) => {
        setSelectedUser(user);
        setLogsPage(1);
        fetchUserDetails(user.user_id, 1);
    };

    const handleBack = () => {
        setSelectedUser(null);
        setUserLogs([]);
    };

    useEffect(() => {
        if (selectedUser) {
            fetchUserDetails(selectedUser.user_id, logsPage);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [logsPage]);

    const totalLogsPages = Math.ceil(totalLogs / pageSize) || 1;
    const totalPages = Math.ceil(totalUsers / pageSize) || 1;
    const totalGlobalPages = Math.ceil(globalTotal / GLOBAL_PAGE_SIZE) || 1;

    return (
        <div>
            {selectedUser ? (
                <div>
                    <div className="flex items-center gap-4 mb-6">
                        <Button variant="outline" onClick={handleBack}>&larr; Back to Users</Button>
                        <h2 className="text-xl font-bold text-primary">
                            Activity Logs for {selectedUser.full_name || selectedUser.email}
                        </h2>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action Type</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {logsLoading ? (
                                    [...Array(5)].map((_, i) => (
                                        <tr key={i}>
                                            <td className="px-6 py-4 whitespace-nowrap"><Skeleton className="h-5 w-40" /></td>
                                            <td className="px-6 py-4 whitespace-nowrap"><Skeleton className="h-5 w-32" /></td>
                                            <td className="px-6 py-4 whitespace-nowrap"><Skeleton className="h-6 w-20 rounded-full" /></td>
                                            <td className="px-6 py-4 whitespace-nowrap flex justify-end"><Skeleton className="h-8 w-16" /></td>
                                        </tr>
                                    ))
                                ) : (
                                    userLogs.map((log) => (
                                        <tr key={log.id}>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {new Date(log.created_at).toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {formatActionType(log.type)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                            ${log.status === 'completed' ? 'bg-green-100 text-green-800' :
                                                        log.status === 'failed' ? 'bg-red-100 text-red-800' :
                                                            'bg-yellow-100 text-yellow-800'}`}>
                                                    {log.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <Button variant="ghost" size="sm" onClick={() => handleViewLogDetails(log)}>View</Button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                                {!logsLoading && userLogs.length === 0 && (
                                    <tr>
                                        <td colSpan="4" className="px-6 py-4 text-center text-gray-500">
                                            No activity found for this user.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {!logsLoading && totalLogs > 0 && (
                        <div className="flex justify-between items-center mt-6">
                            <div className="text-sm text-gray-500">
                                Showing {(logsPage - 1) * pageSize + 1} to {Math.min(logsPage * pageSize, totalLogs)} of {totalLogs} logs
                            </div>
                            <div className="flex gap-2">
                                <Button variant="outline" disabled={logsPage === 1} onClick={() => setLogsPage(logsPage - 1)} className="px-3 py-1 h-auto">Previous</Button>
                                <span className="flex items-center px-4 text-sm font-medium border rounded-md bg-gray-50 text-gray-700 border-gray-200">Page {logsPage} of {totalLogsPages}</span>
                                <Button variant="outline" disabled={logsPage >= totalLogsPages} onClick={() => setLogsPage(logsPage + 1)} className="px-3 py-1 h-auto">Next</Button>
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <div className="space-y-12">
                    {/* Global Activity Section */}
                    <div>
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-primary">Global System Logs</h2>
                            {metrics && (
                                <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex items-center pr-4 pl-1 py-1">
                                    <div className="flex flex-col items-center justify-center w-10 h-10 rounded-lg bg-red-50 ml-1 mr-3">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-600"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                                    </div>
                                    <div>
                                        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-0.5">Failed Runs</h3>
                                        <div className="text-xl leading-none font-bold text-gray-900">{metrics.failed_runs}</div>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action Type</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {globalLoading ? (
                                        [...Array(GLOBAL_PAGE_SIZE)].map((_, i) => (
                                            <tr key={`global-skel-${i}`}>
                                                <td className="px-6 py-4 whitespace-nowrap"><Skeleton className="h-5 w-40" /></td>
                                                <td className="px-6 py-4 whitespace-nowrap"><Skeleton className="h-5 w-48" /></td>
                                                <td className="px-6 py-4 whitespace-nowrap"><Skeleton className="h-5 w-32" /></td>
                                                <td className="px-6 py-4 whitespace-nowrap"><Skeleton className="h-6 w-20 rounded-full" /></td>
                                                <td className="px-6 py-4 whitespace-nowrap flex justify-end"><Skeleton className="h-8 w-16" /></td>
                                            </tr>
                                        ))
                                    ) : (
                                        globalLogs.map((log) => (
                                            <tr key={`global-${log.id}`}>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {new Date(log.created_at).toLocaleString()}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm font-medium text-gray-900">{log.user_email || 'System'}</div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {formatActionType(log.type)}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                            ${log.status === 'completed' ? 'bg-green-100 text-green-800' :
                                                            log.status === 'failed' ? 'bg-red-100 text-red-800' :
                                                                'bg-yellow-100 text-yellow-800'}`}>
                                                        {log.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                    <Button variant="ghost" size="sm" onClick={() => handleViewLogDetails(log)}>View</Button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                    {!globalLoading && globalLogs.length === 0 && (
                                        <tr>
                                            <td colSpan="5" className="px-6 py-4 text-center text-gray-500">
                                                No global activity found.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        {!globalLoading && globalTotal > 0 && (
                            <div className="flex justify-between items-center mt-6">
                                <div className="text-sm text-gray-500">
                                    Showing {(globalPage - 1) * GLOBAL_PAGE_SIZE + 1} to {Math.min(globalPage * GLOBAL_PAGE_SIZE, globalTotal)} of {globalTotal} logs
                                </div>
                                <div className="flex gap-2">
                                    <Button variant="outline" disabled={globalPage === 1} onClick={() => setGlobalPage(globalPage - 1)} className="px-3 py-1 h-auto">Previous</Button>
                                    <span className="flex items-center px-4 text-sm font-medium border rounded-md bg-gray-50 text-gray-700 border-gray-200">Page {globalPage} of {totalGlobalPages}</span>
                                    <Button variant="outline" disabled={globalPage >= totalGlobalPages} onClick={() => setGlobalPage(globalPage + 1)} className="px-3 py-1 h-auto">Next</Button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* User Summaries Section */}
                    <div>
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-primary">User Activity Summaries</h2>
                            <div className="flex gap-4 items-center">
                                <select
                                    className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary text-sm bg-white"
                                    value={sort}
                                    onChange={(e) => {
                                        setSort(e.target.value);
                                        setPage(1);
                                    }}
                                >
                                    <option value="latest">Latest First</option>
                                    <option value="oldest">Oldest First</option>
                                </select>
                                <input
                                    type="text"
                                    placeholder="Search users..."
                                    className="border border-gray-300 rounded-lg px-4 py-2 w-72 focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                                    value={searchTerm}
                                    onChange={(e) => {
                                        setSearchTerm(e.target.value);
                                        setPage(1);
                                    }}
                                />
                            </div>
                        </div>
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Activities</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Latest Activity</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {loading ? (
                                        [...Array(6)].map((_, i) => (
                                            <tr key={i}>
                                                <td className="px-6 py-4 whitespace-nowrap"><Skeleton className="h-5 w-48" /></td>
                                                <td className="px-6 py-4 whitespace-nowrap"><Skeleton className="h-5 w-16" /></td>
                                                <td className="px-6 py-4 whitespace-nowrap"><Skeleton className="h-5 w-40" /></td>
                                                <td className="px-6 py-4 whitespace-nowrap flex justify-end"><Skeleton className="h-8 w-24" /></td>
                                            </tr>
                                        ))
                                    ) : users.map((user) => (
                                        <tr key={user.user_id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-medium">
                                                {user.email}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                                                    {user.total_runs}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {user.latest_activity ? new Date(user.latest_activity).toLocaleString() : 'N/A'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleUserClick(user)}
                                                    className="h-8"
                                                >
                                                    View Logs
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                    {!loading && users.length === 0 && (
                                        <tr>
                                            <td colSpan="4" className="px-6 py-4 text-center text-gray-500">
                                                No user activity found.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <div className="flex justify-between items-center mt-6">
                            <div className="text-sm text-gray-500">
                                Showing {users.length > 0 ? (page - 1) * pageSize + 1 : 0} to {Math.min(page * pageSize, totalUsers)} of {totalUsers} users
                            </div>
                            <div className="flex gap-2">
                                <Button variant="outline" disabled={page === 1} onClick={() => setPage(page - 1)} className="px-3 py-1 h-auto">Previous</Button>
                                <span className="flex items-center px-4 text-sm font-medium border rounded-md bg-gray-50 text-gray-700 border-gray-200">Page {page} of {totalPages}</span>
                                <Button variant="outline" disabled={page >= totalPages} onClick={() => setPage(page + 1)} className="px-3 py-1 h-auto">Next</Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* Details Modal */}
            {detailModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl shadow-lg w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
                        <div className="flex justify-between items-center p-6 border-b border-gray-100">
                            <h3 className="text-xl font-bold text-gray-900">
                                Log Details <span className="text-sm font-normal text-gray-500 ml-2">({selectedLogDetail?.type && formatActionType(selectedLogDetail.type)})</span>
                            </h3>
                            <button onClick={() => setDetailModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto bg-gray-50/50 flex-1">
                            {detailLoading ? (
                                <div className="space-y-4">
                                    <Skeleton className="h-4 w-full" />
                                    <Skeleton className="h-4 w-3/4" />
                                    <Skeleton className="h-32 w-full" />
                                </div>
                            ) : selectedLogDetail?.data ? (
                                selectedLogDetail.type === 'resume_optimization' ? (
                                    <div className="space-y-6">
                                        {/* Failure Banner */}
                                        {selectedLogDetail.status === 'failed' && (
                                            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg shadow-sm mb-6 flex items-start gap-3">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500 mt-0.5 flex-shrink-0"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                                                <div>
                                                    <h4 className="text-red-800 font-bold mb-1">Optimization Failed Status</h4>
                                                    <p className="text-red-700 text-sm">
                                                        This resume optimization attempt crashed or could not be completed. The ATS scores, resulting resume, and cover letter may be empty or incomplete below.
                                                    </p>
                                                </div>
                                            </div>
                                        )}

                                        {/* ATS Score Row */}
                                        {(selectedLogDetail.data.result_data?.ats_score_before !== undefined || selectedLogDetail.data.result_data?.ats_score_after !== undefined) && (
                                            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-6">
                                                <h4 className="font-semibold text-gray-900 mb-4 border-b pb-2">ATS Score Comparison</h4>
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                                    <div className="bg-gray-50 border border-gray-100 rounded-lg p-6 text-center">
                                                        <div className="text-sm text-gray-500 uppercase tracking-wider mb-2 font-medium">Score Before</div>
                                                        <div className="text-3xl font-bold text-gray-900">{selectedLogDetail.data.result_data?.ats_score_before || 0}</div>
                                                    </div>
                                                    <div className="bg-gray-50 border border-gray-100 rounded-lg p-6 text-center shadow-sm relative overflow-hidden">
                                                        <div className="absolute top-0 left-0 w-full h-1 bg-primary"></div>
                                                        <div className="text-sm text-gray-500 uppercase tracking-wider mb-2 font-medium">Score After</div>
                                                        <div className="text-3xl font-bold text-primary">{selectedLogDetail.data.result_data?.ats_score_after || 0}</div>
                                                    </div>
                                                    <div className="bg-green-50/50 border border-green-100 rounded-lg p-6 text-center">
                                                        <div className="text-sm text-green-600 uppercase tracking-wider mb-2 font-medium">Improvement</div>
                                                        <div className="text-3xl font-bold text-green-600">+{selectedLogDetail.data.result_data?.improvement_delta || 0}</div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Details Grid */}
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex flex-col h-[400px]">
                                                <h4 className="font-semibold text-gray-900 mb-3 border-b pb-2 sticky top-0 bg-white">Job Description</h4>
                                                <div className="overflow-y-auto flex-1 pr-2 custom-scrollbar">
                                                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
                                                        {selectedLogDetail.data.job_description || <span className="italic text-gray-400">Empty</span>}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex flex-col h-[400px]">
                                                <h4 className="font-semibold text-gray-900 mb-3 border-b pb-2 sticky top-0 bg-white">Original Resume</h4>
                                                <div className="overflow-y-auto flex-1 pr-2 custom-scrollbar">
                                                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700 font-mono text-xs">
                                                        {selectedLogDetail.data.original_resume_text || <span className="italic text-gray-400">Empty</span>}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex flex-col h-[400px]">
                                                <h4 className="font-semibold text-gray-900 mb-3 border-b pb-2 sticky top-0 bg-white flex items-center justify-between">
                                                    <span>Optimized Resume LaTeX</span>
                                                    <span className="text-xs font-normal text-primary bg-primary/10 px-2 py-1 rounded-full">Output</span>
                                                </h4>
                                                <div className="overflow-y-auto flex-1 pr-2 custom-scrollbar bg-gray-50 p-3 rounded border border-gray-100">
                                                    <p className="whitespace-pre-wrap leading-relaxed text-gray-800 font-mono text-xs">
                                                        {selectedLogDetail.data.result_data?.modified_resume || <span className="italic text-gray-400">Empty</span>}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex flex-col h-[400px]">
                                                <h4 className="font-semibold text-gray-900 mb-3 border-b pb-2 sticky top-0 bg-white flex items-center justify-between">
                                                    <span>Cover Letter</span>
                                                    <span className="text-xs font-normal text-purple-600 bg-purple-100 px-2 py-1 rounded-full">New</span>
                                                </h4>
                                                <div className="overflow-y-auto flex-1 pr-2 custom-scrollbar">
                                                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
                                                        {selectedLogDetail.data.cover_letter || <span className="italic text-gray-400">Not generated</span>}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 gap-6 text-sm text-gray-700">
                                        {Object.entries(selectedLogDetail.data).map(([key, value]) => (
                                            <div key={key} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                                                <h4 className="font-semibold text-gray-900 mb-3 border-b flex items-center gap-2 pb-2">
                                                    <span className="capitalize">{key.replace(/_/g, ' ')}</span>
                                                </h4>
                                                {typeof value === 'object' && value !== null ? (
                                                    <div className="mt-3">
                                                        <div className="bg-gray-50/50 border border-gray-100 rounded-lg p-4 overflow-x-auto">
                                                            <RecursiveDataViewer data={value} />
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="bg-gray-50 p-4 rounded-lg mt-2 border border-blue-50/50">
                                                        <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
                                                            {value !== null && value !== '' ? String(value) : (
                                                                <span className="italic text-gray-400">Empty</span>
                                                            )}
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )
                            ) : (
                                <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mb-4 text-gray-300"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                                    <p>No detailed information available for this log.</p>
                                </div>
                            )}
                        </div>
                        <div className="p-4 border-t border-gray-100 flex justify-end bg-white">
                            <Button onClick={() => setDetailModalOpen(false)}>Close</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
