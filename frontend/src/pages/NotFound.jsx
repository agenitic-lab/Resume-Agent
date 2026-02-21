import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion as Motion } from 'framer-motion';

// Replicating High-Performance Particle class for Plexus 
class Particle {
  constructor(canvas) {
    this.canvas = canvas;
    this.x = Math.random() * canvas.width;
    this.y = Math.random() * canvas.height;
    this.vx = (Math.random() - 0.5) * 0.4;
    this.vy = (Math.random() - 0.5) * 0.4;
    this.radius = Math.random() * 1.5;
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
    ctx.fillStyle = 'rgba(141, 163, 74, 0.4)'; // brand-primary accent
    ctx.fill();
  }
}

// Generate static points once outside the component to ensure purity
const INITIAL_POINTS = [...Array(6)].map(() => ({
  top: `${20 + Math.random() * 60}%`,
  left: `${20 + Math.random() * 60}%`,
  duration: 2 + Math.random() * 2,
  delay: Math.random() * 5
}));

export default function NotFound() {
  const canvasRef = useRef(null);

  // Plexus Animation Effect
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();

    const particles = [];
    const particleCount = Math.min(Math.floor(window.innerWidth / 12), 100);

    for (let i = 0; i < particleCount; i++) {
      particles.push(new Particle(canvas));
    }

    let animationFrameId;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((particle, i) => {
        particle.update();
        particle.draw(ctx);
        for (let j = i + 1; j < particles.length; j++) {
          const other = particles[j];
          const dx = particle.x - other.x;
          const dy = particle.y - other.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance < 150) {
            const opacity = 0.12 * (1 - distance / 150);
            ctx.beginPath();
            ctx.strokeStyle = `rgba(141, 163, 74, ${opacity})`; // brand-primary accent
            ctx.lineWidth = 0.5;
            ctx.moveTo(particle.x, particle.y);
            ctx.lineTo(other.x, other.y);
            ctx.stroke();
          }
        }
      });
      animationFrameId = requestAnimationFrame(animate);
    };

    animate();
    window.addEventListener('resize', resizeCanvas);
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  return (
    <div className="relative min-h-screen bg-bg-primary text-text-primary overflow-hidden font-sans selection:bg-brand-primary/30 flex flex-col items-center justify-center p-6 pt-32">
      <style>{`
        @keyframes scan {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes glitch {
          0% { transform: translate(0); }
          20% { transform: translate(-2px, 2px); }
          40% { transform: translate(-2px, -2px); }
          60% { transform: translate(2px, 2px); }
          80% { transform: translate(2px, -2px); }
          100% { transform: translate(0); }
        }
        .animate-scan {
          animation: scan 4s linear infinite;
        }
        .animate-glitch {
          animation: glitch 0.3s cubic-bezier(.25,.46,.45,.94) infinite;
        }
      `}</style>

      {/* Background Layer */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 opacity-100"
          style={{
            backgroundImage: 'linear-gradient(to right, rgba(255, 255, 255, 0.02) 1px, transparent 1px), linear-gradient(to bottom, rgba(255, 255, 255, 0.02) 1px, transparent 1px)',
            backgroundSize: '60px 60px'
          }}
        />
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full opacity-60 mix-blend-screen" />
      </div>

      <div className="relative z-10 w-full max-w-4xl flex flex-col items-center">
        {/* Radar Scanner Visual */}
        <div className="relative w-64 h-64 md:w-96 md:h-96 mb-12">
          {/* Main Circle */}
          <div className="absolute inset-0 rounded-full border border-border-muted bg-bg-surface/50 backdrop-blur-xl" />
          <div className="absolute inset-8 rounded-full border border-border-subtle/50" />
          <div className="absolute inset-20 rounded-full border border-border-subtle/30" />

          {/* Scanning Line */}
          <div className="absolute inset-0 rounded-full flex items-center justify-center animate-scan pointer-events-none">
            <div className="w-[50%] h-[2px] bg-gradient-to-r from-brand-primary/40 to-transparent absolute right-0 origin-left" />
          </div>

          {/* Central Visual */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <Motion.h1
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-8xl md:text-9xl font-black italic tracking-tighter text-text-primary/90 drop-shadow-[0_0_20px_rgba(141,163,74,0.15)] animate-glitch"
            >
              404
            </Motion.h1>
            <div className="text-[10px] font-black uppercase tracking-[0.4em] text-brand-primary/60 mt-2">
              Void Protocol Active
            </div>
          </div>

          {/* Data Points */}
          {INITIAL_POINTS.map((p, i) => (
            <Motion.div
              key={i}
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 1, 0] }}
              transition={{ repeat: Infinity, duration: p.duration, delay: p.delay }}
              className="absolute w-1 h-1 bg-neutral-900 rounded-full"
              style={{
                top: p.top,
                left: p.left,
                boxShadow: '0 0 10px rgba(0, 0, 0, 0.1)'
              }}
            />
          ))}
        </div>

        {/* Messaging */}
        <div className="text-center space-y-6 max-w-lg">
          <Motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h2 className="text-3xl font-black text-neutral-900 italic tracking-tighter mb-4 uppercase">
              Coordinate Mismatch.
            </h2>
            <p className="text-neutral-500 font-medium leading-relaxed">
              The requested executive entity does not exist in this sector. The intelligence engine has mapped a void at this address.
            </p>
          </Motion.div>

          {/* Technical Metadata */}
          <div className="flex justify-center gap-8 py-4 border-y border-border-muted/50">
            <div className="text-left">
              <div className="text-[9px] font-black uppercase tracking-widest text-text-muted mb-1">Status</div>
              <div className="text-[10px] font-black text-red-500 uppercase tracking-widest leading-none">Lost in Void</div>
            </div>
            <div className="text-left">
              <div className="text-[9px] font-black uppercase tracking-widest text-text-muted mb-1">Vector</div>
              <div className="text-[10px] font-black text-text-primary uppercase tracking-widest leading-none">0x000F4</div>
            </div>
            <div className="text-left">
              <div className="text-[9px] font-black uppercase tracking-widest text-text-muted mb-1">Signal</div>
              <div className="text-[10px] font-black text-brand-primary uppercase tracking-widest leading-none italic">Unstable</div>
            </div>
          </div>

          <Motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="pt-4"
          >
            <Link
              to="/"
              className="inline-flex items-center px-12 py-4 bg-[#606c38] text-white font-black text-[11px] uppercase tracking-[0.25em] rounded-2xl hover:bg-[#4a532b] transition-all active:scale-95 shadow-xl shadow-olive-500/10"
            >
              Re-establish Uplink
            </Link>
          </Motion.div>
        </div>
      </div>
    </div>
  );
}
