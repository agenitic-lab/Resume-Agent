import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { GoogleLogin } from '@react-oauth/google';
import { register, googleAuth, isAuthenticated } from '../services/api';
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Eye, EyeOff } from "lucide-react";

export default function Register() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated()) {
      navigate('/dashboard', { replace: true });
    }
  }, [navigate]);

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
    <div className="min-h-screen bg-primary flex flex-col pt-20">
      <div className="flex-1 flex items-center justify-center p-6">
        <motion.div
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
            <h2 className="text-2xl font-bold text-primary mb-2">Create Account</h2>
            <p className="text-secondary text-sm">Your optimized resume starts here</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-secondary ml-1">Work Email</label>
              <Input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="name@company.com"
                className="h-12 rounded-xl"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-secondary ml-1">Secure Password</label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
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
              {formData.password && (
                <div className="flex gap-2 px-1 mt-2">
                  {[passwordValidation.hasMinLength, passwordValidation.hasUpperCase, passwordValidation.hasNumber].map((valid, i) => (
                    <div key={i} className={`h-1.5 flex-1 rounded-full ${valid ? 'bg-brand' : 'bg-gray-200'}`} />
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-secondary ml-1">Confirm Password</label>
              <div className="relative">
                <Input
                  type={showConfirmPassword ? "text" : "password"}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="h-12 rounded-xl pr-12"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-1"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-xl font-bold mt-4"
            >
              {loading ? 'Processing...' : 'Create Account'}
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
                  text="signup_with"
                  width="240"
                />
              </div>
            </div>

            <p className="text-center text-sm text-secondary pt-2">
              Already a member? <Link to="/login" className="text-brand font-semibold hover:underline">Sign In</Link>
            </p>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
