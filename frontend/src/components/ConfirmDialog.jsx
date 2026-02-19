import React, { useEffect } from 'react';

export default function ConfirmDialog({
    isOpen,
    title,
    message,
    confirmText = "Confirm",
    cancelText = "Cancel",
    onConfirm,
    onCancel,
    variant = "danger"
}) {
    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape' && isOpen) {
                onCancel();
            }
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            document.body.style.overflow = 'hidden';
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, onCancel]);

    if (!isOpen) return null;

    const confirmButtonClass = variant === "danger"
        ? "bg-neutral-900 hover:bg-black text-white"
        : "bg-[#606c38] hover:bg-[#4a532b] text-white";

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-neutral-900/60 backdrop-blur-md transition-opacity"
                onClick={onCancel}
            />

            <div className="relative bg-white border border-neutral-200 rounded-[2.5rem] shadow-2xl max-w-md w-full p-10 animate-slide-up overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-[#606c38]/10" />
                <h3 className="text-2xl font-black text-neutral-900 mb-2 italic tracking-tighter uppercase">{title}</h3>
                <p className="text-neutral-400 text-sm font-medium leading-relaxed mb-10">{message}</p>

                <div className="flex gap-4">
                    <button
                        onClick={onCancel}
                        className="flex-1 px-6 py-4 bg-neutral-100 text-neutral-500 rounded-2xl hover:bg-neutral-200 transition-all font-black text-[10px] uppercase tracking-widest active:scale-95"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={onConfirm}
                        className={`flex-1 px-6 py-4 rounded-2xl transition-all font-black text-[10px] uppercase tracking-widest active:scale-95 shadow-xl ${confirmButtonClass} ${variant === 'danger' ? 'shadow-neutral-200/50' : 'shadow-olive-500/20'}`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
}
