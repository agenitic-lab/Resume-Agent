import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { motion as Motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { GoogleLogin } from '@react-oauth/google';
import { googleAuth, isAuthenticated, getCachedCurrentUser, removeToken } from '../services/api';

export default function Auth() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        if (isAuthenticated()) {
            const cached = getCachedCurrentUser();
            if (cached) {
                const dest = cached.role === 'admin' ? '/admin/dashboard' : '/dashboard';
                navigate(dest, { replace: true });
            } else {
                removeToken();
            }
        }
    }, [navigate]);

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        if (params.get('expired') === 'true') {
            toast.error('Your session has expired. Please sign in again.', { id: 'session-expired' });
            navigate(location.pathname, { replace: true });
        }
    }, [location.search, navigate]);

    const handleGoogleSuccess = async (credentialResponse) => {
        setLoading(true);
        setError('');
        try {
            const response = await googleAuth(credentialResponse.credential);
            toast.success('Signed in successfully!');
            const destination = response?.user?.role === 'admin' ? '/admin/dashboard' : '/dashboard';
            setTimeout(() => navigate(destination, { replace: true }), 500);
        } catch (err) {
            const message = err.message || 'Sign-in failed. Please try again.';
            setError(message);
            toast.error(message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <Helmet>
                <title>Sign In — Resiko | AI Resume Optimizer</title>
                <meta name="description" content="Sign in to Resiko with your Google account. Optimize your resume with AI, check ATS scores, and build professional resumes." />
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
                            <h1 className="text-2xl font-bold text-primary mb-2">Welcome to Resiko</h1>
                            <p className="text-secondary text-sm">Sign in with Google to get started</p>
                        </div>

                        {error && (
                            <div className="mb-6 p-4 bg-red-50 text-red-600 text-sm font-medium rounded-xl border border-red-100">
                                {error}
                            </div>
                        )}

                        <div className="flex justify-center">
                            <div className="w-full max-w-75 mx-auto">
                                {loading ? (
                                    <div className="flex items-center justify-center h-11 border border-gray-200 rounded-lg">
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
                                        width="300"
                                    />
                                )}
                            </div>
                        </div>

                        <p className="text-center text-xs text-gray-400 mt-8 leading-relaxed">
                            By continuing, you agree to our Terms of Service and Privacy Policy.
                        </p>
                    </Motion.div>
                </div>
            </div>
        </>
    );
}
