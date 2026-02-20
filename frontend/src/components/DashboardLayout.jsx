import React from 'react';
import Sidebar from './Sidebar';

export default function DashboardLayout({ children }) {
    return (
        <div className="flex h-screen overflow-hidden bg-bg-primary text-text-primary">
            <Sidebar />
            <main className="flex-1 overflow-y-auto">
                {children}
            </main>
        </div>
    );
}
