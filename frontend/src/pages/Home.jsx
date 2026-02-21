import React from "react";
import { Link } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "../components/ui/card";
import { Sparkles, FileText, Target, PenTool } from "lucide-react";
import { motion } from "framer-motion";

export default function Home() {
    return (
        <div className="min-h-screen bg-primary flex flex-col font-sans">
            {/* Hero Section */}
            <section className="flex-1 flex flex-col items-center justify-center pt-32 pb-24 px-6 text-center">

                {/* Top Badge */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-50 border border-red-100 text-brand text-xs font-bold uppercase tracking-wider mb-8"
                >
                    <span className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse"></span>
                    AI-Powered Optimization
                </motion.div>

                {/* Main Headline */}
                <motion.h1
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="max-w-4xl mx-auto text-5xl md:text-7xl font-extrabold text-primary leading-[1.1] tracking-tight mb-8"
                >
                    Land your dream job <br className="hidden md:block" />
                    with a <span className="text-brand">perfect resume.</span>
                </motion.h1>

                {/* Subheadline */}
                <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="max-w-2xl mx-auto text-lg md:text-xl text-secondary mb-12"
                >
                    Upload your resume, paste the job description, and let our
                    agent optimize it for maximum ATS score and recruiter impact.
                </motion.p>

                {/* CTAs */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="flex flex-col sm:flex-row items-center gap-4 mb-20"
                >
                    <Button asChild size="lg" className="w-full sm:w-auto h-14 px-8 rounded-full text-base">
                        <Link to="/register">
                            Optimize My Resume
                            <Sparkles className="w-4 h-4 ml-2" />
                        </Link>
                    </Button>
                    <Button asChild variant="outline" size="lg" className="w-full sm:w-auto h-14 px-8 rounded-full text-base font-semibold shadow-sm border-gray-200">
                        <a href="#how-it-works">See How It Works</a>
                    </Button>
                </motion.div>

                {/* Stats */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.4 }}
                    className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 max-w-2xl mx-auto w-full"
                >
                    <Card className="flex-1 w-full p-6 text-center border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                        <div className="text-3xl font-extrabold text-primary mb-1">3x</div>
                        <div className="text-xs font-semibold text-muted uppercase tracking-wider">More Interviews</div>
                    </Card>
                    <Card className="flex-1 w-full p-6 text-center border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                        <div className="text-3xl font-extrabold text-primary mb-1">10K+</div>
                        <div className="text-xs font-semibold text-muted uppercase tracking-wider">Resumes Optimized</div>
                    </Card>
                </motion.div>

            </section>

            {/* Features Section Outline (Simple) */}
            <section id="features" className="py-24 px-6 bg-surface border-t border-gray-100">
                <div className="max-w-6xl mx-auto text-center">
                    <h2 className="text-3xl md:text-5xl font-extrabold text-primary mb-6">
                        Everything you need to stand out
                    </h2>
                    <p className="max-w-2xl mx-auto text-lg text-secondary mb-16">
                        A multi-agent workflow that handles every aspect of resume optimization.
                    </p>

                    <div className="grid md:grid-cols-3 gap-8 text-left">
                        <FeatureCard
                            icon={<Target className="w-6 h-6" />}
                            title="Job-Resume Matching"
                            description="Our AI analyzes the job description and instantly calculates your match percentage."
                        />
                        <FeatureCard
                            icon={<FileText className="w-6 h-6" />}
                            title="ATS Scoring"
                            description="Get a comprehensive score across formatting, keywords, and readability."
                        />
                        <FeatureCard
                            icon={<PenTool className="w-6 h-6" />}
                            title="Iterative Refinement"
                            description="The agent rewrites bullet points to highlight impact and ensure they pass ATS filters."
                        />
                    </div>
                </div>
            </section>
        </div>
    );
}

function FeatureCard({ icon, title, description }) {
    return (
        <Card className="border-gray-100 shadow-sm hover:-translate-y-1 transition-transform duration-300 rounded-3xl overflow-hidden">
            <CardHeader className="p-8 pb-4">
                <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center text-brand mb-6">
                    {icon}
                </div>
                <CardTitle className="text-xl font-bold text-primary">{title}</CardTitle>
            </CardHeader>
            <CardContent className="px-8 pb-8 text-secondary leading-relaxed">
                {description}
            </CardContent>
        </Card>
    );
}
