import React, { useEffect, useState, useRef } from 'react';

// Particle system matching the brand pink color
class Particle {
    constructor(canvas) {
        this.canvas = canvas;
        this.reset();
    }
    reset() {
        this.x = Math.random() * this.canvas.width;
        this.y = Math.random() * this.canvas.height;
        this.vx = (Math.random() - 0.5) * 0.3;
        this.vy = (Math.random() - 0.5) * 0.3;
        this.radius = Math.random() * 1.5 + 0.5;
    }
    update() {
        this.x += this.vx;
        this.y += this.vy;
        if (this.x < 0) this.x = this.canvas.width;
        if (this.x > this.canvas.width) this.x = 0;
        if (this.y < 0) this.y = this.canvas.height;
        if (this.y > this.canvas.height) this.y = 0;
    }
    draw(ctx) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 75, 114, 0.35)';
        ctx.fill();
    }
}

export default function Maintenance({ onRefresh }) {
    const [dots, setDots] = useState('');
    const canvasRef = useRef(null);

    // Animated loading dots
    useEffect(() => {
        const id = setInterval(() => setDots(d => d.length >= 3 ? '' : d + '.'), 600);
        return () => clearInterval(id);
    }, []);

    // Plexus particle background
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
        resize();
        const count = Math.min(Math.floor(window.innerWidth / 14), 80);
        const particles = Array.from({ length: count }, () => new Particle(canvas));
        let rafId;
        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            particles.forEach((p, i) => {
                p.update(); p.draw(ctx);
                for (let j = i + 1; j < particles.length; j++) {
                    const o = particles[j];
                    const dx = p.x - o.x, dy = p.y - o.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < 140) {
                        ctx.beginPath();
                        ctx.strokeStyle = `rgba(255, 75, 114, ${0.1 * (1 - dist / 140)})`;
                        ctx.lineWidth = 0.5;
                        ctx.moveTo(p.x, p.y);
                        ctx.lineTo(o.x, o.y);
                        ctx.stroke();
                    }
                }
            });
            rafId = requestAnimationFrame(animate);
        };
        animate();
        window.addEventListener('resize', resize);
        return () => { cancelAnimationFrame(rafId); window.removeEventListener('resize', resize); };
    }, []);

    return (
        <div className="relative min-h-screen bg-primary text-primary overflow-hidden font-sans flex flex-col items-center justify-center p-6">
            <style>{`
        @keyframes spin-slow { to { transform: rotate(360deg); } }
        @keyframes spin-slow-reverse { to { transform: rotate(-360deg); } }
        .spin-slow { animation: spin-slow 8s linear infinite; }
        .spin-slow-reverse { animation: spin-slow-reverse 6s linear infinite; }
      `}</style>

            {/* Particle canvas background */}
            <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none opacity-70" />

            {/* Soft brand glow */}
            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full pointer-events-none"
                style={{ background: 'radial-gradient(circle, rgba(255,75,114,0.08) 0%, transparent 70%)' }} />

            {/* Grid overlay */}
            <div className="absolute inset-0 pointer-events-none opacity-30"
                style={{
                    backgroundImage: 'linear-gradient(to right, rgba(255,75,114,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,75,114,0.04) 1px, transparent 1px)',
                    backgroundSize: '60px 60px'
                }} />

            {/* Main card */}
            <div className="relative z-10 text-center max-w-md w-full">

                {/* Animated gear rings */}
                <div className="flex justify-center mb-10">
                    <div className="relative w-36 h-36">
                        {/* Outer ring */}
                        <div className="absolute inset-0 rounded-full border-2 spin-slow"
                            style={{ borderColor: 'rgba(255,75,114,0.2)', borderTopColor: 'rgba(255,75,114,0.7)' }} />
                        {/* Middle ring */}
                        <div className="absolute inset-4 rounded-full border-2 spin-slow-reverse"
                            style={{ borderColor: 'rgba(255,75,114,0.1)', borderBottomColor: 'rgba(255,75,114,0.5)' }} />
                        {/* Center icon */}
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-16 h-16 rounded-full flex items-center justify-center shadow-lg"
                                style={{ background: 'linear-gradient(135deg, #ff4b72, #ff7695)', boxShadow: '0 4px 24px rgba(255,75,114,0.35)' }}>
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                            </div>
                        </div>
                        {/* Pulsing dot */}
                        <span className="absolute top-0.5 right-0.5 flex h-3.5 w-3.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: '#ff4b72' }} />
                            <span className="relative inline-flex rounded-full h-3.5 w-3.5" style={{ backgroundColor: '#ff4b72' }} />
                        </span>
                    </div>
                </div>

                {/* Title */}
                <h1 className="text-4xl font-black tracking-tight text-gray-900 mb-2">
                    Under Maintenance
                </h1>

                {/* Animated subtitle */}
                <p className="font-semibold mb-3" style={{ color: '#ff4b72' }}>
                    We're improving your experience{dots}
                </p>

                {/* Description */}
                <p className="text-gray-500 text-sm leading-relaxed mb-8 max-w-xs mx-auto">
                    Our team is performing scheduled maintenance to bring you a better experience. We'll be back shortly!
                </p>

                {/* Progress bar */}
                <div className="w-full bg-gray-100 rounded-full h-1.5 mb-8 overflow-hidden">
                    <div className="h-full rounded-full animate-pulse" style={{ width: '65%', background: 'linear-gradient(90deg, #ff4b72, #ff7695)' }} />
                </div>

                {/* Status chips */}
                <div className="flex justify-center gap-2 flex-wrap mb-8">
                    {[{ label: 'Database', ok: true }, { label: 'AI Engine', ok: false }, { label: 'Auth', ok: true }].map(({ label, ok }) => (
                        <span key={label} className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${ok ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-600'}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${ok ? 'bg-green-500' : 'bg-red-500 animate-pulse'}`} />
                            {label}
                        </span>
                    ))}
                </div>

                {/* Refresh button */}
                <button
                    onClick={() => onRefresh?.()}
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-semibold text-white mb-6 transition-all active:scale-95 hover:opacity-90"
                    style={{ background: 'linear-gradient(135deg, #ff4b72, #ff7695)', boxShadow: '0 4px 14px rgba(255,75,114,0.35)' }}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Try Refreshing
                </button>

                {/* Footer */}
                <p className="text-gray-400 text-xs">
                    Need urgent help?{' '}
                    <a href="mailto:support@resumeagent.ai" className="font-medium hover:underline" style={{ color: '#ff4b72' }}>
                        Contact support
                    </a>
                </p>
            </div>
        </div>
    );
}
