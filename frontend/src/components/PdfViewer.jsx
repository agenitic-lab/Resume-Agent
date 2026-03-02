/**
 * PdfViewer – mobile-aware PDF display component.
 *
 * Desktop  → renders the PDF inside an <iframe> exactly as before.
 * Mobile   → <iframe> cannot render PDF blob URLs on iOS Safari / Android
 *             Chrome.  Instead we show a clear prompt with two action buttons:
 *             • "Download PDF"  – triggers browser download (always works)
 *             • "Open in Viewer" – opens blob URL in a new tab so the device's
 *                                  native PDF viewer (Files / Acrobat) handles it
 *
 * Props:
 *   url        {string}  – blob:// URL returned by URL.createObjectURL()
 *   filename   {string}  – suggested download filename (default: "resume.pdf")
 *   className  {string}  – extra classes forwarded to the <iframe> on desktop
 *   title      {string}  – iframe title for accessibility
 */
import { useState } from 'react';

/** Heuristic mobile detection – covers iOS, Android, and iPad in mobile mode. */
function detectMobile() {
    if (typeof window === 'undefined') return false;
    const ua = navigator.userAgent || '';
    const isTouchMac =
        navigator.maxTouchPoints > 1 && /MacIntel|Mac/.test(navigator.platform || '');
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua) || isTouchMac;
}

export default function PdfViewer({
    url,
    filename = 'resume.pdf',
    className = '',
    title = 'PDF Preview',
}) {
    const [isMobile] = useState(() => detectMobile());

    if (!url) return null;

    /* ── Desktop: inline iframe ──────────────────────────────────────────── */
    if (!isMobile) {
        return (
            <iframe
                src={`${url}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
                className={`w-full h-full block border-0 ${className}`}
                title={title}
            />
        );
    }

    /* ── Mobile: download / open buttons ────────────────────────────────── */
    return (
        <div className="flex flex-col items-center justify-center h-full gap-5 px-6 py-10 text-center">
            {/* PDF icon */}
            <svg
                className="w-16 h-16 text-gray-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
            >
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                />
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 13h6M9 16h4"
                />
            </svg>

            <div>
                <p className="text-sm font-semibold text-gray-700">
                    PDF preview isn&apos;t supported in mobile browsers
                </p>
                <p className="mt-1 text-xs text-gray-400">
                    Use one of the buttons below to view your resume
                </p>
            </div>

            {/* Download button – <a download> always works for blob URLs */}
            <a
                href={url}
                download={filename}
                className="w-full max-w-xs flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-brand text-white text-sm font-semibold shadow-lg shadow-brand/20 active:scale-95 transition-transform"
            >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2.5}
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                    />
                </svg>
                Download PDF
            </a>

            {/* Open in new tab – device PDF viewer (Files / Acrobat) may render it */}
            <button
                onClick={() => {
                    const win = window.open(url, '_blank', 'noopener,noreferrer');
                    // Some browsers block window.open with blob URLs; fall back to anchor
                    if (!win) {
                        const a = document.createElement('a');
                        a.href = url;
                        a.target = '_blank';
                        a.rel = 'noopener noreferrer';
                        a.click();
                    }
                }}
                className="w-full max-w-xs flex items-center justify-center gap-2 px-6 py-3 rounded-2xl border border-gray-200 bg-white text-gray-700 text-sm font-semibold active:scale-95 transition-transform"
            >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                    />
                </svg>
                Open in Viewer
            </button>
        </div>
    );
}
