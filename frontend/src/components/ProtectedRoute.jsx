import React, { useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { isAuthenticated, getCurrentUser, getCachedCurrentUser } from '../services/api';

export default function ProtectedRoute({ children }) {
    const location = useLocation();

    const [user, setUser] = useState(getCachedCurrentUser());
    const [loading, setLoading] = useState(!user && isAuthenticated());

    useEffect(() => {
        if (!user && isAuthenticated()) {
            getCurrentUser()
                .then(userData => {
                    setUser(userData);
                })
                .catch(error => {
                    console.error('Failed to fetch user in ProtectedRoute', error);
                })
                .finally(() => {
                    setLoading(false);
                });
        } else if (user) {
            setLoading(false); // If user is already cached, no need to load
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
