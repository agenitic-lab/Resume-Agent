import React, { useState, useEffect } from 'react';
import { getMaintenanceStatus, setMaintenanceMode } from '../services/api';
import toast from 'react-hot-toast';

export default function AdminDashboard({ children }) {
    const [maintenance, setMaintenance] = useState(false);
    const [toggling, setToggling] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    useEffect(() => {
        getMaintenanceStatus()
            .then(data => setMaintenance(data?.active ?? false))
            .catch(() => { });
    }, []);

    const handleToggle = async () => {
        setShowConfirm(false);
        setToggling(true);
        try {
            const next = !maintenance;
            await setMaintenanceMode(next);
            setMaintenance(next);
            toast.success(next ? '🔧 Maintenance mode enabled' : '✅ Maintenance mode disabled');
        } catch {
            toast.error('Failed to update maintenance mode');
        } finally {
            setToggling(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-gray-50/50">
            <div className="bg-white border-b border-gray-200 px-4 md:px-8 py-4 flex items-center justify-between flex-wrap gap-3">
                <h1 className="text-2xl font-bold text-primary">Admin Console</h1>

                {/* Maintenance Toggle */}
                <button
                    onClick={() => setShowConfirm(true)}
                    disabled={toggling}
                    className={`relative inline-flex items-center gap-2.5 px-4 py-2 rounded-lg text-sm font-semibold border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2
                        ${maintenance
                            ? 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100 focus:ring-red-400'
                            : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100 focus:ring-gray-300'
                        } ${toggling ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                    title={maintenance ? 'Click to disable maintenance mode' : 'Click to enable maintenance mode'}
                >
                    {/* Status dot */}
                    <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${maintenance ? 'bg-red-500 animate-pulse' : 'bg-gray-300'}`} />

                    {toggling ? (
                        <span className="flex items-center gap-1.5">
                            <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                            Updating...
                        </span>
                    ) : (
                        <>
                            {/* Wrench icon */}
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            {maintenance ? 'Maintenance ON' : 'Maintenance OFF'}
                        </>
                    )}
                </button>
            </div>

            <div className="flex-1 overflow-y-auto">
                <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 md:px-8">
                    {children}
                </div>
            </div>

            {/* Maintenance Mode Confirmation Modal */}
            {showConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowConfirm(false)}>
                    <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 p-6" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-3 mb-4">
                            <div className={`p-2 rounded-full ${maintenance ? 'bg-green-100' : 'bg-amber-100'}`}>
                                <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 ${maintenance ? 'text-green-600' : 'text-amber-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900">
                                {maintenance ? 'Disable Maintenance Mode?' : 'Enable Maintenance Mode?'}
                            </h3>
                        </div>

                        <p className="text-sm text-gray-600 mb-6">
                            {maintenance
                                ? 'The site will become accessible to all users again. Make sure all updates and fixes are complete before disabling.'
                                : 'All users will be redirected to a maintenance page and won\'t be able to access the site. Only admins and test users will retain access.'}
                        </p>

                        <div className="flex items-center justify-end gap-3">
                            <button
                                onClick={() => setShowConfirm(false)}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleToggle}
                                className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors ${
                                    maintenance
                                        ? 'bg-green-600 hover:bg-green-700'
                                        : 'bg-amber-600 hover:bg-amber-700'
                                }`}
                            >
                                {maintenance ? 'Yes, Disable' : 'Yes, Enable'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
