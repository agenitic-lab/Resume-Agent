import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';

export default function NotFound() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    const pts = Array.from({ length: 70 }, () => ({
      x: Math.random() * canvas.width, y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.3,
      r: Math.random() * 1.5 + 0.4,
    }));
    let raf;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      pts.forEach((p, i) => {
        p.x = (p.x + p.vx + canvas.width) % canvas.width;
        p.y = (p.y + p.vy + canvas.height) % canvas.height;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,75,114,0.25)'; ctx.fill();
        for (let j = i + 1; j < pts.length; j++) {
          const dx = p.x - pts[j].x, dy = p.y - pts[j].y, d = Math.hypot(dx, dy);
          if (d < 120) {
            ctx.beginPath();
            ctx.strokeStyle = `rgba(255,75,114,${0.08 * (1 - d / 120)})`;
            ctx.lineWidth = 0.6; ctx.moveTo(p.x, p.y); ctx.lineTo(pts[j].x, pts[j].y); ctx.stroke();
          }
        }
      });
      raf = requestAnimationFrame(draw);
    };
    draw();
    window.addEventListener('resize', resize);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, []);

  return (
    <div className="relative h-screen w-screen overflow-hidden flex flex-col items-center justify-center bg-white font-sans select-none">

      <style>{`
        @keyframes float-y { 0%,100% { transform: translateY(0px) rotate(-2deg); } 50% { transform: translateY(-14px) rotate(2deg); } }
        @keyframes pulse-ring { 0% { transform: scale(1); opacity: 0.6; } 100% { transform: scale(1.8); opacity: 0; } }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes slide-up { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .float-y { animation: float-y 4s ease-in-out infinite; }
        .pulse-ring { animation: pulse-ring 2s ease-out infinite; }
        .slide-up { animation: slide-up 0.6s ease both; }
        .slide-up-2 { animation: slide-up 0.6s 0.1s ease both; }
        .slide-up-3 { animation: slide-up 0.6s 0.2s ease both; }
      `}</style>

      {/* Particle canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />

      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 70% 60% at 50% 50%, rgba(255,75,114,0.07) 0%, transparent 70%)' }} />

      {/* Top-left branding */}
      <div className="absolute top-6 left-8 text-sm font-black tracking-widest uppercase" style={{ color: '#ff4b72', opacity: 0.5 }}>
        Resume Agent
      </div>

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center text-center px-6">

        {/* Giant floating 404 icon */}
        <div className="float-y relative mb-6">
          {/* Pulse rings */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="pulse-ring w-28 h-28 rounded-full border-2" style={{ borderColor: 'rgba(255,75,114,0.3)' }} />
          </div>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ animationDelay: '0.8s' }}>
            <div className="pulse-ring w-28 h-28 rounded-full border-2" style={{ borderColor: 'rgba(255,75,114,0.2)', animationDelay: '0.8s' }} />
          </div>

          {/* Icon circle */}
          <div className="w-28 h-28 rounded-full flex items-center justify-center shadow-2xl relative z-10"
            style={{ background: 'linear-gradient(135deg, #ff4b72 0%, #ff7695 100%)', boxShadow: '0 16px 48px rgba(255,75,114,0.40)' }}>
            <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>

        {/* 404 number */}
        <div className="slide-up text-9xl font-black leading-none tracking-tighter mb-1"
          style={{ color: '#ff4b72', textShadow: '0 8px 32px rgba(255,75,114,0.2)' }}>
          404
        </div>

        {/* Title */}
        <h1 className="slide-up-2 text-xl font-bold text-gray-800 mb-2 tracking-tight">
          Oops! Page not found
        </h1>

        {/* Description */}
        <p className="slide-up-3 text-gray-400 text-sm leading-relaxed max-w-xs mb-8">
          The page you're looking for doesn't exist or has been moved. Let's get you back on track.
        </p>

        {/* Buttons */}
        <div className="slide-up-3 flex gap-3 flex-wrap justify-center">
          <Link to="/"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-95"
            style={{ background: 'linear-gradient(135deg, #ff4b72, #ff7695)', boxShadow: '0 4px 16px rgba(255,75,114,0.4)' }}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            Go Home
          </Link>
          <Link to="/dashboard"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-semibold text-gray-600 bg-white border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all active:scale-95">
            Dashboard &rarr;
          </Link>
        </div>
      </div>

      {/* Bottom watermark */}
      <div className="absolute bottom-6 text-xs text-gray-300 font-mono tracking-widest">
        ERROR · 404 · NOT FOUND
      </div>
    </div>
  );
}
