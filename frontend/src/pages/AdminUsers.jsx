import React, { useState, useEffect } from 'react';
import { getAdminUsers, updateAdminUserRole, deleteAdminUser, updateAdminUserBlock, getAdminMetrics } from '../services/api';
import toast from 'react-hot-toast';
import { Button } from "../components/ui/button";
import { Skeleton } from '../components/ui/skeleton';

export default function AdminUsers() {
    const [users, setUsers] = useState([]);
    const [metrics, setMetrics] = useState(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [page, setPage] = useState(1);
    const [pageSize] = useState(15);
    const [sort, setSort] = useState("latest");
    const [totalUsers, setTotalUsers] = useState(0);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const [data, metricsData] = await Promise.all([
                getAdminUsers(page, pageSize, searchTerm, sort),
                getAdminMetrics()
            ]);

            setMetrics(metricsData);
            if (data && data.items) {
                setUsers(data.items);
                setTotalUsers(data.total);
            } else {
                setUsers(data); // Fallback old response
                setTotalUsers(data.length);
            }
        } catch {
            toast.error('Failed to load users');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            fetchUsers();
        }, 300);
        return () => clearTimeout(timeoutId);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchTerm, page, pageSize, sort]);

    const handleRoleChange = async (userId, newRole) => {
        try {
            await updateAdminUserRole(userId, newRole);
            toast.success(`User role updated to ${newRole}`);
            fetchUsers();
        } catch {
            toast.error('Failed to update role');
        }
    };

    const handleDelete = async (userId) => {
        if (!window.confirm('Are you sure you want to delete this user?')) return;
        try {
            await deleteAdminUser(userId);
            toast.success('User deleted successfully');
            fetchUsers();
        } catch {
            toast.error('Failed to delete user');
        }
    };

    const handleBlockToggle = async (userId, currentStatus) => {
        const action = currentStatus ? 'unblock' : 'block';
        if (!window.confirm(`Are you sure you want to ${action} this user?`)) return;

        try {
            await updateAdminUserBlock(userId, !currentStatus);
            toast.success(`User ${action}ed successfully`);
            fetchUsers();
        } catch {
            toast.error(`Failed to ${action} user`);
        }
    };



    const totalPages = Math.ceil(totalUsers / pageSize) || 1;

    return (
        <div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <h2 className="text-xl font-bold text-primary">User Management</h2>
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 items-stretch sm:items-center w-full sm:w-auto">
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
                        className="border border-gray-300 rounded-lg px-4 py-2 w-full sm:w-72 focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                        value={searchTerm}
                        onChange={(e) => {
                            setSearchTerm(e.target.value);
                            setPage(1); // Reset to page 1 on new search
                        }}
                    />
                </div>
            </div>

            {/* Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-center justify-between">
                    <div>
                        <h3 className="text-sm font-medium text-gray-500 mb-1">Total System Users</h3>
                        <div className="text-2xl font-bold text-gray-900">
                            {metrics ? metrics.total_users : <Skeleton className="h-8 w-16" />}
                        </div>
                    </div>
                    <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M22 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-center justify-between">
                    <div>
                        <h3 className="text-sm font-medium text-gray-500 mb-1">Total Blocked Users</h3>
                        <div className="text-2xl font-bold text-gray-900">
                            {metrics ? metrics.total_blocked_users : <Skeleton className="h-8 w-16" />}
                        </div>
                    </div>
                    <div className="w-12 h-12 rounded-lg bg-red-50 flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-600"><circle cx="12" cy="12" r="10"></circle><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line></svg>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {loading ? (
                            [...Array(pageSize)].map((_, i) => (
                                <tr key={`skel-${i}`}>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <Skeleton className="h-5 w-48" />
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <Skeleton className="h-9 w-24 rounded-md" />
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm flex gap-2">
                                        <Skeleton className="h-8 w-16" />
                                        <Skeleton className="h-8 w-16" />
                                    </td>
                                </tr>
                            ))
                        ) : users.map(user => {
                            const isAdmin = user.role === 'admin';
                            const isLastAdmin = isAdmin && (metrics?.total_admins ?? 2) <= 1;
                            return (
                                <tr key={user.id}>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="text-sm font-medium text-gray-900">{user.email}</span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {isLastAdmin ? (
                                            <span className="text-sm px-2 py-1 rounded-md bg-purple-50 text-purple-700 font-medium border border-purple-100">Admin</span>
                                        ) : (
                                            <select
                                                className="text-sm border-gray-200 rounded-md p-2 bg-gray-50"
                                                value={user.role || 'user'}
                                                onChange={(e) => handleRoleChange(user.id, e.target.value)}
                                            >
                                                <option value="user">User</option>
                                                <option value="admin">Admin</option>
                                            </select>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm flex gap-2">
                                        {!isLastAdmin && (
                                            <>
                                                <Button
                                                    onClick={() => handleBlockToggle(user.id, user.is_blocked)}
                                                    variant="outline"
                                                    className={`${user.is_blocked
                                                        ? 'bg-orange-50 border-orange-100 text-orange-600 hover:bg-orange-100'
                                                        : 'bg-yellow-50 border-yellow-100 text-yellow-600 hover:bg-yellow-100'
                                                        } px-3 py-1 h-auto`}
                                                >
                                                    {user.is_blocked ? 'Unblock' : 'Block'}
                                                </Button>
                                                <Button
                                                    onClick={() => handleDelete(user.id)}
                                                    variant="outline"
                                                    className="bg-red-50 border-red-100 text-red-600 hover:bg-red-100 px-3 py-1 h-auto"
                                                >
                                                    Delete
                                                </Button>
                                            </>
                                        )}
                                        {isLastAdmin && (
                                            <span className="text-xs text-gray-400 italic self-center">Protected</span>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                        {!loading && users.length === 0 && (
                            <tr>
                                <td colSpan="3" className="px-6 py-4 text-center text-gray-500">
                                    No users found.
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
                    <Button
                        variant="outline"
                        disabled={page === 1}
                        onClick={() => setPage(page - 1)}
                        className="px-3 py-1 h-auto"
                    >
                        Previous
                    </Button>
                    <span className="flex items-center px-4 text-sm font-medium border rounded-md bg-gray-50 text-gray-700 border-gray-200">
                        Page {page} of {totalPages}
                    </span>
                    <Button
                        variant="outline"
                        disabled={page >= totalPages}
                        onClick={() => setPage(page + 1)}
                        className="px-3 py-1 h-auto"
                    >
                        Next
                    </Button>
                </div>
            </div>
        </div>
    );
}
