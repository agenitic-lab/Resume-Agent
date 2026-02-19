import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { GoogleLogin } from '@react-oauth/google';
import { login, googleAuth, isAuthenticated } from '../services/api';

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
    ctx.fillStyle = 'rgba(96, 108, 56, 0.4)'; // Olive Accent
    ctx.fill();
  }
}

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const canvasRef = useRef(null);

  useEffect(() => {
    if (isAuthenticated()) {
      navigate('/dashboard', { replace: true });
    }

    // Check for expired session parameter
    const params = new URLSearchParams(location.search);
    if (params.get('expired') === 'true') {
      toast.error('Your session has expired. Please log in again.', { id: 'session-expired' });
      // Remove the parameter from URL without refreshing
      navigate(location.pathname, { replace: true });
    }
  }, [navigate, location]);

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
            ctx.strokeStyle = `rgba(96, 108, 56, ${opacity})`; // Olive Accent
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

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      await googleAuth(credentialResponse.credential);
      toast.success('Login successful!');
      const from = location.state?.from || '/dashboard';
      setTimeout(() => navigate(from, { replace: true }), 500);
    } catch (err) {
      toast.error(err.message || 'Google login failed');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }
    setLoading(true);
    try {
      await login(email, password);
      toast.success('Login successful!');
      const from = location.state?.from || '/dashboard';
      setTimeout(() => navigate(from, { replace: true }), 500);
    } catch (err) {
      setError(err.message || 'Login failed');
      toast.error(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-[#f5f5f5] text-neutral-900 overflow-hidden font-sans selection:bg-[#606c38]/30 pt-20">
      {/* Background Layer */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 opacity-100"
          style={{
            backgroundImage: 'linear-gradient(to right, rgba(0, 0, 0, 0.03) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 0, 0, 0.03) 1px, transparent 1px)',
            backgroundSize: '60px 60px'
          }}
        />
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full opacity-60 mix-blend-multiply" />
      </div>

      <div className="relative z-10 flex min-h-screen">
        {/* Left Side: Editorial Branding */}
        <div className="hidden lg:flex lg:w-1/2 flex-col justify-center px-24 space-y-8 border-r border-neutral-200 bg-white/50 backdrop-blur-md">
          <Motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-4"
          >
            <div className="w-12 h-12 bg-[#606c38] rounded-xl flex items-center justify-center shadow-lg shadow-olive-500/20">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <span className="text-3xl font-black tracking-tighter uppercase italic text-neutral-900">ResumeAgent</span>
          </Motion.div>

          <Motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="space-y-4"
          >
            <h1 className="text-6xl font-black leading-[0.9] tracking-tighter text-neutral-900">
              Executive <br />
              <span className="text-[#606c38]">Access.</span>
            </h1>
            <p className="text-neutral-500 text-lg font-medium leading-relaxed max-w-sm">
              Log in to your private AI command center and command attention in the job market.
            </p>
          </Motion.div>

          <div className="pt-8 space-y-4">
            {['100% Traceable Decisions', 'Neural Pattern Extraction', 'Real-time ATS Scoring'].map((text, i) => (
              <Motion.div
                key={text}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + i * 0.1 }}
                className="flex items-center gap-3 text-neutral-400 text-[10px] font-black uppercase tracking-[0.2em]"
              >
                <div className="w-1 h-4 bg-[#606c38]/60" />
                {text}
              </Motion.div>
            ))}
          </div>
        </div>

        {/* Right Side: Auth Form */}
        <div className="flex-1 flex items-center justify-center p-8">
          <Motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md bg-white border border-neutral-200 rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden group"
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-[#606c38]/20" />

            <div className="mb-10">
              <h2 className="text-3xl font-black text-neutral-900 mb-2 italic tracking-tighter">Welcome back.</h2>
              <p className="text-neutral-500 text-xs font-black uppercase tracking-widest">Sign in to your account</p>
            </div>

            {error && (
              <Motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-bold rounded-xl"
              >
                {error}
              </Motion.div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full px-6 py-4 bg-neutral-50 border border-neutral-100 rounded-2xl text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-[#606c38]/50 transition-all font-medium text-sm"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center ml-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Password</label>
                  <Link to="/forgot-password" size="sm" className="text-[9px] font-black uppercase tracking-widest text-[#606c38] hover:text-[#4a532b]">Forgot?</Link>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-6 py-4 bg-neutral-50 border border-neutral-100 rounded-2xl text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-[#606c38]/50 transition-all font-medium text-sm"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-6 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-900 transition-colors"
                  >
                    {showPassword ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268-2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268-2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-[#606c38] text-white font-black text-[10px] uppercase tracking-[0.2em] rounded-2xl hover:bg-[#4a532b] transition-all active:scale-95 shadow-xl shadow-olive-500/10 disabled:opacity-50"
              >
                {loading ? 'Authenticating...' : 'Sign In Engine'}
              </button>

              <div className="relative flex items-center py-4">
                <div className="flex-grow border-t border-neutral-100" />
                <span className="px-4 text-[8px] font-black uppercase tracking-[0.3em] text-neutral-300">or use secure channel</span>
                <div className="flex-grow border-t border-neutral-100" />
              </div>

              <div className="flex justify-center">
                <div className="w-full max-w-[200px] opacity-60 hover:opacity-100 transition-all">
                  <GoogleLogin
                    onSuccess={handleGoogleSuccess}
                    onError={() => toast.error('Google Auth Failed')}
                    theme="outline"
                    shape="pill"
                    text="continue_with"
                  />
                </div>
              </div>

              <p className="text-center text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400 font-medium">
                New user? <Link to="/signup" className="text-[#606c38] hover:text-[#4a532b]">Initialize Account</Link>
              </p>
            </form>
          </Motion.div>
        </div>
      </div>
    </div>
  );
}
