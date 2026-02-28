import React, { useState } from 'react';
import Sidebar from './Sidebar';

export default function DashboardLayout({ children }) {
    const [mobileOpen, setMobileOpen] = useState(false);

    return (
        <div className="flex h-screen overflow-hidden bg-primary text-primary">
            {/* Mobile Header */}
            <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-surface border-b border-gray-200 z-40 flex items-center px-4 justify-between shadow-sm">
                <div className="flex items-center gap-3">
                    <img src="/resiko-logo.png" alt="Resiko" className="w-8 h-8 object-contain" />
                    <span className="font-semibold text-primary">Resiko</span>
                </div>
                <button onClick={() => setMobileOpen(true)} className="p-2 -mr-2 text-gray-500 hover:text-primary">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                </button>
            </div>

            <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
            <main className="flex-1 overflow-y-auto mt-16 md:mt-0 relative">
                {children}
            </main>
        </div>
    );
}
