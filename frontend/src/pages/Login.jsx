import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { motion as Motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { GoogleLogin } from '@react-oauth/google';
import { login, googleAuth, isAuthenticated, getCachedCurrentUser, removeToken } from '../services/api';
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Eye, EyeOff } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (isAuthenticated()) {
      // Use cached user to avoid API call that triggers global redirect race
      const cached = getCachedCurrentUser();
      if (cached) {
        const dest = cached.role === 'admin' ? '/admin/dashboard' : '/dashboard';
        navigate(dest, { replace: true });
      } else {
        // No cached user with a token in storage = stale token, clean up
        removeToken();
      }
    }
  }, [navigate]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('expired') === 'true') {
      toast.error('Your session has expired. Please log in again.', { id: 'session-expired' });
      navigate(location.pathname, { replace: true });
    }
  }, [location.search, navigate]);

  const handleGoogleSuccess = async (credentialResponse) => {
    setGoogleLoading(true);
    setError('');
    try {
      const response = await googleAuth(credentialResponse.credential);
      toast.success('Signed in with Google!');
      const destination = response?.user?.role === 'admin' ? '/admin/dashboard' : '/dashboard';
      setTimeout(() => navigate(destination, { replace: true }), 500);
    } catch (err) {
      const message = err.message || 'Google sign-in failed. Please try again.';
      setError(message);
      toast.error(message);
    } finally {
      setGoogleLoading(false);
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
    <>
    <Helmet>
      <title>Log In — Resiko | AI Resume Optimizer</title>
      <meta name="description" content="Sign in to your Resiko account to optimize your resume with AI, check ATS scores, and build professional resumes." />
      <link rel="canonical" href="https://resiko.app/login" />
    </Helmet>
    <div className="min-h-screen bg-primary flex flex-col pt-16 sm:pt-20 overflow-x-hidden">
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <Motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-white border border-gray-100 rounded-2xl sm:rounded-3xl p-5 sm:p-8 md:p-10 shadow-sm"
        >
          <div className="mb-8 text-center pt-4">
            <h1 className="text-2xl font-bold text-primary mb-2">Welcome back</h1>
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
                placeholder="name@gmail.com"
                className="h-12 rounded-xl"
                required
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center ml-1">
                <label className="text-sm font-semibold text-secondary">Password</label>
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
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>

            <div className="relative flex items-center py-4">
              <div className="flex-grow border-t border-gray-100" />
              <span className="px-4 text-xs font-medium text-gray-400 uppercase tracking-wider">or</span>
              <div className="flex-grow border-t border-gray-100" />
            </div>

            <div className="flex justify-center">
              <div className="w-full max-w-[240px] mx-auto">
                {googleLoading ? (
                  <div className="flex items-center justify-center h-[44px] border border-gray-200 rounded-lg">
                    <svg className="animate-spin h-5 w-5 text-brand" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span className="ml-2 text-sm text-secondary">Signing in...</span>
                  </div>
                ) : (
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={() => {
                    toast.error('Google sign-in failed. Please check your popup blocker and try again.');
                    setError('Google sign-in failed. If a popup was blocked, please allow popups for this site.');
                  }}
                  ux_mode="popup"
                  theme="outline"
                  shape="rectangular"
                  size="large"
                  text="continue_with"
                  width="240"
                />
                )}
              </div>
            </div>

            <p className="text-center text-sm text-secondary pt-2">
              New user? <Link to="/signup" className="text-brand font-semibold hover:underline">Create an account</Link>
            </p>
          </form>
        </Motion.div>
      </div>
    </div>
    </>
  );
}
