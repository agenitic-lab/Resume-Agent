import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { createSupportTicket, getCurrentUser } from '../services/api';
import { Skeleton } from '../components/ui/skeleton';

export default function Support() {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        subject: '',
        message: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchUser = async () => {
            setIsLoading(true);
            try {
                const userData = await getCurrentUser();
                setUser(userData);
                // Auto-populate form with user data
                setFormData(prev => ({
                    ...prev,
                    name: userData.full_name || userData.email?.split('@')[0] || '',
                    email: userData.email || ''
                }));
            } catch (error) {
                console.error("Failed to fetch user:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchUser();
    }, []);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const result = await createSupportTicket(formData);
            // Show success message regardless of email status - the important thing is the ticket was saved
            toast.success('Your ticket has been submitted successfully! Our team will review and respond to you as soon as possible.');
            setFormData(prev => ({ ...prev, subject: '', message: '' }));
        } catch (error) {
            toast.error(error.message || 'Failed to submit ticket. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-primary text-primary p-4 md:p-8">
            <div className="max-w-5xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-primary mb-2 tracking-tight">Support Center</h1>
                    <p className="text-gray-500 text-sm">
                        Need help? We're here to assist you. Fill out the form below and our support team will get back to you promptly.
                    </p>
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-surface border border-gray-200 rounded-[2.5rem] p-6 md:p-10 shadow-xl shadow-black/5 mb-8 overflow-hidden relative"
            >
                <form className="space-y-6" onSubmit={handleSubmit}>
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-primary mb-2">Name</label>
                        {isLoading ? (
                            <Skeleton className="w-full h-12 rounded-xl" />
                        ) : (
                            <input
                                id="name"
                                name="name"
                                type="text"
                                required
                                value={formData.name}
                                onChange={handleChange}
                                className="w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand text-primary bg-white"
                                placeholder="Your full name"
                            />
                        )}
                    </div>

                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-primary mb-2">Email Address</label>
                        {isLoading ? (
                            <Skeleton className="w-full h-12 rounded-xl" />
                        ) : (
                            <input
                                id="email"
                                name="email"
                                type="email"
                                required
                                value={formData.email}
                                onChange={handleChange}
                                disabled={!!user?.email}
                                className="w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand text-primary bg-white disabled:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-75"
                                placeholder="your@email.com"
                            />
                        )}
                    </div>

                    <div>
                        <label htmlFor="subject" className="block text-sm font-medium text-primary mb-2">Subject</label>
                        {isLoading ? (
                            <Skeleton className="w-full h-12 rounded-xl" />
                        ) : (
                            <input
                                id="subject"
                                name="subject"
                                type="text"
                                required
                                minLength={3}
                                value={formData.subject}
                                onChange={handleChange}
                                className="w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand text-primary bg-white"
                                placeholder="How can we help you?"
                            />
                        )}
                    </div>

                    <div>
                        <label htmlFor="message" className="block text-sm font-medium text-primary mb-2">Message</label>
                        {isLoading ? (
                            <Skeleton className="w-full h-32 rounded-xl" />
                        ) : (
                            <textarea
                                id="message"
                                name="message"
                                rows="5"
                                required
                                minLength={10}
                                value={formData.message}
                                onChange={handleChange}
                                className="w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand text-primary bg-white resize-none"
                                placeholder="Please describe your issue or question in detail..."
                            />
                        )}
                    </div>

                    <div>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className={`w-full bg-brand hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-xl transition-colors duration-200 ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''
                                }`}
                        >
                            {isSubmitting ? (
                                <span className="flex items-center justify-center">
                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Sending...
                                </span>
                            ) : (
                                'Send Message'
                            )}
                        </button>
                    </div>
                </form>
                </motion.div>

                {/* Additional Help Section */}
                <div className="mt-8 p-6 bg-gray-50 rounded-xl border border-gray-100">
                    <h3 className="text-lg font-semibold text-primary mb-3">Need Quick Help?</h3>
                    <div className="space-y-2 text-sm text-secondary">
                        <p>• <strong>Optimization Issues:</strong> Check your Groq API key in Settings</p>
                        <p>• <strong>PDF Problems:</strong> Ensure your resume is a valid PDF file under 10MB</p>
                        <p>• <strong>Account Questions:</strong> Contact us through this form</p>
                        <p>• <strong>Technical Issues:</strong> Include error messages in your message above</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
