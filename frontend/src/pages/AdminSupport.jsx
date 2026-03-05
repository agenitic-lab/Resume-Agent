import React, { useState, useEffect } from 'react';
import { getAdminSupportTickets, markAdminSupportTicketRead, deleteAdminSupportTicket, replyAdminSupportTicket } from '../services/api';
import toast from 'react-hot-toast';

export default function AdminSupport() {
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all'); // all, read, unread
    const [replyModal, setReplyModal] = useState(null); // null or ticket object
    const [replyText, setReplyText] = useState('');
    const [sendingReply, setSendingReply] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [statusMessage, setStatusMessage] = useState(null); // {type: 'success'|'error', message: string}
    const [deleteConfirm, setDeleteConfirm] = useState(null); // {id: string, subject: string} or null
    const [deleting, setDeleting] = useState(false);
    const itemsPerPage = 10;

    const fetchTickets = async () => {
        setLoading(true);
        try {
            const data = await getAdminSupportTickets('all');
            setTickets(data);
            setCurrentPage(1);
            // Notify Sidebar to refresh unread count
            window.dispatchEvent(new Event('supportTicketsUpdated'));
        } catch {
            setStatusMessage({ type: 'error', message: 'Failed to load support tickets' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTickets();
    }, []);

    // Auto-dismiss status message
    useEffect(() => {
        if (statusMessage) {
            const timer = setTimeout(() => setStatusMessage(null), 4000);
            return () => clearTimeout(timer);
        }
    }, [statusMessage]);

    const handleMarkRead = async (id, currentReadStatus) => {
        try {
            await markAdminSupportTicketRead(id, !currentReadStatus);
            setStatusMessage({ 
                type: 'success', 
                message: `Ticket marked as ${!currentReadStatus ? 'read' : 'unread'}` 
            });
            // Immediately notify Sidebar of change
            window.dispatchEvent(new Event('supportTicketsUpdated'));
            fetchTickets();
        } catch {
            setStatusMessage({ type: 'error', message: 'Failed to update ticket' });
        }
    };

    const handleDeleteClick = (ticketId, ticketSubject) => {
        setDeleteConfirm({ id: ticketId, subject: ticketSubject });
    };

    const handleConfirmDelete = async () => {
        if (!deleteConfirm) return;
        
        setDeleting(true);
        try {
            await deleteAdminSupportTicket(deleteConfirm.id);
            setStatusMessage({ type: 'success', message: 'Ticket deleted successfully' });
            setDeleteConfirm(null);
            // Immediately notify Sidebar of change
            window.dispatchEvent(new Event('supportTicketsUpdated'));
            fetchTickets();
        } catch {
            setStatusMessage({ type: 'error', message: 'Failed to delete ticket' });
        } finally {
            setDeleting(false);
        }
    };

    const handleReplyClick = (ticket) => {
        setReplyModal(ticket);
        setReplyText('');
    };

    const handleSendReply = async () => {
        if (!replyText.trim()) {
            setStatusMessage({ type: 'error', message: 'Reply message cannot be empty' });
            return;
        }

        setSendingReply(true);
        try {
            await replyAdminSupportTicket(replyModal.id, replyText);
            setStatusMessage({ type: 'success', message: 'Reply sent successfully' });
            setReplyModal(null);
            setReplyText('');
            // Immediately notify Sidebar of change
            window.dispatchEvent(new Event('supportTicketsUpdated'));
            fetchTickets();
        } catch (error) {
            setStatusMessage({ type: 'error', message: error.message || 'Failed to send reply' });
        } finally {
            setSendingReply(false);
        }
    };

    const getFilteredTickets = () => {
        if (filter === 'read') {
            return tickets.filter(t => t.is_read);
        } else if (filter === 'unread') {
            return tickets.filter(t => !t.is_read);
        }
        return tickets;
    };

    const filteredTickets = getFilteredTickets();
    const totalPages = Math.ceil(filteredTickets.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedTickets = filteredTickets.slice(startIndex, startIndex + itemsPerPage);

    return (
        <div className="space-y-6">
            {/* Toast-like Status Banner */}
            {statusMessage && (
                <div className={`p-4 rounded-lg border flex items-center gap-3 animate-in fade-in duration-300 ${
                    statusMessage.type === 'success' 
                        ? 'bg-green-50 border-green-200 text-green-800' 
                        : 'bg-red-50 border-red-200 text-red-800'
                }`}>
                    {statusMessage.type === 'success' ? (
                        <svg className="w-5 h-5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                    ) : (
                        <svg className="w-5 h-5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                    )}
                    <span className="text-sm font-medium">{statusMessage.message}</span>
                    <button
                        onClick={() => setStatusMessage(null)}
                        className="ml-auto text-gray-500 hover:text-gray-700"
                    >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                    </button>
                </div>
            )}

            {/* Header and Controls */}
            <div className="flex flex-col gap-4">
                <div>
                    <h2 className="text-lg sm:text-xl font-medium text-gray-900">Support Tickets</h2>
                    <p className="text-xs sm:text-sm text-gray-500">Manage user inquiries and help requests.</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 w-full">
                    <select
                        value={filter}
                        onChange={(e) => {
                            setFilter(e.target.value);
                            setCurrentPage(1);
                        }}
                        className="flex-1 px-3 py-2 text-xs sm:text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                    >
                        <option value="all">All Tickets</option>
                        <option value="read">Read</option>
                        <option value="unread">Unread</option>
                    </select>
                    <button onClick={fetchTickets} className="p-2 sm:p-2 border border-gray-300 rounded-md bg-white hover:bg-gray-50 text-gray-500 shrink-0">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Tickets Table */}
            <div className="bg-white shadow overflow-hidden sm:rounded-md border border-gray-200">
                {loading ? (
                    <div className="divide-y divide-gray-200">
                        {[...Array(10)].map((_, i) => (
                            <div key={i} className="p-3 sm:p-6 bg-white">
                                <div className="flex flex-col lg:flex-row justify-between items-start gap-3 sm:gap-4">
                                    <div className="flex-1 space-y-3 sm:space-y-4 w-full">
                                        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                                            <div className="h-4 sm:h-5 bg-gray-200 rounded w-32 sm:w-48 animate-pulse"></div>
                                            <div className="h-4 sm:h-5 bg-gray-200 rounded w-20 sm:w-16 animate-pulse"></div>
                                        </div>
                                        <div className="h-3 sm:h-4 bg-gray-200 rounded w-40 sm:w-96 animate-pulse"></div>
                                        <div className="h-20 sm:h-24 bg-gray-200 rounded animate-pulse"></div>
                                    </div>
                                    <div className="flex flex-row sm:flex-col gap-2 w-full lg:w-auto lg:flex-col lg:min-w-fit shrink-0">
                                        <div className="h-8 sm:h-9 bg-gray-200 rounded animate-pulse flex-1 sm:flex-none"></div>
                                        <div className="h-8 sm:h-9 bg-gray-200 rounded animate-pulse flex-1 sm:flex-none"></div>
                                        <div className="h-8 sm:h-9 bg-gray-200 rounded animate-pulse flex-1 sm:flex-none"></div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : filteredTickets.length === 0 ? (
                    <div className="p-6 sm:p-12 text-center text-gray-500">
                        <svg className="mx-auto h-8 sm:h-12 w-8 sm:w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                        </svg>
                        <p className="mt-3 sm:mt-4 font-medium text-sm sm:text-base">No tickets found</p>
                        <p className="text-xs sm:text-sm">No support tickets match your current filter.</p>
                    </div>
                ) : (
                    <>
                        <ul className="divide-y divide-gray-200">
                            {paginatedTickets.map((ticket) => (
                                <li key={ticket.id} className={`p-3 sm:p-6 ${!ticket.is_read ? 'bg-blue-50' : 'bg-white'}`}>
                                    <div className="flex flex-col lg:flex-row justify-between items-start gap-3 sm:gap-4">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                                                <h3 className={`text-sm sm:text-base font-medium ${!ticket.is_read ? 'text-gray-900 font-semibold' : 'text-gray-700'}`}>{ticket.subject}</h3>
                                                <div className="flex gap-2 flex-wrap">
                                                    {!ticket.is_read && (
                                                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-200 text-blue-800 whitespace-nowrap">Unread</span>
                                                    )}
                                                    {ticket.is_replied && (
                                                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-200 text-green-800 whitespace-nowrap">Replied</span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="text-xs sm:text-sm text-gray-500 mb-3 break-all">
                                                From: <span className="font-medium text-gray-700">{ticket.name}</span> ({ticket.email}) • <span className="whitespace-nowrap">{new Date(ticket.created_at).toLocaleString()}</span>
                                            </div>
                                            <div className="bg-gray-50 rounded-lg p-3 sm:p-4 text-xs sm:text-sm text-gray-700 whitespace-pre-wrap border border-gray-100 max-h-32 sm:max-h-48 overflow-y-auto">
                                                {ticket.message}
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex flex-row sm:flex-col gap-2 w-full sm:w-auto sm:min-w-fit shrink-0">
                                            <button 
                                                onClick={() => handleMarkRead(ticket.id, ticket.is_read)} 
                                                className={`flex-1 sm:flex-none text-xs px-2 sm:px-3 py-1.5 border rounded-md font-medium text-center transition-colors ${
                                                    ticket.is_read 
                                                        ? 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50' 
                                                        : 'border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100'
                                                }`}
                                            >
                                                <span className="hidden sm:inline">{ticket.is_read ? 'Mark Unread' : 'Mark Read'}</span>
                                                <span className="sm:hidden">{ticket.is_read ? 'Unread' : 'Read'}</span>
                                            </button>
                                            <button 
                                                onClick={() => handleReplyClick(ticket)}
                                                className="flex-1 sm:flex-none text-xs px-2 sm:px-3 py-1.5 border border-blue-300 text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md font-medium text-center transition-colors"
                                            >
                                                Reply
                                            </button>
                                            <button 
                                                onClick={() => handleDeleteClick(ticket.id, ticket.subject)} 
                                                className="flex-1 sm:flex-none text-xs px-2 sm:px-3 py-1.5 border border-red-200 text-red-700 bg-red-50 hover:bg-red-100 rounded-md font-medium text-center transition-colors"
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                </li>
                            ))}
                        </ul>

                        {/* Pagination */}
                        {filteredTickets.length > 0 && (
                            <div className="bg-white px-3 sm:px-6 py-4 border-t border-gray-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                <div className="text-xs sm:text-sm text-gray-600 whitespace-nowrap">
                                    Showing <span className="font-medium">{startIndex + 1}</span> to <span className="font-medium">{Math.min(startIndex + itemsPerPage, filteredTickets.length)}</span> of <span className="font-medium">{filteredTickets.length}</span>
                                </div>
                                {totalPages > 1 && (
                                    <div className="flex flex-wrap gap-1 sm:gap-2 w-full sm:w-auto">
                                        <button
                                            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                                            disabled={currentPage === 1}
                                            className="px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-md text-xs sm:text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                        >
                                            <span className="hidden sm:inline">← Previous</span>
                                            <span className="sm:hidden">Prev</span>
                                        </button>
                                        
                                        <div className="flex items-center gap-0.5 sm:gap-1">
                                            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                                                if (totalPages <= 5) return i + 1;
                                                if (i < 2) return i + 1;
                                                if (currentPage - 1 <= i && i <= currentPage + 1) return currentPage - 2 + i;
                                                return null;
                                            }).filter(Boolean).map((page) => (
                                                <button
                                                    key={page}
                                                    onClick={() => setCurrentPage(page)}
                                                    className={`px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-md transition-colors ${
                                                        currentPage === page
                                                            ? 'bg-blue-600 text-white'
                                                            : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                                                    }`}
                                                >
                                                    {page}
                                                </button>
                                            ))}
                                        </div>
                                        
                                        <button
                                            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                                            disabled={currentPage === totalPages}
                                            className="px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-md text-xs sm:text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                        >
                                            <span className="hidden sm:inline">Next →</span>
                                            <span className="sm:hidden">Next</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Delete Confirmation Modal */}
            {deleteConfirm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
                    <div className="bg-white rounded-lg shadow-xl max-w-sm w-full animate-in fade-in duration-200">
                        <div className="p-4 sm:p-6">
                            <div className="flex items-center justify-center w-10 sm:w-12 h-10 sm:h-12 mx-auto mb-3 sm:mb-4 bg-red-100 rounded-full">
                                <svg className="w-5 sm:w-6 h-5 sm:h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                            </div>
                            <h3 className="text-base sm:text-lg font-semibold text-gray-900 text-center mb-2">Delete Ticket</h3>
                            <p className="text-gray-600 text-center text-xs sm:text-sm mb-4 sm:mb-6">
                                Are you sure you want to delete "<strong>{deleteConfirm.subject}</strong>"? This action cannot be undone.
                            </p>
                        </div>

                        <div className="bg-gray-50 px-4 sm:px-6 py-3 sm:py-4 flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 rounded-b-lg border-t border-gray-200">
                            <button
                                onClick={() => setDeleteConfirm(null)}
                                disabled={deleting}
                                className="w-full sm:w-auto px-3 sm:px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 font-medium disabled:opacity-50 disabled:cursor-not-allowed text-sm transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirmDelete}
                                disabled={deleting}
                                className="w-full sm:w-auto px-3 sm:px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed text-sm transition-colors"
                            >
                                {deleting ? 'Deleting...' : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Reply Modal */}
            {replyModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
                    <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] flex flex-col animate-in fade-in duration-200">
                        <div className="p-4 sm:p-6 border-b border-gray-200">
                            <h3 className="text-base sm:text-lg font-semibold text-gray-900">Reply to {replyModal.name}</h3>
                            <p className="text-xs sm:text-sm text-gray-500 mt-1">Original Subject: {replyModal.subject}</p>
                        </div>

                        <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
                            <div>
                                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">Original Message</label>
                                <div className="bg-gray-50 rounded p-3 sm:p-4 text-xs sm:text-sm text-gray-700 max-h-32 overflow-y-auto border border-gray-200">
                                    {replyModal.message}
                                </div>
                            </div>

                            <div>
                                <label htmlFor="reply" className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">Your Reply</label>
                                <textarea
                                    id="reply"
                                    value={replyText}
                                    onChange={(e) => setReplyText(e.target.value)}
                                    placeholder="Type your reply here..."
                                    rows="4"
                                    className="w-full px-3 sm:px-4 py-2 text-xs sm:text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                                />
                                <p className="text-xs text-gray-500 mt-2">{replyText.length} / 5000 characters</p>
                            </div>
                        </div>

                        <div className="p-4 sm:p-6 bg-gray-50 border-t border-gray-200 flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 justify-end">
                            <button
                                onClick={() => {
                                    setReplyModal(null);
                                    setReplyText('');
                                }}
                                className="px-3 sm:px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSendReply}
                                disabled={sendingReply || !replyText.trim()}
                                className="px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm transition-colors"
                            >
                                {sendingReply ? 'Sending...' : 'Send Reply'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

