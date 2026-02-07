import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Settings() {
    const navigate = useNavigate();

    // Profile state
    const [fullName, setFullName] = useState('resumeagent2026');
    const [email, setEmail] = useState('resumeagent2026@gmail.com');

    // Notifications state
    const [emailNotifications, setEmailNotifications] = useState(true);
    const [tipsRecommendations, setTipsRecommendations] = useState(true);

    // Security state
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const handleSaveProfile = () => {
        // API call to save profile
        console.log('Saving profile:', { fullName, email });
    };

    const handleUpdatePassword = () => {
        if (newPassword !== confirmPassword) {
            alert('Passwords do not match');
            return;
        }
        // API call to update password
        console.log('Updating password');
    };

    const handleSignOut = () => {
        // API call to sign out
        navigate('/login');
    };

    const handleDeleteAccount = () => {
        if (window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
            // API call to delete account
            console.log('Deleting account');
            navigate('/');
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-8">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-4xl font-bold text-white mb-2">Settings</h1>
                    <p className="text-slate-400">Manage your account settings and preferences</p>
                </div>

                <div className="space-y-6">
                    {/* Profile Section */}
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                        <div className="flex items-center gap-2 mb-2">
                            <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            <h2 className="text-xl font-bold text-white">Profile</h2>
                        </div>
                        <p className="text-slate-500 text-sm mb-6">Your personal information</p>

                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <div>
                                <label className="block text-white font-medium mb-2">Full Name</label>
                                <input
                                    type="text"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500 transition-colors"
                                />
                            </div>
                            <div>
                                <label className="block text-white font-medium mb-2">Email</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500 transition-colors"
                                />
                            </div>
                        </div>

                        <button
                            onClick={handleSaveProfile}
                            className="px-6 py-3 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg font-semibold transition-all"
                        >
                            Save Changes
                        </button>
                    </div>

                    {/* Notifications Section */}
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                        <div className="flex items-center gap-2 mb-2">
                            <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                            </svg>
                            <h2 className="text-xl font-bold text-white">Notifications</h2>
                        </div>
                        <p className="text-slate-500 text-sm mb-6">Configure how you receive updates</p>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-white font-medium">Email Notifications</h3>
                                    <p className="text-slate-400 text-sm">Receive updates about your optimization runs</p>
                                </div>
                                <button
                                    onClick={() => setEmailNotifications(!emailNotifications)}
                                    className={`relative w-14 h-7 rounded-full transition-colors ${emailNotifications ? 'bg-cyan-500' : 'bg-slate-700'
                                        }`}
                                >
                                    <div
                                        className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform ${emailNotifications ? 'translate-x-7' : 'translate-x-0'
                                            }`}
                                    />
                                </button>
                            </div>

                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-white font-medium">Tips & Recommendations</h3>
                                    <p className="text-slate-400 text-sm">Get tips for improving your resume</p>
                                </div>
                                <button
                                    onClick={() => setTipsRecommendations(!tipsRecommendations)}
                                    className={`relative w-14 h-7 rounded-full transition-colors ${tipsRecommendations ? 'bg-cyan-500' : 'bg-slate-700'
                                        }`}
                                >
                                    <div
                                        className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform ${tipsRecommendations ? 'translate-x-7' : 'translate-x-0'
                                            }`}
                                    />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Security Section */}
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                        <div className="flex items-center gap-2 mb-2">
                            <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                            <h2 className="text-xl font-bold text-white">Security</h2>
                        </div>
                        <p className="text-slate-500 text-sm mb-6">Manage your account security</p>

                        <div className="space-y-4 mb-6">
                            <div>
                                <label className="block text-white font-medium mb-2">Current Password</label>
                                <input
                                    type="password"
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500 transition-colors"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-white font-medium mb-2">New Password</label>
                                    <input
                                        type="password"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500 transition-colors"
                                    />
                                </div>
                                <div>
                                    <label className="block text-white font-medium mb-2">Confirm Password</label>
                                    <input
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500 transition-colors"
                                    />
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={handleUpdatePassword}
                            className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-semibold transition-all"
                        >
                            Update Password
                        </button>
                    </div>

                    {/* Danger Zone Section */}
                    <div className="bg-slate-900/50 border border-red-900/50 rounded-xl p-6">
                        <h2 className="text-xl font-bold text-red-400 mb-2">Danger Zone</h2>
                        <p className="text-slate-500 text-sm mb-6">Irreversible actions</p>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                                <div>
                                    <h3 className="text-white font-medium">Sign Out</h3>
                                    <p className="text-slate-400 text-sm">Sign out from your account</p>
                                </div>
                                <button
                                    onClick={handleSignOut}
                                    className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-all flex items-center gap-2"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                    </svg>
                                    <span>Sign Out</span>
                                </button>
                            </div>

                            <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                                <div>
                                    <h3 className="text-white font-medium">Delete Account</h3>
                                    <p className="text-slate-400 text-sm">Permanently delete your account and all data</p>
                                </div>
                                <button
                                    onClick={handleDeleteAccount}
                                    className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-all"
                                >
                                    Delete Account
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
