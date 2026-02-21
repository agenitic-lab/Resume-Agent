import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "../components/ui/button";
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "../components/ui/card";
import { Sparkles, FileText, Target, PenTool } from "lucide-react";

export default function Home() {
  const [isDemoOpen, setIsDemoOpen] = useState(false);
  const [activeFeature, setActiveFeature] = useState(0);
  const canvasRef = useRef(null);
  useScroll();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();

    const neurons = [];
    const neuronCount = Math.min(Math.floor(window.innerWidth / 15), 80);

    for (let i = 0; i < neuronCount; i++) {
      neurons.push(new Neuron(canvas));
    }

    let animationFrameId;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      neurons.forEach((neuron, i) => {
        neuron.update();
        neuron.draw(ctx);

        // Connection logic with "Data Pulses"
        for (let j = i + 1; j < neurons.length; j++) {
          const other = neurons[j];
          const dx = neuron.x - other.x;
          const dy = neuron.y - other.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < 150) {
            ctx.beginPath();
            const opacity = (1 - distance / 150) * 0.15;
            ctx.strokeStyle = `rgba(141, 163, 74, ${opacity})`;
            ctx.lineWidth = 0.5;
            ctx.moveTo(neuron.x, neuron.y);
            ctx.lineTo(other.x, other.y);
            ctx.stroke();

            // Visualize "Data Pulse" if one of the neurons is firing
            if (neuron.firing || other.firing) {
              const activeNeuron = neuron.firing ? neuron : other;
              const targetNeuron = neuron.firing ? other : neuron;
              const progress = neuron.firing ? (1 - neuron.firingTimer) : (1 - other.firingTimer);

              const pulseX = activeNeuron.x + (targetNeuron.x - activeNeuron.x) * progress;
              const pulseY = activeNeuron.y + (targetNeuron.y - activeNeuron.y) * progress;

              ctx.beginPath();
              ctx.arc(pulseX, pulseY, 2, 0, Math.PI * 2);
              ctx.fillStyle = `rgba(141, 163, 74, ${opacity * 4})`;
              ctx.fill();
            }
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
        @keyframes scan {
          0% { top: 0%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
        .animate-scan {
          animation: scan 8s linear infinite;
        }

        @keyframes pulse-soft {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.6; }
        }
        .animate-pulse-soft {
          animation: pulse-soft 4s ease-in-out infinite;
        }

        .text-mono { font-family: 'JetBrains Mono', monospace; }
        
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(141, 163, 74, 0.2); border-radius: 10px; }
      `}</style>

      <div className="relative min-h-screen bg-bg-primary text-text-primary overflow-hidden font-sans selection:bg-brand-primary/30">

        {/* Technical Background Layer */}
        <div className="fixed inset-0 z-0 pointer-events-none">
          <div className="absolute inset-0 cyber-grid opacity-40" />

          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full opacity-30 mix-blend-screen"
          />

          {/* Glitches / Glows */}
          <div className="absolute top-0 left-1/4 w-[1px] h-full bg-brand-primary/5 shadow-[0_0_15px_rgba(141,163,74,0.1)]" />
          <div className="absolute top-0 right-1/4 w-[1px] h-full bg-brand-primary/5 shadow-[0_0_15px_rgba(141,163,74,0.1)]" />

          <div className="absolute top-[20%] left-[10%] w-[300px] h-[300px] bg-brand-primary/2 blur-[120px] rounded-full" />
          <div className="absolute bottom-[20%] right-[10%] w-[400px] h-[400px] bg-brand-primary/2 blur-[150px] rounded-full" />
        </div>


        {/* Content Container */}
        <div className="relative z-10 w-full">
          {/* Main Landing Section (Hero + Scanner) */}
          <section className="relative px-6 pt-32 pb-32 lg:px-12 flex flex-col lg:flex-row items-center justify-between max-w-7xl mx-auto min-h-[90vh] gap-12">

            {/* Left Content: Minimal Hero */}
            <div className="w-full lg:w-1/2 space-y-10 z-20">
              <Motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="inline-flex items-center gap-3 px-6 py-2 bg-brand-primary/10 border border-brand-primary/20 rounded-full"
              >
                <div className="w-2 h-2 rounded-full bg-brand-primary animate-pulse" />
                <span className="text-[10px] font-black tracking-[0.2em] text-brand-primary uppercase">
                  AI-Powered Resume Optimization
                </span>
              </Motion.div>

              <div className="space-y-6">
                <Motion.h1
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8 }}
                  className="text-7xl md:text-9xl font-black leading-[0.85] tracking-tight uppercase italic"
                >
                  Build a <br />
                  <span className="text-brand-primary">Better Career.</span>
                </Motion.h1>
                <Motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="text-xl text-text-secondary max-w-2xl font-medium leading-relaxed opacity-80"
                >
                  Stop getting rejected by automated filters. Use our intelligent agent to rewrite your experience for maximum recruiter impact.
                </Motion.p>
              </div>

              <Motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="flex flex-col sm:flex-row items-center gap-6 pt-4"
              >
                <Link
                  to="/signup"
                  className="w-full sm:w-auto px-12 py-5 bg-brand-primary text-black rounded-2xl font-black text-lg uppercase tracking-wider hover:scale-105 transition-all shadow-xl shadow-brand-primary/10 active:scale-95"
                >
                  Get Started Free
                </Link>
                <button
                  onClick={() => setIsDemoOpen(true)}
                  className="w-full sm:w-auto px-12 py-5 bg-bg-surface text-text-primary border border-border-muted rounded-2xl font-black text-lg uppercase tracking-wider hover:bg-bg-secondary transition-all active:scale-95"
                >
                  View Demo
                </button>
              </Motion.div>
            </div>

            {/* Right Content: The Scanner Visual */}
            <div className="w-full lg:w-1/2 relative h-[500px] lg:h-[700px] group">
              <Motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 1.2, delay: 0.2 }}
                className="relative w-full h-full bg-bg-surface border border-border-muted rounded-[2.5rem] overflow-hidden shadow-[0_40px_100px_-20px_rgba(0,0,0,0.6)]"
              >
                {/* Scrolling Resume - High Fidelity ATS Content */}
                <Motion.div
                  animate={{ y: [0, -2800] }}
                  transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
                  className="p-16 space-y-16 opacity-80 group-hover:opacity-100 transition-all duration-700 font-serif text-[11px] leading-relaxed text-text-primary"
                >
                  {[...Array(3)].map((_, groupIdx) => (
                    <div key={groupIdx} className="space-y-16">
                      {/* Resume Header */}
                      <div className="text-center space-y-4 border-b border-border-muted pb-10">
                        <div className="text-3xl font-bold tracking-tighter uppercase font-sans text-brand-primary">Bill Gates</div>
                        <div className="text-text-secondary font-medium lowercase font-sans text-xs tracking-wider">
                          Software Leader â€¢ Philanthropist â€¢ Climate Investor
                        </div>
                      </div>

                      {/* Professional Synthesis */}
                      <div className="space-y-4">
                        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-primary font-sans">Professional Synthesis</div>
                        <p className="italic text-text-secondary">
                          Architect of the worldâ€™s most influential software companies. Led development and commercialization of PC operating systems that defined modern computing. Transitioned from corporate leadership to global philanthropy through the Gates Foundation, driving large-scale initiatives in global health, education, and poverty reduction.
                        </p>
                      </div>

                      {/* Skills Section */}
                      <div className="space-y-6">
                        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-primary font-sans">Core Skills (ATS Keywords)</div>
                        <div className="flex flex-wrap gap-2">
                          {[
                            "Executive Leadership", "Software Strategy", "Product Vision",
                            "Operating Systems", "Platform Development", "Technology Commercialization",
                            "Strategic Partnerships", "Organizational Scaling", "Venture Strategy",
                            "Global Health Philanthropy", "Climate Innovation", "Grant Funding Strategy",
                            "Public Speaking & Policy"
                          ].map((skill) => (
                            <span key={skill} className="px-2 py-1 bg-brand-primary/10 border border-brand-primary/20 text-[9px] font-bold text-brand-primary uppercase font-sans">
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Experience Section */}
                      <div className="space-y-12">
                        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-primary font-sans">Professional Experience</div>

                        {/* Microsoft */}
                        <div className="space-y-4">
                          <div className="flex justify-between items-baseline font-bold font-sans">
                            <span className="text-sm uppercase">Microsoft Corporation</span>
                            <span className="text-text-muted text-[10px]">1975 â€” 2008</span>
                          </div>
                          <div className="italic text-text-secondary font-medium">Co-Founder & Technology Leader</div>
                          <div className="space-y-3 pt-2">
                            <div className="flex gap-3">
                              <span className="text-brand-primary font-black shrink-0">RA.OPT //</span>
                              <p>Co-founded Microsoft and built it into the global leader in PC software.</p>
                            </div>
                            <div className="flex gap-3">
                              <span className="text-brand-primary font-black shrink-0">RA.OPT //</span>
                              <p>Negotiated licensing of MS-DOS for IBMâ€™s first personal computer, establishing industry standards.</p>
                            </div>
                            <div className="flex gap-3">
                              <span className="text-brand-primary font-black shrink-0">RA.OPT //</span>
                              <p>Oversaw growth during the rise of personal computing and Windows operating systems.</p>
                            </div>
                          </div>
                        </div>

                        {/* Gates Foundation */}
                        <div className="space-y-4 opacity-90">
                          <div className="flex justify-between items-baseline font-bold font-sans">
                            <span className="text-sm uppercase">Bill & Melinda Gates Foundation</span>
                            <span className="text-text-muted text-[10px]">2000 â€” PRESENT</span>
                          </div>
                          <div className="italic text-text-secondary font-medium">Co-Chair & Board Member</div>
                          <div className="space-y-3 pt-2">
                            <div className="flex gap-3">
                              <span className="text-brand-primary font-black shrink-0">RA.OPT //</span>
                              <p>Partners with governments and NGOs to address infectious disease and health innovation.</p>
                            </div>
                            <div className="flex gap-3">
                              <span className="text-brand-primary font-black shrink-0">RA.OPT //</span>
                              <p>Foundation funding has surpassed hundreds of billions in long-term commitments.</p>
                            </div>
                          </div>
                        </div>

                        {/* Breakthrough Energy */}
                        <div className="space-y-4 opacity-80">
                          <div className="flex justify-between items-baseline font-bold font-sans">
                            <span className="text-sm uppercase">Breakthrough Energy</span>
                            <span className="text-text-muted text-[10px]">2015 â€” PRESENT</span>
                          </div>
                          <div className="italic text-text-secondary font-medium">Founder</div>
                          <div className="space-y-3 pt-2">
                            <div className="flex gap-3">
                              <span className="text-brand-primary font-black shrink-0">RA.OPT //</span>
                              <p>Supports emerging technologies aimed at reducing carbon emissions and climate solutions.</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Education Section */}
                      <div className="space-y-4">
                        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-primary font-sans">Academic Foundation</div>
                        <div className="flex justify-between items-baseline">
                          <div className="font-bold font-sans text-sm">Harvard University</div>
                          <div className="text-text-muted text-[9px]">INCOMPLETE</div>
                        </div>
                        <div className="italic text-text-secondary italic">Computer Science / Mathematics | Left to co-found Microsoft</div>
                      </div>

                      {/* Awards & Initiatives */}
                      <div className="grid grid-cols-2 gap-8 pt-4">
                        <div className="space-y-4">
                          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-primary font-sans">Awards & Honors</div>
                          <ul className="space-y-2 text-[9px] text-text-secondary">
                            <li>â€¢ Presidential Medal of Freedom (2016)</li>
                            <li>â€¢ Honorary Knighthood (UK, 2005)</li>
                          </ul>
                        </div>
                        <div className="space-y-4">
                          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-primary font-sans">Key Initiatives</div>
                          <ul className="space-y-2 text-[9px] text-text-secondary">
                            <li>â€¢ Co-founder of The Giving Pledge</li>
                            <li>â€¢ Global Disease Prevention Funding</li>
                          </ul>
                        </div>
                      </div>

                      {/* Technical Domains */}
                      <div className="space-y-4">
                        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-primary font-sans">Technical & Industry Domains</div>
                        <div className="text-mono text-[8px] text-text-muted flex flex-wrap gap-x-4 gap-y-2">
                          <span>SOFTWARE_PLATFORMS</span>
                          <span>PC_ECOSYSTEMS</span>
                          <span>OS_STRATEGY</span>
                          <span>TECH_ECONOMICS</span>
                          <span>GLOBAL_DEVELOPMENT</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </Motion.div>

                {/* The Scanning Beam */}
                <div className="scanline animate-scan" />

                {/* Technical Overlays */}
                <div className="absolute inset-0 pointer-events-none p-8 font-mono">
                  <div className="absolute top-8 left-8 text-[10px] text-brand-primary font-bold bg-black/40 px-2 py-1 backdrop-blur-md rounded border border-brand-primary/20">
                    SCAN_TYPE: AI_ANALYSIS
                  </div>
                  <div className="absolute top-8 right-8 text-[10px] text-text-muted">
                    0x882_ANALYSIS
                  </div>

                  {/* Floating Data Nodes */}
                  <Motion.div
                    animate={{ x: [0, 10, 0], y: [0, 5, 0] }}
                    transition={{ duration: 5, repeat: Infinity }}
                    className="absolute top-1/4 left-10 p-3 bg-bg-secondary/80 backdrop-blur-xl border border-border-muted rounded-xl shadow-2xl"
                  >
                    <div className="text-[8px] text-brand-primary uppercase tracking-widest mb-1">Key Terms Found</div>
                    <div className="text-xl font-black text-text-primary italic tracking-tight">Multiple Matches</div>
                  </Motion.div>

                  <Motion.div
                    animate={{ x: [0, -10, 0], y: [0, -8, 0] }}
                    transition={{ duration: 4, repeat: Infinity, delay: 1 }}
                    className="absolute bottom-1/4 right-10 p-3 bg-bg-secondary/80 backdrop-blur-xl border border-border-muted rounded-xl shadow-2xl"
                  >
                    <div className="text-[8px] text-brand-primary uppercase tracking-widest mb-1">ATS Compatibility</div>
                    <div className="text-xl font-black text-text-primary italic tracking-tight">OPTIMIZED</div>
                  </Motion.div>

                  {/* Corner Markers */}
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-brand-primary/40 rounded-tl-lg" />
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-brand-primary/40 rounded-tr-lg" />
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-brand-primary/40 rounded-bl-lg" />
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-brand-primary/40 rounded-br-lg" />
                </div>
              </Motion.div>

              {/* Digital Shadow */}
              <div className="absolute -inset-4 bg-brand-primary/5 blur-3xl -z-10 animate-pulse-soft" />
            </div>
          </section>

          <AnimatePresence>
            {isDemoOpen && (
              <Motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 bg-black/95 backdrop-blur-3xl"
                onClick={() => setIsDemoOpen(false)}
              >
                <Motion.div
                  initial={{ scale: 0.95, opacity: 0, y: 30 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.95, opacity: 0, y: 30 }}
                  onClick={(e) => e.stopPropagation()}
                  className="relative w-full max-w-6xl h-[90vh] bg-bg-surface border border-brand-primary/20 shadow-[0_0_100px_rgba(141,163,74,0.1)] flex flex-col overflow-hidden"
                >
                  {/* Modal Header */}
                  <div className="px-12 py-10 border-b border-border-muted flex items-center justify-between bg-bg-secondary/50">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <div className="w-2.5 h-2.5 rounded-full bg-brand-primary animate-pulse" />
                        <span className="text-mono text-[10px] text-brand-primary font-bold uppercase tracking-[0.4em]">Analysis_Protocol: ACTIVE</span>
                      </div>
                      <h2 className="text-5xl font-black text-text-primary italic tracking-tight uppercase">Strategic Optimization.</h2>
                    </div>
                    <button
                      onClick={() => setIsDemoOpen(false)}
                      className="group p-4 bg-bg-surface hover:bg-brand-primary rounded-xl border border-border-muted transition-all duration-300"
                    >
                      <svg className="w-8 h-8 text-text-primary group-hover:text-black transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  {/* Modal Content */}
                  <div className="flex-1 overflow-y-auto custom-scrollbar bg-bg-primary/30 p-12">
                    <div className="grid lg:grid-cols-12 gap-12">
                      {/* Process Visualization */}
                      <div className="lg:col-span-12 space-y-12 mb-12">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          {[
                            { step: "01", label: "Content_Analysis", status: "COMPLETE" },
                            { step: "02", label: "Pattern_Match_ATS", status: "COMPLETE" },
                            { step: "03", label: "Content_Refinement", status: "ACTIVE" },
                            { step: "04", label: "Diagnostic_Verification", status: "PENDING" }
                          ].map((item, i) => (
                            <div key={i} className={`p-6 border ${item.status === 'ACTIVE' ? 'border-brand-primary bg-brand-primary/5' : 'border-border-muted bg-bg-surface'} transition-all`}>
                              <div className="text-mono text-[9px] text-text-muted mb-2">PHASE_{item.step}</div>
                              <div className={`text-xs font-black uppercase tracking-widest ${item.status === 'ACTIVE' ? 'text-brand-primary' : 'text-text-primary'}`}>{item.label}</div>
                              <div className={`mt-4 text-[8px] font-bold ${item.status === 'COMPLETE' ? 'text-brand-primary' : 'text-text-muted'}`}>[{item.status}]</div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Detailed Logs */}
                      <div className="lg:col-span-8 space-y-8">
                        <div className="space-y-6">
                          <h3 className="text-mono text-[10px] text-brand-primary uppercase tracking-[0.3em] flex items-center gap-4">
                            Live_Audit_Log <div className="flex-1 h-[1px] bg-brand-primary/20" />
                          </h3>
                          <div className="p-8 bg-black/40 border border-border-muted font-mono text-[11px] leading-relaxed text-text-secondary space-y-4">
                            <div className="flex gap-4">
                              <span className="text-brand-primary/60">[14:02:11]</span>
                              <span>Initializing optimization protocols...</span>
                            </div>
                            <div className="flex gap-4">
                              <span className="text-brand-primary/60">[14:02:13]</span>
                              <span className="text-text-primary">MATCH FOUND: Identify "Distributed Systems" as high-priority key term.</span>
                            </div>
                            <div className="flex gap-4">
                              <span className="text-brand-primary/60">[14:02:15]</span>
                              <span className="text-brand-primary">OPTIMIZING: Rewriting "Led team of 5" to "Orchestrated cross-functional engineering pods for efficiency gain."</span>
                            </div>
                            <div className="flex gap-4">
                              <span className="text-brand-primary/60">[14:02:18]</span>
                              <span>Checking for standard ATS formatting guidelines... Compliant.</span>
                            </div>
                            <Motion.div
                              animate={{ opacity: [0, 1] }}
                              transition={{ duration: 0.5, repeat: Infinity }}
                              className="flex gap-4"
                            >
                              <span className="text-brand-primary/60">[14:02:22]</span>
                              <span className="text-brand-primary font-black">SCANNING..._</span>
                            </Motion.div>
                          </div>
                        </div>
                      </div>

                      {/* Metrics Sidebar */}
                      <div className="lg:col-span-4 space-y-8">
                        <div className="p-8 bg-bg-surface border border-border-muted space-y-8">
                          <div>
                            <div className="text-mono text-[9px] text-text-muted uppercase mb-4 tracking-widest">Optimization_Mode</div>
                            <div className="text-4xl font-black text-brand-primary italic">ACTIVE</div>
                          </div>
                          <div className="h-[1px] bg-border-muted" />
                          <div>
                            <div className="text-mono text-[9px] text-text-muted uppercase mb-4 tracking-widest">Decision_Confidence</div>
                            <div className="text-4xl font-black text-text-primary italic">High</div>
                          </div>
                          <div className="h-[1px] bg-border-muted" />
                          <div className="pt-4">
                            <Link to="/signup" className="block w-full py-4 bg-brand-primary text-black text-center text-xs font-black uppercase tracking-widest hover:scale-105 transition-all">
                              Deploy Optimization
                            </Link>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Modal Footer */}
                  <div className="px-12 py-6 border-t border-border-muted bg-bg-secondary/50 flex items-center justify-between text-mono text-[9px] text-text-muted">
                    <div className="flex gap-8">
                      <span>SYS_ARCH: AI_AGENT</span>
                      <span>LATENCY: 12ms</span>
                    </div>
                    <div className="uppercase tracking-[0.2em]">RA.SMART_AUDIT_V1</div>
                  </div>
                </Motion.div>
              </Motion.div>
            )}
          </AnimatePresence>

          {/* â”€â”€ Features Section â€“ Interactive Tab Switcher â”€â”€ */}
          <section id="features" className="relative z-10 border-t border-border-subtle">
            <div className="max-w-7xl mx-auto px-6 lg:px-12 py-32">

              {/* Header */}
              <div className="mb-20">
                <div className="text-[10px] text-brand-primary font-black uppercase tracking-[0.5em] mb-4">Core Technology</div>
                <h2 className="text-5xl md:text-8xl font-black text-text-primary leading-[0.85] tracking-tighter uppercase italic">
                  How It <br /><span className="text-brand-primary">Works.</span>
                </h2>
              </div>

              {/* Tab Switcher Body */}
              {(() => {
                const features = [
                  {
                    tag: "PHASE_01",
                    label: "Semantic Analysis",
                    short: "120+ skill vectors extracted from your resume.",
                    desc: "Precision-guided deconstruction of your professional experience into sector-specific semantic clusters. Our engine identifies 120+ unique skill vectors, maps gaps against the job description, and builds a targeting blueprint for elite-level ATS alignment.",
                    stats: [{ label: "Skill Vectors", val: "120+" }, { label: "Gap Coverage", val: "98%" }, { label: "Latency", val: "<1.2s" }],
                    visual: (
                      <div className="h-full flex flex-col justify-center gap-4 px-4 font-mono text-sm">
                        {["Python â€” 94%", "Leadership â€” 88%", "React â€” 76%", "SQL â€” 91%", "Communication â€” 83%"].map((skill, i) => (
                          <Motion.div
                            key={skill}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.06 }}
                            className="flex items-center gap-4"
                          >
                            <span className="text-text-muted w-32 text-xs shrink-0">{skill.split('â€”')[0].trim()}</span>
                            <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                              <Motion.div
                                initial={{ width: 0 }}
                                animate={{ width: skill.split('â€”')[1].trim() }}
                                transition={{ duration: 0.8, delay: i * 0.06 + 0.2 }}
                                className="h-full bg-brand-primary rounded-full"
                              />
                            </div>
                            <span className="text-brand-primary font-bold text-xs w-10 text-right">{skill.split('â€”')[1].trim()}</span>
                          </Motion.div>
                        ))}
                        <div className="mt-4 pt-4 border-t border-white/5 flex justify-between text-[9px] text-text-muted uppercase font-mono">
                          <span>[ALGO_X9]</span><span>MATCH_ENGINE_V4</span>
                        </div>
                      </div>
                    )
                  },
                  {
                    tag: "PHASE_02",
                    label: "ATS Ghost Scanning",
                    short: "500+ ATS environments simulated in real time.",
                    desc: "Simulating 500+ proprietary ATS environments â€” from Oracle Taleo to Workday â€” to surface hidden rejection thresholds and automated screening protocols buried inside your profile's architecture before they block your application.",
                    stats: [{ label: "ATS Simulated", val: "500+" }, { label: "Pass Rate", val: "99.8%" }, { label: "Environments", val: "Taleo Â· Workday Â· Greenhouse" }],
                    visual: (
                      <div className="h-full flex items-center justify-center">
                        <div className="relative w-48 h-48 flex items-center justify-center">
                          {[0, 1, 2, 3].map(r => (
                            <Motion.div
                              key={r}
                              animate={{ scale: [1, 1.08, 1], opacity: [0.4, 0.15, 0.4] }}
                              transition={{ duration: 2.5, delay: r * 0.4, repeat: Infinity }}
                              className="absolute border border-brand-primary/30 rounded-full"
                              style={{ width: `${40 + r * 22}%`, height: `${40 + r * 22}%` }}
                            />
                          ))}
                          <Motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                            className="absolute inset-0 border-t-2 border-brand-primary/60 rounded-full"
                          />
                          <div className="text-center z-10">
                            <div className="text-3xl font-black text-brand-primary italic">500+</div>
                            <div className="text-[9px] text-text-muted uppercase mt-1">ATS_ENV</div>
                          </div>
                        </div>
                      </div>
                    )
                  },
                  {
                    tag: "PHASE_03",
                    label: "Strategic Synthesis",
                    short: "Generic text â†’ executive-grade impact statements.",
                    desc: "Neural-driven bullet point refactoring that replaces weak, passive phrasing with high-impact, quantified achievement narratives. Each output is benchmarked against what top-1% candidates write for the same role.",
                    stats: [{ label: "Avg Uplift", val: "+34%" }, { label: "Rewrites/Resume", val: "12â€“18" }, { label: "Output Mode", val: "LaTeX" }],
                    visual: (
                      <div className="h-full flex flex-col justify-center font-mono text-xs p-4 space-y-5">
                        <div className="space-y-2">
                          <div className="text-[9px] text-text-muted uppercase tracking-wider flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-text-muted inline-block" /> raw_input
                          </div>
                          <p className="text-text-secondary/50 italic line-through text-xs leading-relaxed">"Led a team and managed projects efficiently."</p>
                        </div>
                        <div className="border-t border-white/5" />
                        <div className="space-y-2">
                          <div className="text-[9px] text-brand-primary uppercase tracking-wider flex items-center gap-2">
                            <Motion.span
                              animate={{ opacity: [1, 0.3, 1] }}
                              transition={{ duration: 1.2, repeat: Infinity }}
                              className="w-1.5 h-1.5 rounded-full bg-brand-primary inline-block"
                            /> optimized_output
                          </div>
                          <Motion.p
                            key={activeFeature}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.6 }}
                            className="text-text-primary font-bold text-xs leading-relaxed"
                          >
                            "Directed 8-person cross-functional team, accelerating feature delivery by 34% & achieving 99.9% on-time sprint completion."
                          </Motion.p>
                        </div>
                      </div>
                    )
                  },
                  {
                    tag: "PHASE_04",
                    label: "Traceable Audits",
                    short: "Every change is logged, benchmarked & reversible.",
                    desc: "Full diagnostic transparency for every decision. Each rewrite, keyword insertion, and structural change is benchmarked against real-world predictive hiring models and logged with confidence scores â€” so you control the output.",
                    stats: [{ label: "Audit Log", val: "Full" }, { label: "Confidence Score", val: "99.2%" }, { label: "Rollback", val: "1-Click" }],
                    visual: (
                      <div className="h-full flex flex-col justify-center gap-2 px-4 font-mono text-[11px]">
                        {[
                          { time: "14:02:11", msg: "Initializing optimization vectors...", type: "log" },
                          { time: "14:02:13", msg: "MATCH: \"Distributed Systems\" â†’ high-priority node.", type: "match" },
                          { time: "14:02:15", msg: "REWRITE: \"Led team\" â†’ \"Orchestrated cross-functional pods\"", type: "rewrite" },
                          { time: "14:02:18", msg: "ATS_SIM: Oracle Fusion Cloud â†’ 99.8% pass.", type: "log" },
                        ].map((item, i) => (
                          <Motion.div
                            key={i}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.1 }}
                            className="flex gap-4 items-start"
                          >
                            <span className="text-brand-primary/50 shrink-0">[{item.time}]</span>
                            <span className={item.type === 'rewrite' ? 'text-brand-primary' : item.type === 'match' ? 'text-text-primary' : 'text-text-muted'}>{item.msg}</span>
                          </Motion.div>
                        ))}
                        <Motion.div
                          animate={{ opacity: [1, 0, 1] }}
                          transition={{ duration: 0.8, repeat: Infinity }}
                          className="text-brand-primary font-black"
                        >â–Š</Motion.div>
                      </div>
                    )
                  }
                ];

                const active = features[activeFeature];

                return (
                  <div className="grid lg:grid-cols-[380px_1fr] gap-0 border border-border-muted overflow-hidden">
                    {/* Left: Tab List */}
                    <div className="border-r border-border-muted divide-y divide-border-muted">
                      {features.map((f, i) => (
                        <button
                          key={i}
                          onClick={() => setActiveFeature(i)}
                          className={`w-full text-left px-8 py-8 transition-all duration-300 group ${i === activeFeature
                            ? 'bg-brand-primary/5 border-l-2 border-brand-primary'
                            : 'bg-transparent border-l-2 border-transparent hover:bg-white/[0.02]'
                            }`}
                        >
                          <div className="text-mono text-[9px] uppercase tracking-[0.35em] mb-2 font-bold" style={{ color: i === activeFeature ? 'var(--color-brand-primary, #8da34a)' : 'var(--color-text-muted, #555)' }}>
                            {f.tag}
                          </div>
                          <div className={`text-lg font-black uppercase italic tracking-tight transition-colors ${i === activeFeature ? 'text-text-primary' : 'text-text-muted group-hover:text-text-secondary'
                            }`}>{f.label}</div>
                          <div className={`text-xs mt-2 leading-relaxed transition-colors ${i === activeFeature ? 'text-text-secondary opacity-80' : 'text-text-muted opacity-50'
                            }`}>{f.short}</div>
                        </button>
                      ))}
                    </div>

                    {/* Right: Active Panel */}
                    <AnimatePresence mode="wait">
                      <Motion.div
                        key={activeFeature}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.3 }}
                        className="flex flex-col"
                      >
                        {/* Panel Header */}
                        <div className="px-12 py-8 border-b border-border-muted bg-bg-surface/30 flex items-center justify-between">
                          <div>
                            <div className="text-mono text-[9px] text-brand-primary uppercase tracking-[0.4em] mb-2">{active.tag} / PROTOCOL_ACTIVE</div>
                            <h3 className="text-3xl md:text-4xl font-black uppercase italic tracking-tight text-text-primary">{active.label}.</h3>
                          </div>
                          <div className="w-2 h-2 rounded-full bg-brand-primary animate-pulse" />
                        </div>

                        {/* Panel Body */}
                        <div className="flex flex-col lg:flex-row flex-1">
                          {/* Description + Stats */}
                          <div className="lg:w-1/2 p-12 space-y-8 border-r border-border-muted">
                            <p className="text-text-secondary leading-relaxed text-lg font-medium opacity-80">{active.desc}</p>
                            <div className="grid grid-cols-1 gap-4">
                              {active.stats.map((s, i) => (
                                <div key={i} className="flex items-center justify-between py-3 border-b border-border-muted/50">
                                  <span className="text-mono text-[10px] text-text-muted uppercase tracking-wider">{s.label}</span>
                                  <span className="text-sm font-black text-brand-primary italic">{s.val}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Visual */}
                          <div className="lg:w-1/2 bg-black/30 relative min-h-[280px]">
                            <div className="absolute inset-0 cyber-grid opacity-10" />
                            <div className="relative h-full">{active.visual}</div>
                            {/* Corner markers */}
                            <div className="absolute top-3 left-3 w-5 h-5 border-t border-l border-brand-primary/30" />
                            <div className="absolute bottom-3 right-3 w-5 h-5 border-b border-r border-brand-primary/30" />
                          </div>
                        </div>
                      </Motion.div>
                    </AnimatePresence>
                  </div>
                );
              })()}
            </div>
          </section>

          {/* Comparison Section */}
          <section className="px-6 py-40 lg:px-12 relative overflow-hidden border-t border-border-subtle">
            <div className="max-w-7xl mx-auto">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-16 mb-24">
                <div className="max-w-xl">
                  <div className="text-[10px] text-brand-primary font-black uppercase tracking-[0.4em] mb-4">The Advantage</div>
                  <h2 className="text-5xl md:text-7xl font-black text-text-primary tracking-tighter leading-[0.9] uppercase italic mb-8">
                    Content <br /> Optimization.
                  </h2>
                  <p className="text-lg text-text-secondary font-medium leading-relaxed opacity-80">
                    See the difference between a standard draft and an AI-enhanced profile optimized for success.
                  </p>
                </div>

                <div className="flex gap-6">
                  <div className="px-8 py-6 bg-bg-surface border border-border-muted rounded-3xl flex items-center gap-6 shadow-xl shadow-black/20">
                    <div className="text-4xl font-black text-brand-primary italic leading-none">High</div>
                    <div className="text-[10px] text-text-muted uppercase font-black tracking-widest leading-tight">Impact <br /> Optimization</div>
                  </div>
                </div>
              </div>

              <div className="grid lg:grid-cols-2 gap-2 transform lg:scale-95">
                <Motion.div
                  initial="hidden"
                  whileInView="visible"
                  whileHover="reveal"
                  viewport={{ once: true }}
                  variants={{
                    hidden: { opacity: 0, x: -30 },
                    visible: { opacity: 0.5, x: 0, filter: 'grayscale(1)' },
                    reveal: { opacity: 1, x: 0, filter: 'grayscale(0)' }
                  }}
                  transition={{ duration: 0.7 }}
                  className="relative group bg-bg-surface border border-border-muted p-10 font-mono text-[10px] space-y-6 overflow-hidden"
                >
                  <div className="absolute top-0 right-0 p-4 border-l border-b border-border-muted bg-bg-secondary text-[8px] uppercase tracking-widest text-text-muted">
                    Manual_Draft_Raw
                  </div>

                  <div className="relative w-full h-full min-h-[400px]">
                    <Motion.img
                      variants={{
                        hidden: { filter: 'blur(16px)' },
                        visible: { filter: 'blur(16px)' },
                        reveal: { filter: 'blur(0px)' }
                      }}
                      transition={{ duration: 0.6 }}
                      src="/resume-example.png"
                      alt="Standard Resume Draft"
                      className="w-full h-full object-cover"
                    />

                    {/* Hover Prompt */}
                    <Motion.div
                      variants={{
                        hidden: { opacity: 1 },
                        visible: { opacity: 1 },
                        reveal: { opacity: 0 }
                      }}
                      className="absolute inset-0 flex items-center justify-center p-6 text-center"
                    >
                      <div className="bg-black/60 px-4 py-2 border border-white/10 backdrop-blur-md rounded">
                        <span className="text-mono text-[8px] text-text-muted uppercase tracking-[0.3em] animate-pulse">
                          [ACTION_REQUIRED] <br /> MOUSE_OVER_TO_SCAN
                        </span>
                      </div>
                    </Motion.div>
                  </div>

                  {/* Warning Overlay */}
                  <Motion.div
                    variants={{
                      hidden: { opacity: 0 },
                      visible: { opacity: 0 },
                      reveal: { opacity: 1 }
                    }}
                    transition={{ duration: 0.5 }}
                    className="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none"
                  >
                    <Motion.div
                      variants={{
                        hidden: { opacity: 0, scale: 0.8, y: 10 },
                        visible: { opacity: 0, scale: 0.8, y: 10 },
                        reveal: { opacity: 1, scale: 1, y: 0, transition: { delay: 0.3 } }
                      }}
                      className="text-mono text-[10px] text-red-500 font-bold uppercase tracking-[0.5em] px-6 py-4 bg-black border border-red-500/50 flex flex-col items-center gap-2 shadow-[0_0_50px_rgba(239,68,68,0.2)]"
                    >
                      <span className="text-[8px] opacity-70">âš  IDENTIFIED GAPS</span>
                      <span className="text-sm font-black italic">NON-ATS FRIENDLY</span>
                      <div className="w-full h-px bg-red-500/20 mt-1" />
                      <span className="text-[7px] tracking-widest opacity-50">ATS_REJECTION_LIKELY</span>
                    </Motion.div>
                  </Motion.div>

                  {/* Diagnostic Scan Line */}
                  <Motion.div
                    animate={{ top: ['-10%', '110%'] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                    className="absolute left-0 right-0 h-1 bg-red-500/10 blur-[2px] pointer-events-none"
                  />
                </Motion.div>

                <Motion.div
                  initial="hidden"
                  whileInView="visible"
                  whileHover="reveal"
                  viewport={{ once: true }}
                  variants={{
                    hidden: { opacity: 0, x: 30 },
                    visible: { opacity: 0.6, x: 0 },
                    reveal: { opacity: 1, x: 0 }
                  }}
                  transition={{ duration: 0.7 }}
                  className="relative group bg-bg-surface border border-brand-primary/30 p-10 font-mono text-[10px] space-y-6 overflow-hidden shadow-[0_40px_100px_-20px_rgba(141,163,74,0.15)]"
                >
                  <div className="absolute top-0 right-0 p-4 border-l border-b border-brand-primary/30 bg-brand-primary/10 text-[8px] uppercase tracking-widest text-brand-primary font-bold">
                    AI_ENHANCED_V1
                  </div>

                  <div className="relative w-full h-full min-h-[400px]">
                    <Motion.img
                      variants={{
                        hidden: { filter: 'blur(16px)' },
                        visible: { filter: 'blur(16px)' },
                        reveal: { filter: 'blur(0px)' }
                      }}
                      transition={{ duration: 0.6 }}
                      src="/resume-optimized.png"
                      alt="AI Optimized Resume"
                      className="w-full h-full object-cover"
                    />

                    {/* Hover Prompt */}
                    <Motion.div
                      variants={{
                        hidden: { opacity: 1 },
                        visible: { opacity: 1 },
                        reveal: { opacity: 0 }
                      }}
                      className="absolute inset-0 flex items-center justify-center p-6 text-center"
                    >
                      <div className="bg-brand-primary/10 px-4 py-2 border border-brand-primary/20 backdrop-blur-md rounded">
                        <span className="text-mono text-[8px] text-brand-primary uppercase tracking-[0.3em] animate-pulse">
                          [ACTION_REQUIRED] <br /> MOUSE_OVER_TO_OPTIMIZE
                        </span>
                      </div>
                    </Motion.div>
                  </div>

                  {/* Success Overlay */}
                  <Motion.div
                    variants={{
                      hidden: { opacity: 0 },
                      visible: { opacity: 0 },
                      reveal: { opacity: 1 }
                    }}
                    transition={{ duration: 0.5 }}
                    className="absolute inset-0 flex items-center justify-center bg-brand-primary/5 pointer-events-none"
                  >
                    <Motion.div
                      variants={{
                        hidden: { opacity: 0, scale: 0.8, y: 10 },
                        visible: { opacity: 0, scale: 0.8, y: 10 },
                        reveal: { opacity: 1, scale: 1, y: 0, transition: { delay: 0.3 } }
                      }}
                      className="text-mono text-[10px] text-brand-primary font-bold uppercase tracking-[0.5em] px-6 py-4 bg-black border border-brand-primary/50 flex flex-col items-center gap-2 shadow-[0_0_50_rgba(141,163,74,0.3)]"
                    >
                      <span className="text-[8px] opacity-70">âœ“ NEURAL OPTIMIZED</span>
                      <span className="text-sm font-black italic">ATS FRIENDLY</span>
                      <div className="w-full h-px bg-brand-primary/20 mt-1" />
                      <span className="text-[7px] tracking-widest opacity-50">ATS_COMPLIANT_V4.2</span>
                    </Motion.div>
                  </Motion.div>

                  {/* Case Study Corner (Only visible when revealed via variants) */}
                  <Motion.div
                    variants={{
                      hidden: { opacity: 0 },
                      visible: { opacity: 0 },
                      reveal: { opacity: 1 }
                    }}
                    className="absolute bottom-4 left-4 flex gap-4 bg-black/50 p-2 rounded backdrop-blur-sm border border-brand-primary/20"
                  >
                    <div className="text-mono text-[7px] text-text-muted">
                      PARSING_STABILITY: <span className="text-brand-primary font-bold">STABLE</span>
                    </div>
                    <div className="text-mono text-[7px] text-text-muted">
                      KEYWORD_DENSITY: <span className="text-brand-primary font-bold">OPTIMAL</span>
                    </div>
                  </Motion.div>

                  {/* Persistent Scanning Beam effect */}
                  <Motion.div
                    animate={{ top: ['-10%', '110%'] }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
                    className="absolute left-0 right-0 h-1 bg-brand-primary/20 blur-sm pointer-events-none"
                  />
                </Motion.div>
              </div>
            </div>
          </section>

          {/* CTA Section */}
          <section className="px-6 py-32 lg:px-12 relative border-t border-border-subtle">
            <div className="max-w-5xl mx-auto">
              <div className="relative p-1 w-full bg-gradient-to-br from-brand-primary/20 to-transparent rounded-[3rem] overflow-hidden">
                <div className="bg-bg-primary rounded-[2.9rem] px-8 py-24 md:p-32 text-center relative overflow-hidden">
                  <div className="relative z-10 space-y-12">
                    <h2 className="text-6xl md:text-9xl font-black text-text-primary tracking-tight leading-[0.85] uppercase italic">
                      Ready to <br /> <span className="text-brand-primary">Elevate?</span>
                    </h2>
                    <p className="text-xl text-text-secondary font-medium max-w-lg mx-auto leading-relaxed opacity-80">
                      Join thousands of professionals securing interviews with top-tier companies.
                    </p>
                    <div className="pt-8">
                      <Link
                        to="/signup"
                        className="group relative px-16 py-6 bg-brand-primary text-black rounded-2xl font-black text-xl uppercase tracking-widest transition-all duration-300 hover:scale-105 active:scale-95 inline-flex items-center gap-6 shadow-2xl shadow-brand-primary/20"
                      >
                        <span>Get Started Now</span>
                        <svg className="w-8 h-8 group-hover:translate-x-2 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* System Footer */}
          <footer className="relative z-10 py-24 bg-bg-primary">
            <div className="max-w-7xl mx-auto px-6 border-t border-border-subtle pt-24">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-16 lg:gap-24">
                {/* Logo & Desc */}
                <div className="md:col-span-4 space-y-8">
                  <Link to="/" className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-brand-primary rounded-xl flex items-center justify-center">
                      <svg className="w-6 h-6 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <span className="text-2xl font-black text-text-primary tracking-tighter uppercase italic">RA.SYS</span>
                  </Link>
                  <p className="text-sm text-text-secondary leading-relaxed font-medium">
                    Precision AI infrastructure for the modern executive search. High-density optimization for high-stakes career placement.
                  </p>
                </div>

                {/* Technical Links */}
                <div className="md:col-span-5 grid grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div className="text-mono text-[10px] text-brand-primary font-bold uppercase tracking-[0.4em]">Core_Modules</div>
                    <div className="flex flex-col gap-4 text-sm font-bold text-text-muted">
                      <a href="#" className="hover:text-text-primary transition-colors">Career_Audit</a>
                      <a href="#" className="hover:text-text-primary transition-colors">Smart_Sync</a>
                      <a href="#" className="hover:text-text-primary transition-colors">ATS_Check</a>
                    </div>
                  </div>
                  <div className="space-y-6">
                    <div className="text-mono text-[10px] text-brand-primary font-bold uppercase tracking-[0.4em]">Security</div>
                    <div className="flex flex-col gap-4 text-sm font-bold text-text-muted">
                      <a href="#" className="hover:text-text-primary transition-colors">Privacy_Protocol</a>
                      <a href="#" className="hover:text-text-primary transition-colors">Data_Sovereignty</a>
                      <a href="#" className="hover:text-text-primary transition-colors">API_Access</a>
                    </div>
                  </div>
                </div>

                {/* System Specs */}
                <div className="md:col-span-3 space-y-6 p-6 bg-bg-surface border border-border-muted rounded-2xl">
                  <div className="text-mono text-[8px] text-text-muted uppercase tracking-widest">System_Specs</div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-[10px] font-mono">
                      <span className="text-text-muted">VERSION:</span>
                      <span className="text-text-primary">1.0.0-BETA</span>
                    </div>
                    <div className="flex justify-between text-[10px] font-mono">
                      <span className="text-text-muted">UPTIME:</span>
                      <span className="text-brand-primary">SECURE</span>
                    </div>
                    <div className="flex justify-between text-[10px] font-mono">
                      <span className="text-text-muted">LOC:</span>
                      <span className="text-text-primary">US_EAST</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-24 pt-8 border-t border-border-subtle flex flex-col md:flex-row items-center justify-between gap-8">
                <div className="text-mono text-[8px] text-text-muted uppercase tracking-[0.5em]">
                  Â© 2026 ResumeAgent_Systems // All Protocols Reserved
                </div>
                <div className="flex gap-8 text-mono text-[8px] text-text-muted font-bold">
                  <span>AUTHORIZED_ACCESS_ONLY</span>
                </div>
              </div>
            </div>
          </footer>
        </div>
      </div>
    </>
  );
}
