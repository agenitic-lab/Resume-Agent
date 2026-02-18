import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';

// Refined Particle class for Global Dense Network (Plexus)
class Particle {
  constructor(canvas) {
    this.canvas = canvas;
    this.x = Math.random() * canvas.width;
    this.y = Math.random() * canvas.height;
    this.vx = (Math.random() - 0.5) * 0.4;
    this.vy = (Math.random() - 0.5) * 0.4;
    this.radius = Math.random() * 1.5 + 0.5;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;

    if (this.x < 0 || this.x > this.canvas.width) this.vx *= -1;
    if (this.y < 0 || this.y > this.canvas.height) this.vy *= -1;
  }

  draw(ctx) {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(96, 108, 56, 0.4)'; // Olive Accent
    ctx.fill();
  }
}

export default function Home() {
  const [isDemoOpen, setIsDemoOpen] = useState(false);
  const canvasRef = useRef(null);
  const { scrollY } = useScroll();
  const y1 = useTransform(scrollY, [0, 500], [0, 100]);
  const y2 = useTransform(scrollY, [0, 500], [0, -80]);

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
    // Balanced density for performance and aesthetics
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

        // Dense connection logic
        for (let j = i + 1; j < particles.length; j++) {
          const other = particles[j];
          const dx = particle.x - other.x;
          const dy = particle.y - other.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          // Slightly reduced connection distance for performance
          if (distance < 110) {
            ctx.beginPath();
            // Gradient opacity based on distance
            const opacity = (1 - distance / 110) * 0.18;
            ctx.strokeStyle = `rgba(96, 108, 56, ${opacity})`; // Olive Accent
            ctx.lineWidth = 0.6;
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
    <>
      <style>{`
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -40px) scale(1.05); }
          66% { transform: translate(-20px, 20px) scale(0.95); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-blob {
          animation: blob 10s infinite alternate;
        }

        /* Ambient Grid */
        .ambient-grid {
          background-size: 60px 60px;
          background-image: 
            linear-gradient(to right, rgba(0, 0, 0, 0.03) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(0, 0, 0, 0.03) 1px, transparent 1px);
        }

        html { scroll-behavior: smooth; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #050505; }
        ::-webkit-scrollbar-thumb { background: #1a1a1a; border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: #333; }
        ::selection { background-color: rgba(96, 108, 56, 0.3); color: #000000; }
      `}</style>

      <div className="relative min-h-screen bg-[#f5f5f5] text-neutral-900 overflow-hidden font-sans selection:bg-[#606c38]/30">

        {/* Global Background Layer (Fixed) */}
        <div className="fixed inset-0 z-0 pointer-events-none">
          <div className="absolute inset-0 ambient-grid opacity-100" />

          {/* Dense High-Performance Network Canvas */}
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full opacity-60 mix-blend-multiply"
          />

          {/* Deep Ambient Glows */}
          <motion.div
            style={{ y: y1 }}
            className="absolute top-[-20%] right-[10%] w-[800px] h-[800px] bg-[#606c38]/5 blur-[150px] rounded-full animate-blob"
          />
          <motion.div
            style={{ y: y2 }}
            className="absolute bottom-[0%] left-[-10%] w-[600px] h-[600px] bg-neutral-400/5 blur-[120px] rounded-full animate-blob [animation-delay:3s]"
          />
        </div>

        {/* Content Content Container */}
        <div className="relative z-10 w-full">
          {/* Hero Section */}
          <section className="px-6 pt-24 pb-12 lg:px-12 flex flex-col items-center justify-center min-h-[90vh] lg:min-h-screen">
            <div className="max-w-7xl mx-auto text-center">

              {/* Specialized AI Badge */}


              {/* Main Headline */}
              <motion.h1
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 1, delay: 0.1 }}
                className="text-4xl md:text-7xl font-black leading-[0.95] tracking-tighter mb-5"
              >
                <span className="block text-neutral-900 opacity-95">Transform Your</span>
                <span className="block text-neutral-900 opacity-95">Resume.</span>
                <span className="block mt-3 text-[#606c38] drop-shadow-[0_0_15px_rgba(96,108,56,0.1)]">Beat the ATS.</span>
              </motion.h1>

              {/* Subheadline (Reduced Description) */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.3 }}
                className="text-base md:text-lg text-neutral-500 max-w-lg mx-auto leading-relaxed mb-8 px-4 font-medium"
              >
                Autonomous AI that analyzes, scores, and optimizes your resume
                with full decision transparency.
              </motion.p>

              {/* CTA Buttons */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.5 }}
                className="flex flex-col sm:flex-row items-center justify-center gap-5"
              >
                <Link
                  to="/signup"
                  className="group relative px-10 py-4 bg-[#606c38] text-white rounded-full font-black text-lg transition-all duration-300 hover:scale-[1.03] active:scale-95 shadow-[0_0_30px_rgba(96,108,56,0.15)] hover:shadow-[0_0_40px_rgba(96,108,56,0.3)]"
                >
                  <span className="relative z-10 flex items-center gap-2.5">
                    <span>Get Optimization Free</span>
                    <svg className="w-5 h-5 group-hover:translate-x-1.5 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </span>
                </Link>
                <button
                  onClick={() => setIsDemoOpen(true)}
                  className="group px-10 py-4 bg-white text-neutral-900 rounded-full font-bold text-lg border border-neutral-200 hover:border-neutral-300 transition-all duration-300 hover:bg-neutral-50 flex items-center gap-2.5 shadow-sm"
                >
                  <div className="w-8 h-8 rounded-full bg-[#606c38]/10 text-[#606c38] flex items-center justify-center group-hover:bg-[#606c38]/20 transition-colors">
                    <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                  <span>Watch System Demo</span>
                </button>
              </motion.div>
            </div>
          </section>

          {/* Demo Modal */}
          <AnimatePresence>
            {isDemoOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 bg-black/90 backdrop-blur-2xl"
                onClick={() => setIsDemoOpen(false)}
              >
                <motion.div
                  initial={{ scale: 0.9, opacity: 0, y: 20 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.9, opacity: 0, y: 20 }}
                  onClick={(e) => e.stopPropagation()}
                  className="relative w-full max-w-5xl h-[85vh] bg-white rounded-[2.5rem] overflow-hidden border border-neutral-200 shadow-2xl flex flex-col"
                >
                  {/* Resume Header */}
                  <div className="px-10 py-8 border-b border-neutral-100 bg-neutral-50 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <div className="w-2 h-2 rounded-full bg-[#606c38] animate-pulse" />
                        <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-[#606c38]/80">System Status: ACTIVE</h3>
                      </div>
                      <h2 className="text-4xl font-black text-neutral-900 italic tracking-tighter uppercase">Optimization Process.</h2>
                    </div>
                    <button
                      onClick={() => setIsDemoOpen(false)}
                      className="w-12 h-12 bg-neutral-100 hover:bg-neutral-200 rounded-2xl flex items-center justify-center text-neutral-900 transition-all hover:scale-110 active:scale-90 border border-neutral-200"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  {/* Resume Content (Scrollable) */}
                  <div className="flex-1 overflow-y-auto custom-scrollbar p-10 space-y-12 bg-white">

                    {/* Process Grid */}
                    <div className="grid md:grid-cols-2 gap-8 text-neutral-600">
                      {[
                        {
                          phase: "01",
                          title: "Neural Extraction",
                          desc: "Our engine decomposes your resume into 40+ distinct semantic vectors, mapping your experience against industry-specific latent spaces.",
                          icon: (
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                            </svg>
                          )
                        },
                        {
                          phase: "02",
                          title: "ATS Pattern Match",
                          desc: "Simultaneous scanning against 500+ hidden ATS parameters. We identify exactly why recruiters see or ignore your profile.",
                          icon: (
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 21h4m-4-8a4 4 0 118 0v6a2 2 0 01-2 2H8a2 2 0 01-2-2v-6a4 4 0 118 0z" />
                            </svg>
                          )
                        },
                        {
                          phase: "03",
                          title: "Strategic Synthesis",
                          desc: "AI-driven rewriting of core bullet points to maximize high-impact phrasing while maintaining 100% authenticity.",
                          icon: (
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          )
                        },
                        {
                          phase: "04",
                          title: "Score Deployment",
                          desc: "Final optimization pass achieving a 100/100 readiness score across all verification protocols. Ready for executive search.",
                          icon: (
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          )
                        }
                      ].map((item, idx) => (
                        <motion.div
                          key={item.phase}
                          initial={{ opacity: 0, x: idx % 2 === 0 ? -20 : 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.2 + idx * 0.1 }}
                          className="group p-8 bg-neutral-50 border border-neutral-100 rounded-3xl hover:bg-neutral-100/50 transition-all"
                        >
                          <div className="flex items-center gap-4 mb-6">
                            <div className="w-12 h-12 bg-[#606c38] rounded-xl flex items-center justify-center text-white shadow-lg shadow-olive-500/10 transition-transform group-hover:scale-110">
                              {item.icon}
                            </div>
                            <div className="text-[10px] font-black uppercase tracking-[0.4em] text-neutral-400">Phase {item.phase}</div>
                          </div>
                          <h4 className="text-2xl font-black text-neutral-900 italic tracking-tighter mb-3">{item.title}</h4>
                          <p className="text-neutral-500 text-sm font-medium leading-relaxed">{item.desc}</p>
                        </motion.div>
                      ))}
                    </div>

                    {/* Technical Specs Branding */}
                    <div className="p-10 bg-[#606c38]/5 border border-[#606c38]/10 rounded-3xl relative overflow-hidden group">
                      <div className="absolute top-0 right-0 w-64 h-64 bg-[#606c38]/10 blur-[100px] rounded-full -translate-y-1/2 translate-x-1/2" />
                      <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-10">
                        <div className="space-y-4 text-center md:text-left">
                          <h5 className="text-2xl font-black text-neutral-900 italic tracking-tighter uppercase">Analysis Report.</h5>
                          <p className="text-neutral-500 text-xs font-black uppercase tracking-[0.2em] max-w-sm">Every optimization is backed by our predictive analytics engine.</p>
                        </div>
                        <div className="flex gap-12">
                          <div>
                            <div className="text-3xl font-black text-[#606c38] italic tracking-tighter">99.8%</div>
                            <div className="text-[8px] font-black uppercase tracking-widest text-neutral-400 mt-1">Parsing Accuracy</div>
                          </div>
                          <div>
                            <div className="text-3xl font-black text-neutral-900 italic tracking-tighter"><span className="text-[#606c38]">100</span>/100</div>
                            <div className="text-[8px] font-black uppercase tracking-widest text-neutral-400 mt-1">ATS Optimization</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Resume Footer */}
                  <div className="px-10 py-6 border-t border-neutral-100 bg-neutral-50 flex items-center justify-between">
                    <div className="text-[9px] font-black uppercase tracking-[0.4em] text-neutral-400">System Status: <span className="text-[#606c38]/60">Verified Optimized Output</span></div>
                    <div className="text-[8px] font-black uppercase tracking-[0.2em] text-neutral-300 italic font-medium">© 2026 RA.SYS_V2</div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Features Section */}
          <section id="features" className="relative z-10 px-6 py-12 lg:px-12">
            <div className="max-w-7xl mx-auto">
              <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
                <div className="max-w-xl">
                  <h2 className="text-3xl md:text-5xl font-black text-neutral-900 leading-tight mb-4">
                    Agentic Intelligence
                  </h2>
                  <p className="text-base text-neutral-500 leading-relaxed font-medium">
                    Not just another resume generator. Real decision-making
                    logic designed to handle complex hiring filters.
                  </p>
                </div>
                <div className="flex items-center gap-3 px-5 py-2.5 bg-[#606c38] rounded-2xl shrink-0 h-fit shadow-[0_0_30px_rgba(96,108,56,0.15)] overflow-hidden relative group">
                  <div className="relative z-10">
                    <span className="block text-2xl font-black text-white leading-none">+22%</span>
                    <span className="block text-[8px] uppercase tracking-widest font-black text-white/60 mt-0.5">Efficiency</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 md:grid-rows-2 gap-4 auto-rows-[200px]">
                {[
                  {
                    icon: "M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z",
                    title: "Goal-Driven Analysis",
                    description: "Our autonomous reasoning engine extracts hidden job keywords for zero-gap alignment.",
                    className: "md:col-span-2 md:row-span-1 bg-gradient-to-br from-white to-neutral-50/50"
                  },
                  {
                    icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
                    title: "ATS Pattern Match",
                    description: "Scanning against 500+ hidden ATS parameters.",
                    className: "md:col-span-1 md:row-span-1 bg-white"
                  },
                  {
                    icon: "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z",
                    title: "Strategic Synthesis",
                    description: "Neural synthesis for impactful phrasing.",
                    className: "md:col-span-1 md:row-span-2 bg-[#606c38] text-white"
                  },
                  {
                    icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z",
                    title: "Traceable Decisions",
                    description: "Logged audits with precise surgical reasoning.",
                    className: "md:col-span-1 md:row-span-1 bg-white"
                  },
                  {
                    icon: "M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01",
                    title: "Executive Assets",
                    description: "Generation of supportive documents for high-seniority roles.",
                    className: "md:col-span-2 md:row-span-1 bg-neutral-900 text-white"
                  }
                ].map((feature, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, scale: 0.98 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: index * 0.05 }}
                    className={`group p-6 border border-neutral-200 rounded-[1.5rem] hover:shadow-lg transition-all duration-500 flex flex-col justify-between overflow-hidden relative ${feature.className}`}
                  >
                    <div className="z-10">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-4 transition-all duration-500 ${feature.className.includes('bg-[#606c38]') || feature.className.includes('bg-neutral-900')
                        ? 'bg-white/10 text-white'
                        : 'bg-neutral-50 text-neutral-400 group-hover:bg-[#606c38] group-hover:text-white border border-neutral-100'
                        }`}>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={feature.icon} />
                        </svg>
                      </div>
                      <h3 className={`text-base font-black italic tracking-tighter uppercase mb-2 ${feature.className.includes('text-white') ? 'text-white' : 'text-neutral-900'
                        }`}>{feature.title}</h3>
                      <p className={`text-[10px] leading-relaxed font-medium ${feature.className.includes('text-white') ? 'text-white/70' : 'text-neutral-500'
                        }`}>{feature.description}</p>
                    </div>
                    <div className="absolute top-0 right-0 w-20 h-20 bg-white/5 blur-2xl rounded-full -translate-y-1/2 translate-x-1/2" />
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          {/* Professional Comparison Section */}
          <section className="px-6 py-24 lg:px-12 bg-white/50 backdrop-blur-sm relative overflow-hidden">
            <div className="max-w-7xl mx-auto">
              <div className="text-center mb-16">
                <h2 className="text-3xl md:text-5xl font-black text-neutral-900 mb-4 tracking-tighter italic uppercase">
                  Superior Performance.
                </h2>
                <p className="text-neutral-500 text-sm font-medium max-w-lg mx-auto leading-relaxed">
                  Real-world comparison of autonomous optimization results against standard manual drafting.
                </p>
              </div>

              <div className="grid lg:grid-cols-2 gap-12 items-start">
                {/* Standard Resume (Left) */}
                <motion.div
                  initial={{ opacity: 0, x: -30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  className="relative group lg:opacity-70 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-700"
                >
                  <div className="bg-white border border-neutral-200 rounded-[2rem] p-10 shadow-xl shadow-neutral-100/50 relative min-h-[850px] font-serif text-neutral-900">
                    <div className="absolute top-6 right-6 px-3 py-1 bg-neutral-100 rounded-full text-[8px] font-black uppercase tracking-widest text-neutral-400 font-sans">Standard Manual Draft</div>
                    <div className="max-w-[90%] mx-auto space-y-6">
                      {/* Name Header */}
                      <div className="text-center space-y-1">
                        <div className="text-xl font-bold">JOHN DOE</div>
                        <div className="text-[9px] text-neutral-500 font-sans">• Seattle, WA • john.doe@email.com • (555) 000-0000 •</div>
                      </div>

                      {/* Summary */}
                      <div className="space-y-2">
                        <div className="text-[10px] font-bold border-b border-neutral-200 pb-0.5 uppercase tracking-wide">Professional Summary</div>
                        <p className="text-[9px] leading-relaxed text-neutral-600 font-sans">Software developer with experience in web applications. Proficient in React and Node.js. Seeking new opportunities to contribute to a collaborative engineering team.</p>
                      </div>

                      <div className="space-y-4">
                        <div className="text-[10px] font-bold border-b border-neutral-200 pb-0.5 uppercase tracking-wide">Professional Experience</div>
                        <div className="space-y-4">
                          <div className="space-y-1">
                            <div className="flex justify-between items-baseline">
                              <span className="text-[10px] font-bold uppercase">Google</span>
                              <span className="text-[9px] text-neutral-500 font-sans">Mountain View, CA</span>
                            </div>
                            <div className="flex justify-between items-baseline italic">
                              <span className="text-[9px]">Software Engineer</span>
                              <span className="text-[9px] font-sans">August 2021 — Present</span>
                            </div>
                            <div className="text-[9px] text-neutral-500 leading-relaxed font-sans pl-4 space-y-1">
                              <p>• Developed web applications using React.</p>
                              <p>• Worked on the frontend and backend of several internal tools.</p>
                              <p>• Fixed bugs and improved performance across different modules.</p>
                            </div>
                          </div>
                          <div className="space-y-1">
                            <div className="flex justify-between items-baseline">
                              <span className="text-[10px] font-bold uppercase">Amazon</span>
                              <span className="text-[9px] text-neutral-500 font-sans">Seattle, WA</span>
                            </div>
                            <div className="flex justify-between items-baseline italic">
                              <span className="text-[9px]">Junior Developer</span>
                              <span className="text-[9px] font-sans">July 2019 — August 2021</span>
                            </div>
                            <div className="text-[9px] text-neutral-500 leading-relaxed font-sans pl-4 space-y-1">
                              <p>• Maintained existing codebase for e-commerce features.</p>
                              <p>• Wrote unit tests for new service components.</p>
                              <p>• Helped with database migrations and schema updates.</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="text-[10px] font-bold border-b border-neutral-200 pb-0.5 uppercase tracking-wide">Education</div>
                        <div className="flex justify-between items-baseline">
                          <span className="text-[10px] font-bold uppercase">University of Washington</span>
                          <span className="text-[9px] font-sans">2019</span>
                        </div>
                        <div className="text-[9px] italic">Bachelor of Science in Computer Science</div>
                      </div>

                      <div className="space-y-2">
                        <div className="text-[10px] font-bold border-b border-neutral-200 pb-0.5 uppercase tracking-wide">Expert-Level Skills</div>
                        <div className="text-[9px] leading-relaxed text-neutral-600 font-sans">
                          JavaScript, React, Node.js, SQL, HTML, CSS, Git, Jira, AWS, Linux
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* Optimized Resume (Right) */}
                <motion.div
                  initial={{ opacity: 0, x: 30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  className="relative"
                >
                  <div className="bg-white border-2 border-[#606c38]/10 rounded-[2rem] p-10 shadow-[0_50px_100px_-20px_rgba(96,108,56,0.15)] relative overflow-hidden group min-h-[850px] font-sans text-neutral-900">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#606c38]/30 to-transparent animate-pulse" />
                    <div className="absolute top-6 right-6 px-3 py-1 bg-[#606c38] rounded-full text-[8px] font-black uppercase tracking-widest text-white shadow-lg shadow-olive-500/20">Agent Optimized</div>

                    <div className="max-w-[90%] mx-auto space-y-6 text-[9.5px]">
                      {/* Name Header (ATS Standard) */}
                      <div className="text-center space-y-1">
                        <div className="text-2xl font-bold tracking-tight uppercase leading-none">JOHN DOE</div>
                        <div className="text-neutral-500 font-medium lowercase">Seattle, WA | (+1) 555-0123 | john.doe@ra-systems.io | linkedin.com/in/jdoe</div>
                      </div>

                      {/* Strategic Core Competencies */}
                      <div className="space-y-2">
                        <div className="text-[10px] font-bold border-b-2 border-neutral-900 pb-0.5 uppercase tracking-wide">Strategic Core Competencies</div>
                        <div className="grid grid-cols-2 gap-x-8 gap-y-0.5 font-medium text-neutral-700">
                          <div>• Distributed Systems Architecture</div>
                          <div>• Cloud-Native Infrastructure (K8s)</div>
                          <div>• Neural Latency Optimization</div>
                          <div>• High-Availability Orchestration</div>
                          <div>• Chaos Engineering / Resilience</div>
                          <div>• Scalability & Performance Tuning</div>
                        </div>
                      </div>

                      {/* Professional Experience (ATS Semantic) */}
                      <div className="space-y-4">
                        <div className="text-[10px] font-bold border-b-2 border-neutral-900 pb-0.5 uppercase tracking-wide">Professional Experience</div>
                        <div className="space-y-5">
                          <div className="space-y-1.5">
                            <div className="flex justify-between items-baseline font-bold">
                              <span className="text-[11px] uppercase text-neutral-900">Google Inc.</span>
                              <span className="text-neutral-500 font-sans">August 2021 — Present</span>
                            </div>
                            <div className="flex justify-between items-baseline italic text-neutral-600 font-medium lowercase">
                              <span>Principal Infrastructure Architect</span>
                              <span>Mountain View, CA</span>
                            </div>
                            <div className="text-neutral-600 leading-relaxed space-y-1.5 pl-2">
                              <div className="flex gap-2">
                                <span className="text-[#606c38] font-black shrink-0">RA.OPT //</span>
                                <span>Orchestrated <span className="text-neutral-900 font-bold">high-availability distributed systems</span> supporting 10M+ concurrent users with 99.999% uptime.</span>
                              </div>
                              <div className="flex gap-2 text-neutral-500">
                                <span className="text-[#606c38]/50 font-black shrink-0">RA.OPT //</span>
                                <span>Pioneered <span className="text-neutral-900 font-bold">neural latency reduction protocols</span> reducing global edge-node response by 22% (45ms to 35ms).</span>
                              </div>
                              <div className="flex gap-2">
                                <span className="text-[#606c38] font-black shrink-0">RA.OPT //</span>
                                <span>Architected 100% cloud-native <span className="text-neutral-900 font-bold">multi-cluster Kubernetes infrastructure</span> for resilient global failover.</span>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-1.5 opacity-60">
                            <div className="flex justify-between items-baseline font-bold uppercase">
                              <span className="text-neutral-900">Amazon Cloud Services</span>
                              <span className="text-neutral-500 font-sans">June 2019 — August 2021</span>
                            </div>
                            <div className="flex justify-between items-baseline italic text-neutral-600 font-medium lowercase">
                              <span>Infrastructure Consultant</span>
                              <span>Seattle, WA</span>
                            </div>
                            <div className="text-neutral-500 leading-relaxed space-y-1 pl-2 text-[9px]">
                              <p>• Scaled core ecommerce microservices to handle holiday peak traffic of 100k requests per second.</p>
                              <p>• Automated chaos engineering suites strengthening system resilience by 40% against regional outages.</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Academic Foundation */}
                      <div className="space-y-2 text-[9px]">
                        <div className="text-[10px] font-bold border-b-2 border-neutral-900 pb-0.5 uppercase tracking-wide">Academic Foundation</div>
                        <div className="flex justify-between items-baseline font-bold uppercase">
                          <span className="text-neutral-900">University of Washington</span>
                          <span className="text-neutral-500 font-sans font-bold">Seattle, WA</span>
                        </div>
                        <div className="flex justify-between items-baseline italic text-neutral-600 font-medium">
                          <span>Bachelor of Science in Computer Science</span>
                          <span>June 2019 | 3.9 GPA</span>
                        </div>
                      </div>

                      {/* Technical Arsenal (Keyword Optimized) */}
                      <div className="space-y-2 pb-2">
                        <div className="text-[10px] font-bold border-b-2 border-neutral-900 pb-0.5 uppercase tracking-wide">Technical Arsenal</div>
                        <p className="text-neutral-600 leading-tight">
                          <span className="font-bold text-neutral-900 uppercase tracking-tighter text-[8px]">Technologies:</span> Go, Python, C++, Java, Rust, SQL, NoSQL (Prometheus, Redis), GraphQL.
                        </p>
                        <p className="text-neutral-600 leading-tight">
                          <span className="font-bold text-neutral-900 uppercase tracking-tighter text-[8px]">Infrastructure:</span> AWS, GCP, Kubernetes, Docker, Terraform, CI/CD (GitHub Actions, Jenkins).
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Feature Floating Callout */}
                  <div className="absolute -right-8 -bottom-4 hidden xl:block">
                    <motion.div
                      animate={{ y: [0, -8, 0] }}
                      transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                      className="p-4 bg-[#606c38] text-white rounded-[1.5rem] shadow-2xl shadow-olive-900/30 flex items-center gap-3 border border-white/10"
                    >
                      <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                      </div>
                      <div>
                        <div className="text-[8px] font-black uppercase tracking-widest opacity-60">ATS Score Result</div>
                        <div className="text-lg font-black italic tracking-tighter">100/100</div>
                      </div>
                    </motion.div>
                  </div>
                </motion.div>
              </div>
            </div>
          </section>

          {/* CTA Section */}
          <section className="px-6 py-32 lg:px-12">
            <div className="max-w-6xl mx-auto">
              <div className="relative overflow-hidden rounded-[3rem] bg-[#606c38] px-8 py-20 md:p-32 text-center shadow-2xl shadow-olive-500/30">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.2),transparent)] opacity-20 mix-blend-overlay pointer-events-none" />

                <div className="relative z-10 max-w-4xl mx-auto space-y-10">
                  <h2 className="text-5xl md:text-8xl font-black text-white tracking-tighter leading-[0.9] italic uppercase">
                    Optimize <br /> Your Future.
                  </h2>
                  <p className="text-xl text-white/80 font-medium max-w-lg mx-auto leading-relaxed">
                    Join elite job seekers who leverage autonomous intelligence to command attention.
                  </p>
                  <div className="pt-6 flex flex-col sm:flex-row items-center justify-center gap-6">
                    <Link
                      to="/signup"
                      className="px-12 py-5 bg-white text-[#606c38] rounded-full font-black text-xl hover:scale-105 transition-all shadow-2xl inline-flex items-center gap-4 active:scale-95"
                    >
                      <span>Get Started</span>
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </Link>
                  </div>
                  <p className="text-black/50 text-[10px] font-black uppercase tracking-[0.3em]">
                    Premium Access • Zero Risk • 100% Traceable
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Footer */}
          <footer className="relative z-10 border-t border-neutral-200 bg-white/50 backdrop-blur-xl mt-12">
            <div className="max-w-7xl mx-auto px-6 py-20">
              <div className="flex flex-col items-center gap-12">
                <div className="flex flex-col items-center gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#606c38] rounded-xl flex items-center justify-center shadow-lg shadow-olive-500/10">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <span className="text-2xl font-black text-neutral-900 tracking-tighter italic">ResumeAgent</span>
                  </div>
                  <p className="text-neutral-500 text-sm font-bold max-w-sm text-center md:text-left leading-relaxed opacity-80">
                    Precision AI infrastructure for the modern executive search.
                  </p>
                </div>

                <div className="flex flex-wrap justify-center gap-10 text-neutral-500 text-[10px] font-black uppercase tracking-[0.2em] opacity-70">
                  <a href="#" className="hover:text-[#606c38] transition-colors duration-300">Privacy</a>
                  <a href="#" className="hover:text-[#606c38] transition-colors duration-300">Terms</a>
                  <a href="#" className="hover:text-[#606c38] transition-colors duration-300">Contact</a>
                </div>

                <div className="text-neutral-400 text-[9px] font-black uppercase tracking-[0.4em] opacity-40">
                  © 2026 RA.SYS
                </div>
              </div>
            </div>
          </footer>
        </div>
      </div>
    </>
  );
}