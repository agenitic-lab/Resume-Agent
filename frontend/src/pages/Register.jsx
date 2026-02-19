import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { GoogleLogin } from '@react-oauth/google';
import { register, googleAuth, isAuthenticated } from '../services/api';

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

export default function Register() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const canvasRef = useRef(null);

  useEffect(() => {
    if (isAuthenticated()) {
      navigate('/dashboard', { replace: true });
    }
  }, [navigate]);

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
      toast.success('Account created successfully!');
      setTimeout(() => navigate('/dashboard', { replace: true }), 500);
    } catch (err) {
      toast.error(err.message || 'Google signup failed');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.email || !formData.password || !formData.confirmPassword) {
      toast.error('Please fill in all fields');
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      await register(formData.email, formData.password);
      toast.success('Account created successfully!');
      setTimeout(() => navigate('/login'), 1500);
    } catch (err) {
      toast.error(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const passwordValidation = {
    hasMinLength: formData.password.length >= 8,
    hasUpperCase: /[A-Z]/.test(formData.password),
    hasNumber: /[0-9]/.test(formData.password)
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
              Start Your <br />
              <span className="text-[#606c38]">Journey.</span>
            </h1>
            <p className="text-neutral-500 text-lg font-medium leading-relaxed max-w-sm">
              Initialize your professional identity with the world's most advanced AI resume engine.
            </p>
          </Motion.div>

          {/* Stats Bar */}
          <div className="grid grid-cols-2 gap-8 pt-8 border-t border-neutral-200">
            <div>
              <div className="text-3xl font-black text-[#606c38] italic tracking-tighter">85%</div>
              <div className="text-[9px] font-black uppercase tracking-[0.2em] text-neutral-400">Avg. Score Boost</div>
            </div>
            <div>
              <div className="text-3xl font-black text-neutral-900 italic tracking-tighter">10K+</div>
              <div className="text-[9px] font-black uppercase tracking-[0.2em] text-neutral-400">Agents Deployed</div>
            </div>
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
              <h2 className="text-3xl font-black text-neutral-900 mb-2 italic tracking-tighter">Create Account.</h2>
              <p className="text-neutral-500 text-xs font-black uppercase tracking-widest">Deploy your personal AI Agent</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-1">Work Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="name@company.com"
                  className="w-full px-6 py-4 bg-neutral-50 border border-neutral-100 rounded-2xl text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-[#606c38]/50 transition-all font-medium text-sm"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-1">Secure Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
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
                {formData.password && (
                  <div className="flex gap-2 px-1">
                    {[passwordValidation.hasMinLength, passwordValidation.hasUpperCase, passwordValidation.hasNumber].map((valid, i) => (
                      <div key={i} className={`h-1 flex-1 rounded-full ${valid ? 'bg-[#606c38]' : 'bg-neutral-100'}`} />
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-1">Confirm Identity</label>
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="w-full px-6 py-4 bg-neutral-50 border border-neutral-100 rounded-2xl text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-[#606c38]/50 transition-all font-medium text-sm"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-[#606c38] text-white font-black text-[10px] uppercase tracking-[0.2em] rounded-2xl hover:bg-[#4a532b] transition-all active:scale-95 shadow-xl shadow-olive-500/10 disabled:opacity-50"
              >
                {loading ? 'Initializing...' : 'Construct Account'}
              </button>

              <div className="relative flex items-center py-4">
                <div className="flex-grow border-t border-neutral-100" />
                <span className="px-4 text-[8px] font-black uppercase tracking-[0.3em] text-neutral-300">or bridge account</span>
                <div className="flex-grow border-t border-neutral-100" />
              </div>

              <div className="flex justify-center">
                <div className="w-full max-w-[200px] opacity-60 hover:opacity-100 transition-all">
                  <GoogleLogin
                    onSuccess={handleGoogleSuccess}
                    onError={() => toast.error('Google Auth Failed')}
                    theme="outline"
                    shape="pill"
                    text="signup_with"
                  />
                </div>
              </div>

              <p className="text-center text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400 font-medium">
                Member? <Link to="/login" className="text-[#606c38] hover:text-[#4a532b]">Secure Sign In</Link>
              </p>
            </form>
          </Motion.div>
        </div>
      </div>
    </div>
  );
}
