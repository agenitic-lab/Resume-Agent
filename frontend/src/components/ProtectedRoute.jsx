import React, { useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { isAuthenticated, getCurrentUser, getCachedCurrentUser, removeToken, getToken, initAuth } from '../services/api';

export default function ProtectedRoute({ children }) {
    const location = useLocation();

    const [user, setUser] = useState(getCachedCurrentUser());
    const [loading, setLoading] = useState(!user && isAuthenticated());

    useEffect(() => {
        if (!user && isAuthenticated()) {
            // If we have the session flag but no in-memory token, bootstrap first
            const bootstrap = getToken() ? Promise.resolve() : initAuth();

            bootstrap
                .then(() => getCurrentUser())
                .then(userData => {
                    setUser(userData);
                })
                .catch(_e => {
                    console.error('Failed to fetch user in ProtectedRoute', _e);
                    removeToken();
                })
                .finally(() => {
                    setLoading(false);
                });
        } else if (user) {
            setLoading(false);
        }
    }, [user]);

    if (!isAuthenticated()) {
        return <Navigate to="/login" state={{ from: location.pathname }} replace />;
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-primary">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-brand"></div>
            </div>
        );
    }

    const isAdminRoute = location.pathname.startsWith('/admin');

    if (user) {
        // If it's a regular user trying to access admin routes, push them back to user dashboard
        if (user.role !== 'admin' && isAdminRoute) {
            return <Navigate to="/dashboard" replace />;
        }

        // If it's an admin trying to access regular user routes, push them to admin dashboard
        const isUserRoute = location.pathname.startsWith('/dashboard') ||
            location.pathname.startsWith('/new-optimization') ||
            location.pathname.startsWith('/optimization') ||
            location.pathname.startsWith('/history') ||
            location.pathname.startsWith('/templates') ||
            location.pathname.startsWith('/settings') ||
            location.pathname.startsWith('/resume-builder') ||
            location.pathname.startsWith('/missing-skills');

        if (user.role === 'admin' && isUserRoute) {
            return <Navigate to="/admin/dashboard" replace />;
        }
    }

    return children;
}
