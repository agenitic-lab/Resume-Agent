import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion as Motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { GoogleLogin } from '@react-oauth/google';
import { login, googleAuth, isAuthenticated } from '../services/api';
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Eye, EyeOff } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (isAuthenticated()) {
      // Don't redirect here – ProtectedRoute will handle role-based routing
      navigate('/dashboard', { replace: true });
    }

    const params = new URLSearchParams(location.search);
    if (params.get('expired') === 'true') {
      toast.error('Your session has expired. Please log in again.', { id: 'session-expired' });
      navigate(location.pathname, { replace: true });
    }
  }, [navigate, location]);

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      const response = await googleAuth(credentialResponse.credential);
      toast.success('Login successful!');
      // Always redirect based on role — never use `from` to prevent cross-role navigation
      const destination = response?.user?.role === 'admin' ? '/admin/dashboard' : '/dashboard';
      setTimeout(() => navigate(destination, { replace: true }), 500);
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

    if (!email.toLowerCase().endsWith('@gmail.com')) {
      setError('Only @gmail.com addresses are allowed');
      return;
    }
    setLoading(true);
    try {
      const response = await login(email, password);
      toast.success('Login successful!');
      // Always redirect based on role — never use `from` to prevent cross-role navigation
      const destination = response?.user?.role === 'admin' ? '/admin/dashboard' : '/dashboard';
      setTimeout(() => navigate(destination, { replace: true }), 500);
    } catch (err) {
      setError(err.message || 'Login failed');
      toast.error(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-primary flex flex-col pt-20">
      <div className="flex-1 flex items-center justify-center p-6">
        <Motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-white border border-gray-100 rounded-3xl p-8 sm:p-10 shadow-sm"
        >
          <div className="mb-8 text-center">
            {/* Logo */}
            <Link to="/" className="inline-flex items-center justify-center w-12 h-12 bg-brand rounded-xl mb-6 text-white shadow-sm" style={{ backgroundColor: 'var(--color-brand-primary)' }}>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </Link>
            <h2 className="text-2xl font-bold text-primary mb-2">Welcome back</h2>
            <p className="text-secondary text-sm">Sign in to your account</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 text-red-600 text-sm font-medium rounded-xl border border-red-100">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-secondary ml-1">Email</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="h-12 rounded-xl"
                required
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center ml-1">
                <label className="text-sm font-semibold text-secondary">Password</label>
                <Link to="/forgot-password" className="text-sm font-medium text-brand hover:underline">Forgot?</Link>
              </div>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="h-12 rounded-xl pr-12"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-1"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-xl font-bold mt-2"
            >
              {loading ? 'Authenticating...' : 'Sign In'}
            </Button>

            <div className="relative flex items-center py-4">
              <div className="flex-grow border-t border-gray-100" />
              <span className="px-4 text-xs font-medium text-gray-400 uppercase tracking-wider">or</span>
              <div className="flex-grow border-t border-gray-100" />
            </div>

            <div className="flex justify-center">
              <div className="w-full max-w-[240px]">
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={() => toast.error('Google Auth Failed')}
                  theme="outline"
                  shape="rectangular"
                  size="large"
                  text="continue_with"
                  width="240"
                />
              </div>
            </div>

            <p className="text-center text-sm text-secondary pt-2">
              New user? <Link to="/signup" className="text-brand font-semibold hover:underline">Create an account</Link>
            </p>
          </form>
        </Motion.div>
      </div>
    </div>
  );
}
