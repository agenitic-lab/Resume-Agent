import React, { useState, useEffect } from 'react';

export default function Toast({ message, type = 'success', duration = 3000, onClose }) {
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsVisible(false);
            if (onClose) onClose();
        }, duration);

        return () => clearTimeout(timer);
    }, [duration, onClose]);

    if (!isVisible) return null;

    const bgColor = type === 'error' ? 'bg-neutral-900' : type === 'success' ? 'bg-[#606c38]' : 'bg-neutral-800';
    const textColor = 'text-white';

    return (
        <div className={`fixed bottom-8 right-8 ${bgColor} ${textColor} px-8 py-4 rounded-2xl shadow-2xl z-[200] flex items-center gap-4 animate-slide-up border border-white/10`}>
            {type === 'success' && (
                <div className="w-6 h-6 bg-white/20 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                </div>
            )}
            {type === 'error' && (
                <div className="w-6 h-6 bg-red-500/20 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </div>
            )}
            <span className="text-[10px] font-black uppercase tracking-widest">{message}</span>
            <button
                onClick={() => { setIsVisible(false); if (onClose) onClose(); }}
                className="ml-4 p-1 hover:bg-white/10 rounded-lg transition-colors"
            >
                <svg className="w-4 h-4 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        </div>
    );
}
