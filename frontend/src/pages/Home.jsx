import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';

const Home = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles = [];
    const particleCount = 80;

    class Particle {
      constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.vx = (Math.random() - 0.5) * 0.5;
        this.vy = (Math.random() - 0.5) * 0.5;
        this.radius = Math.random() * 2;
      }

      update() {
        this.x += this.vx;
        this.y += this.vy;

        if (this.x < 0 || this.x > canvas.width) this.vx *= -1;
        if (this.y < 0 || this.y > canvas.height) this.vy *= -1;
      }

      draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(34, 211, 238, 0.3)';
        ctx.fill();
      }
    }

    for (let i = 0; i < particleCount; i++) {
      particles.push(new Particle());
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      particles.forEach((particle, i) => {
        particle.update();
        particle.draw();

        particles.slice(i + 1).forEach(otherParticle => {
          const dx = particle.x - otherParticle.x;
          const dy = particle.y - otherParticle.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < 120) {
            ctx.beginPath();
            ctx.strokeStyle = `rgba(34, 211, 238, ${0.15 * (1 - distance / 120)})`;
            ctx.lineWidth = 0.5;
            ctx.moveTo(particle.x, particle.y);
            ctx.lineTo(otherParticle.x, otherParticle.y);
            ctx.stroke();
          }
        });
      });

      requestAnimationFrame(animate);
    };

    animate();

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <>
      <style>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes pulseSlow {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }

        .animate-slide-up {
          animation: slideUp 0.8s ease-out forwards;
          opacity: 0;
        }

        .delay-100 { animation-delay: 0.1s; }
        .delay-200 { animation-delay: 0.2s; }
        .delay-300 { animation-delay: 0.3s; }
        .delay-400 { animation-delay: 0.4s; }

        .animate-pulse-slow {
          animation: pulseSlow 3s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }

        .animate-float {
          animation: float 6s ease-in-out infinite;
        }

        /* Smooth scrolling */
        html {
          scroll-behavior: smooth;
        }

        /* Custom scrollbar */
        ::-webkit-scrollbar {
          width: 10px;
        }

        ::-webkit-scrollbar-track {
          background: #1e293b;
        }

        ::-webkit-scrollbar-thumb {
          background: #22d3ee;
          border-radius: 5px;
        }

        ::-webkit-scrollbar-thumb:hover {
          background: #06b6d4;
        }

        ::selection {
          background-color: rgba(34, 211, 238, 0.3);
          color: #ffffff;
        }

        * {
          scrollbar-width: thin;
          scrollbar-color: #22d3ee #1e293b;
        }
      `}</style>

      <div className="relative min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 overflow-hidden">
        {/* Animated Background Canvas */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full opacity-40"
        />

        {/* Gradient Orbs */}
        <div 
          className="absolute top-20 -left-40 w-96 h-96 bg-cyan-500/20 rounded-full animate-pulse-slow"
          style={{ filter: 'blur(100px)' }}
        />
        <div 
          className="absolute bottom-20 -right-40 w-96 h-96 bg-blue-500/20 rounded-full animate-pulse-slow"
          style={{ filter: 'blur(100px)', animationDelay: '0.7s' }}
        />

        
        {/* Hero Section */}
        <section className="relative z-10 px-6 pt-20 pb-32 lg:px-12">
          <div className="max-w-7xl mx-auto">
            <div className="text-center max-w-4xl mx-auto space-y-8">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-500/10 border border-cyan-500/30 rounded-full backdrop-blur-sm animate-slide-up">
                <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
                <span className="text-cyan-400 text-sm font-medium">Powered by Agentic AI</span>
              </div>

              {/* Main Headline */}
              <h1 className="text-5xl md:text-7xl font-black leading-tight animate-slide-up delay-100">
                <span className="bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
                  Transform Your Resume
                </span>
                <br />
                <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-cyan-500 bg-clip-text text-transparent">
                  Beat the ATS
                </span>
              </h1>

              {/* Subheadline */}
              <p className="text-xl md:text-2xl text-slate-400 max-w-3xl mx-auto leading-relaxed animate-slide-up delay-200">
                Upload your resume and job description to get AI-powered improvements with detailed decision tracking and real-time ATS scoring.
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4 animate-slide-up delay-300">
                <Link
                  to="/signup"
                  className="group relative px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl font-bold text-lg shadow-2xl transition-all duration-300 hover:scale-105 overflow-hidden"
                  style={{ boxShadow: '0 20px 60px -15px rgba(34, 211, 238, 0.5)' }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-blue-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <span className="relative flex items-center gap-2">
                    <span>Start Optimizing Free</span>
                    <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </span>
                </Link>
                <a
                  href="#demo"
                  className="group px-8 py-4 bg-slate-800/50 backdrop-blur-sm text-white rounded-xl font-bold text-lg border border-slate-700 hover:border-cyan-500/50 transition-all duration-300 hover:scale-105"
                >
                  <span className="flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Watch Demo</span>
                  </span>
                </a>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-8 pt-16 max-w-2xl mx-auto animate-slide-up delay-400">
                <div className="text-center">
                  <div className="text-4xl font-black bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                    +22
                  </div>
                  <div className="text-slate-500 text-sm mt-2 font-medium">Avg. Score Boost</div>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-black bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                    &lt;60s
                  </div>
                  <div className="text-slate-500 text-sm mt-2 font-medium">Processing Time</div>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-black bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                    95%
                  </div>
                  <div className="text-slate-500 text-sm mt-2 font-medium">Success Rate</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="relative z-10 px-6 py-24 lg:px-12">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-black text-white mb-4">
                Agentic AI Features
              </h2>
              <p className="text-xl text-slate-400">
                Not just another resume generator. Real decision-making intelligence.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                {
                  icon: (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  ),
                  title: "Goal-Driven Planning",
                  description: "AI agent analyzes job requirements and creates targeted improvement plans with expected score gains."
                },
                {
                  icon: (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  ),
                  title: "Deterministic ATS Scoring",
                  description: "Rule-based scoring algorithm (not LLM opinion) ensures consistent, reliable results every time."
                },
                {
                  icon: (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  ),
                  title: "Iterative Optimization",
                  description: "Agent decides when to iterate or stop based on diminishing returns, preventing over-optimization."
                },
                {
                  icon: (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  ),
                  title: "Decision Audit Trail",
                  description: "Every modification is justified and logged. Complete transparency into what changed and why."
                },
                {
                  icon: (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                  ),
                  title: "Surgical Modifications",
                  description: "Only justified changes applied. Strong sections preserved, weak sections enhanced with precision."
                },
                {
                  icon: (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  ),
                  title: "Cover Letter Generation",
                  description: "Context-aware cover letters highlighting your resume's strengths aligned with job requirements."
                }
              ].map((feature, index) => (
                <div
                  key={index}
                  className="group relative p-8 bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-2xl hover:border-cyan-500/50 transition-all duration-300 hover:scale-105"
                  style={{
                    boxShadow: '0 0 0 0 rgba(34, 211, 238, 0)',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = '0 20px 40px -10px rgba(34, 211, 238, 0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = '0 0 0 0 rgba(34, 211, 238, 0)';
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-blue-500/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="relative">
                    <div className="w-16 h-16 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-xl flex items-center justify-center text-cyan-400 mb-6 group-hover:scale-110 transition-transform duration-300">
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        {feature.icon}
                      </svg>
                    </div>
                    <h3 className="text-xl font-bold text-white mb-3">{feature.title}</h3>
                    <p className="text-slate-400 leading-relaxed">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section id="how-it-works" className="relative z-10 px-6 py-24 lg:px-12">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-black text-white mb-4">
                How It Works
              </h2>
              <p className="text-xl text-slate-400">
                10-step agentic workflow with decision gates
              </p>
            </div>

            <div className="relative">
              {/* Connection Line */}
              <div 
                className="absolute left-8 top-12 bottom-12 w-0.5 bg-gradient-to-b from-cyan-500 via-blue-500 to-cyan-500 hidden md:block"
              />

              <div className="space-y-8">
                {[
                  { step: "01", title: "Job Analysis", desc: "Extract required skills, keywords, and seniority level from job description" },
                  { step: "02", title: "Resume Parsing", desc: "Identify missing skills, weak sections, and strong sections to preserve" },
                  { step: "03", title: "Initial Scoring", desc: "Calculate baseline ATS score using deterministic algorithm" },
                  { step: "04", title: "Planning", desc: "AI creates targeted improvement plan with expected gains" },
                  { step: "05", title: "Decision Gate 1", desc: "Agent decides if modification is worthwhile (skip if expected gain < 5)" },
                  { step: "06", title: "Modification", desc: "Apply only justified changes while preserving strong sections" },
                  { step: "07", title: "Re-scoring", desc: "Calculate new ATS score and improvement delta" },
                  { step: "08", title: "Decision Gate 2", desc: "Agent decides to iterate or finalize based on diminishing returns" },
                  { step: "09", title: "Cover Letter", desc: "Generate context-aware cover letter highlighting strengths" },
                  { step: "10", title: "Finalization", desc: "Save complete state, decisions, and generate PDF" }
                ].map((item, index) => (
                  <div key={index} className="relative flex items-start gap-6 group">
                    <div 
                      className="flex-shrink-0 w-16 h-16 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center text-white font-black text-lg shadow-lg group-hover:scale-110 transition-transform duration-300 z-10"
                      style={{ boxShadow: '0 10px 40px -10px rgba(34, 211, 238, 0.5)' }}
                    >
                      {item.step}
                    </div>
                    <div className="flex-1 pt-2">
                      <h3 className="text-xl font-bold text-white mb-2 group-hover:text-cyan-400 transition-colors duration-200">
                        {item.title}
                      </h3>
                      <p className="text-slate-400 leading-relaxed">
                        {item.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="relative z-10 px-6 py-24 lg:px-12">
          <div className="max-w-4xl mx-auto">
            <div 
              className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-cyan-500 via-blue-600 to-cyan-600 p-12 md:p-16 shadow-2xl"
              style={{ boxShadow: '0 20px 60px -15px rgba(34, 211, 238, 0.5)' }}
            >
              <div 
                className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full"
                style={{ filter: 'blur(100px)' }}
              />
              <div 
                className="absolute bottom-0 left-0 w-96 h-96 bg-blue-900/20 rounded-full"
                style={{ filter: 'blur(100px)' }}
              />
              
              <div className="relative text-center space-y-6">
                <h2 className="text-4xl md:text-5xl font-black text-white">
                  Ready to Beat the ATS?
                </h2>
                <p className="text-xl text-cyan-50 max-w-2xl mx-auto">
                  Join thousands of job seekers who've improved their resume scores by an average of 22 points.
                </p>
                <div className="pt-4">
                  <Link
                    to="/signup"
                    className="inline-flex items-center gap-2 px-10 py-5 bg-white text-cyan-600 rounded-xl font-bold text-lg hover:bg-slate-100 transition-all duration-300 hover:scale-105 shadow-2xl"
                  >
                    <span>Start Free Trial</span>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </Link>
                </div>
                <p className="text-cyan-100 text-sm">
                  No credit card required • 3 free optimizations
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="relative z-10 px-6 py-12 lg:px-12 border-t border-slate-800">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 md:gap-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <span className="text-lg font-bold text-white">ResumeAgent</span>
              </div>
              
              <div className="flex items-center gap-6 text-slate-400 text-sm">
                <a href="#" className="hover:text-cyan-400 transition-colors duration-200">Privacy</a>
                <a href="#" className="hover:text-cyan-400 transition-colors duration-200">Terms</a>
                <a href="#" className="hover:text-cyan-400 transition-colors duration-200">Contact</a>
              </div>

              <div className="text-slate-500 text-sm">
                © 2026 ResumeAgent. All rights reserved.
              </div>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
};

export default Home;