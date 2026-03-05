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
        ? "bg-brand-primary hover:bg-brand-hover text-white shadow-brand"
        : "bg-brand-primary hover:bg-brand-hover text-white shadow-brand";

    return (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
                onClick={onCancel}
            />

            <div className="relative bg-bg-primary border border-border-muted rounded-2xl shadow-elevated max-w-sm w-full p-8 animate-slide-up overflow-hidden">
                <h3 className="text-xl font-bold text-text-primary mb-2 tracking-tight">{title}</h3>
                <p className="text-text-secondary text-sm leading-relaxed mb-8">{message}</p>

                <div className="flex gap-3">
                    <button
                        onClick={onCancel}
                        className="btn btn-secondary flex-1"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={onConfirm}
                        className={`btn flex-1 ${confirmButtonClass}`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
}
