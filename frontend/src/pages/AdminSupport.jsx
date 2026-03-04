import React, { useState, useEffect, useCallback } from 'react';
import { getAdminSupportTickets, updateAdminSupportTicketStatus } from '../services/api';
import toast from 'react-hot-toast';

export default function AdminSupport() {
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all'); // all, unread, read

    const fetchTickets = useCallback(async () => {
        setLoading(true);
        try {
            const data = await getAdminSupportTickets(filter);
            setTickets(data);
        } catch {
            toast.error('Failed to load support tickets');
        } finally {
            setLoading(false);
        }
    }, [filter]);

    useEffect(() => {
        fetchTickets();
    }, [fetchTickets]);

    const updateStatus = async (id, newStatus) => {
        try {
            await updateAdminSupportTicketStatus(id, newStatus);
            toast.success(`Ticket marked as ${newStatus}`);
            fetchTickets();
        } catch {
            toast.error('Failed to update status');
        }
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'unread':
                return <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">Unread</span>;
            case 'read':
                return <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">Read</span>;
            default:
                return <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">{status}</span>;
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-lg font-medium text-gray-900">Support Tickets</h2>
                    <p className="text-sm text-gray-500">Manage user inquiries and help requests.</p>
                </div>
                <div className="flex gap-2">
                    <select
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm rounded-md"
                    >
                        <option value="all">All Tickets</option>
                        <option value="unread">Unread</option>
                        <option value="read">Read</option>
                    </select>
                    <button onClick={fetchTickets} className="p-2 border border-gray-300 rounded-md bg-white hover:bg-gray-50 text-gray-500">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                    </button>
                </div>
            </div>

            <div className="bg-white shadow overflow-hidden sm:rounded-md border border-gray-200">
                {loading ? (
                    <div className="p-12 text-center text-gray-500">Loading tickets...</div>
                ) : tickets.length === 0 ? (
                    <div className="p-12 text-center text-gray-500">
                        No tickets found for the selected filter.
                    </div>
                ) : (
                    <ul className="divide-y divide-gray-200">
                        {tickets.map((ticket) => (
                            <li key={ticket.id} className="p-6">
                                <div className="flex justify-between items-start gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <h3 className="text-base font-medium text-gray-900">{ticket.subject}</h3>
                                            {getStatusBadge(ticket.status)}
                                        </div>
                                        <div className="text-sm text-gray-500 mb-4">
                                            From: <span className="font-medium text-gray-700">{ticket.name}</span> ({ticket.email}) • {new Date(ticket.created_at).toLocaleString()}
                                        </div>
                                        <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-700 whitespace-pre-wrap border border-gray-100">
                                            {ticket.message}
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex flex-col gap-2 min-w-30">
                                        {ticket.status !== 'read' && (
                                            <button onClick={() => updateStatus(ticket.id, 'read')} className="text-xs px-3 py-1.5 border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 rounded-md font-medium text-center">Mark Read</button>
                                        )}
                                        {ticket.status !== 'unread' && (
                                            <button onClick={() => updateStatus(ticket.id, 'unread')} className="text-xs px-3 py-1.5 border border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md font-medium text-center">Mark Unread</button>
                                        )}
                                        <a href={`mailto:${ticket.email}?subject=Re: ${ticket.subject}`} className="text-xs px-3 py-1.5 border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 rounded-md font-medium text-center mt-2">
                                            Reply via Email
                                        </a>
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}
