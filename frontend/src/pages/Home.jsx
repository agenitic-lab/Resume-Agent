import React from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { motion as Motion } from "framer-motion";
import { Button } from "../components/ui/button";
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "../components/ui/card";
import { Sparkles, FileText, Target, PenTool, Upload, Cpu, Download, ChevronDown, ChevronUp, CheckCircle, BarChart3, Zap } from "lucide-react";

const faqData = [
    {
        q: "What is Resiko?",
        a: "Resiko is an AI-powered resume optimization platform that analyzes your resume against specific job descriptions, scores ATS compatibility, and automatically rewrites content to maximize your chances of landing interviews."
    },
    {
        q: "How does ATS resume optimization work?",
        a: "Our AI extracts keywords and requirements from the job description, compares them against your resume, and identifies gaps. It then rewrites bullet points to include missing keywords while keeping them natural and readable — so your resume passes Applicant Tracking Systems."
    },
    {
        q: "Is Resiko free to use?",
        a: "Yes! You can sign up and start optimizing your resume for free. Upload your resume, paste a job description, and get instant ATS scoring and optimization suggestions at no cost."
    },
    {
        q: "What file formats does Resiko support?",
        a: "Resiko supports PDF resume uploads. You can also use our built-in resume builder with professional templates to create ATS-friendly resumes from scratch."
    },
    {
        q: "How is Resiko different from other resume builders?",
        a: "Unlike generic resume builders, Resiko's AI scores and refines your resume against a specific job description. It doesn't just check keywords — it rewrites your content for maximum impact and ATS compatibility."
    }
];

function FAQItem({ question, answer }) {
    const [open, setOpen] = React.useState(false);
    return (
        <div className="border border-gray-100 rounded-2xl overflow-hidden">
            <button
                onClick={() => setOpen(!open)}
                className="w-full flex items-center justify-between p-6 text-left hover:bg-gray-50/50 transition-colors"
                aria-expanded={open}
            >
                <span className="text-base font-semibold text-primary pr-4">{question}</span>
                {open ? <ChevronUp className="w-5 h-5 text-brand shrink-0" /> : <ChevronDown className="w-5 h-5 text-muted shrink-0" />}
            </button>
            {open && (
                <div className="px-6 pb-6 text-secondary leading-relaxed">
                    {answer}
                </div>
            )}
        </div>
    );
}

export default function Home() {
    return (
        <>
            <Helmet>
                <title>Resiko — AI Resume Optimizer | ATS-Friendly Resume Builder</title>
                <meta name="description" content="Optimize your resume with AI for any job description. Get instant ATS scoring, keyword matching, and smart rewrites. Land 3x more interviews with Resiko." />
                <link rel="canonical" href="https://resiko.app/" />
            </Helmet>

            <div className="min-h-screen bg-primary flex flex-col font-sans">
                {/* Hero Section */}
                <section className="flex-1 flex flex-col items-center justify-center pt-32 pb-24 px-6 text-center" aria-label="Hero">

                    {/* Top Badge */}
                    <Motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-50 border border-red-100 text-brand text-xs font-bold uppercase tracking-wider mb-8"
                    >
                        <span className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse"></span>
                        AI-Powered Resume Optimization
                    </Motion.div>

                    {/* Main Headline */}
                    <Motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="max-w-4xl mx-auto text-3xl sm:text-5xl md:text-7xl font-extrabold text-primary leading-[1.1] tracking-tight mb-8"
                    >
                        Build an <span className="text-brand">ATS-friendly resume</span>{" "}
                        <br className="hidden md:block" />
                        that lands interviews.
                    </Motion.h1>

                    {/* Subheadline */}
                    <Motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="max-w-2xl mx-auto text-lg md:text-xl text-secondary mb-12"
                    >
                        Upload your resume, paste any job description, and let Resiko's AI
                        optimize it for maximum ATS score, keyword match, and recruiter impact — in seconds.
                    </Motion.p>

                    {/* CTAs */}
                    <Motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="flex flex-col sm:flex-row items-center gap-4 mb-20"
                    >
                        <Button asChild size="lg" className="w-full sm:w-auto h-14 px-8 rounded-full text-base">
                            <Link to="/register">
                                Optimize My Resume — Free
                                <Sparkles className="w-4 h-4 ml-2" />
                            </Link>
                        </Button>
                        <Button asChild variant="outline" size="lg" className="w-full sm:w-auto h-14 px-8 rounded-full text-base font-semibold shadow-sm border-gray-200">
                            <a href="#how-it-works">See How It Works</a>
                        </Button>
                    </Motion.div>

                    {/* Stats */}
                    <Motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.4 }}
                        className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 max-w-3xl mx-auto w-full"
                    >
                        <Card className="flex-1 w-full p-6 text-center border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                            <div className="text-3xl font-extrabold text-primary mb-1">3x</div>
                            <div className="text-xs font-semibold text-muted uppercase tracking-wider">More Interviews</div>
                        </Card>
                        <Card className="flex-1 w-full p-6 text-center border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                            <div className="text-3xl font-extrabold text-primary mb-1">10K+</div>
                            <div className="text-xs font-semibold text-muted uppercase tracking-wider">Resumes Optimized</div>
                        </Card>
                        <Card className="flex-1 w-full p-6 text-center border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                            <div className="text-3xl font-extrabold text-primary mb-1">95%</div>
                            <div className="text-xs font-semibold text-muted uppercase tracking-wider">ATS Pass Rate</div>
                        </Card>
                    </Motion.div>

                </section>

                {/* Features Section */}
                <section id="features" className="py-24 px-6 bg-surface border-t border-gray-100" aria-label="Features">
                    <div className="max-w-6xl mx-auto text-center">
                        <h2 className="text-3xl md:text-5xl font-extrabold text-primary mb-6">
                            Everything you need to beat the ATS
                        </h2>
                        <p className="max-w-2xl mx-auto text-lg text-secondary mb-16">
                            Our AI handles every aspect of resume optimization — from keyword extraction to content rewriting.
                        </p>

                        <div className="grid md:grid-cols-3 gap-4 sm:gap-8 text-left">
                            <FeatureCard
                                icon={<Target className="w-6 h-6" />}
                                title="Job-Resume Matching"
                                description="Our AI analyzes the job description, extracts key requirements, and instantly calculates your resume match percentage."
                            />
                            <FeatureCard
                                icon={<BarChart3 className="w-6 h-6" />}
                                title="ATS Score Checker"
                                description="Get a comprehensive ATS compatibility score across formatting, keywords, readability, and section structure."
                            />
                            <FeatureCard
                                icon={<PenTool className="w-6 h-6" />}
                                title="Smart Resume Rewriting"
                                description="Our AI rewrites your bullet points to highlight impact, add missing keywords, and ensure they pass ATS filters."
                            />
                            <FeatureCard
                                icon={<FileText className="w-6 h-6" />}
                                title="Resume Builder & Templates"
                                description="Create professional, ATS-friendly resumes from scratch using our curated LaTeX templates — no design skills needed."
                            />
                            <FeatureCard
                                icon={<Zap className="w-6 h-6" />}
                                title="Missing Skills Analysis"
                                description="Discover exactly which skills and keywords you're missing for a specific role, with actionable suggestions to close the gap."
                            />
                            <FeatureCard
                                icon={<CheckCircle className="w-6 h-6" />}
                                title="Cover Letter Generation"
                                description="Auto-generate tailored cover letters that complement your optimized resume and match the job requirements."
                            />
                        </div>
                    </div>
                </section>

                {/* How It Works Section */}
                <section id="how-it-works" className="py-24 px-6 bg-primary border-t border-gray-100" aria-label="How it works">
                    <div className="max-w-5xl mx-auto text-center">
                        <h2 className="text-3xl md:text-5xl font-extrabold text-primary mb-6">
                            How Resiko optimizes your resume
                        </h2>
                        <p className="max-w-2xl mx-auto text-lg text-secondary mb-16">
                            Three simple steps to an ATS-optimized resume tailored to any job posting.
                        </p>

                        <div className="grid md:grid-cols-3 gap-6 sm:gap-12">
                            <StepCard
                                step="1"
                                icon={<Upload className="w-7 h-7" />}
                                title="Upload & Paste"
                                description="Upload your current resume as a PDF and paste the target job description. That's all we need to get started."
                            />
                            <StepCard
                                step="2"
                                icon={<Cpu className="w-7 h-7" />}
                                title="AI Analyzes & Optimizes"
                                description="Our AI scores your resume, identifies keyword gaps, and refines your content for maximum ATS compatibility."
                            />
                            <StepCard
                                step="3"
                                icon={<Download className="w-7 h-7" />}
                                title="Download & Apply"
                                description="Review the optimized resume with detailed scoring breakdown, download the improved version, and apply with confidence."
                            />
                        </div>

                        <div className="mt-16">
                            <Button asChild size="lg" className="h-14 px-10 rounded-full text-base">
                                <Link to="/register">
                                    Start Optimizing — It's Free
                                    <Sparkles className="w-4 h-4 ml-2" />
                                </Link>
                            </Button>
                        </div>
                    </div>
                </section>

                {/* FAQ Section */}
                <section id="faq" className="py-24 px-6 bg-surface border-t border-gray-100" aria-label="Frequently asked questions">
                    <div className="max-w-3xl mx-auto">
                        <h2 className="text-3xl md:text-4xl font-extrabold text-primary mb-4 text-center">
                            Frequently Asked Questions
                        </h2>
                        <p className="text-lg text-secondary mb-12 text-center">
                            Everything you need to know about AI resume optimization and ATS scoring.
                        </p>

                        <div className="space-y-3">
                            {faqData.map((faq, i) => (
                                <FAQItem key={i} question={faq.q} answer={faq.a} />
                            ))}
                        </div>
                    </div>
                </section>

                {/* Final CTA Section */}
                <section className="py-24 px-6 bg-primary border-t border-gray-100 text-center" aria-label="Call to action">
                    <div className="max-w-3xl mx-auto">
                        <h2 className="text-3xl md:text-5xl font-extrabold text-primary mb-6">
                            Ready to land more interviews?
                        </h2>
                        <p className="text-lg text-secondary mb-10 max-w-xl mx-auto">
                            Join thousands of job seekers who use Resiko to build ATS-friendly resumes
                            and get past applicant tracking systems. Free to start, no credit card required.
                        </p>
                        <Button asChild size="lg" className="h-14 px-10 rounded-full text-base">
                            <Link to="/register">
                                Get Started Free
                                <Sparkles className="w-4 h-4 ml-2" />
                            </Link>
                        </Button>
                    </div>
                </section>

                {/* Footer */}
                <footer className="py-10 px-6 bg-surface border-t border-gray-100">
                    <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted">
                        <p>&copy; {new Date().getFullYear()} Resiko. AI-powered resume optimization.</p>
                        <nav className="flex gap-6" aria-label="Footer navigation">
                            <a href="#features" className="hover:text-primary transition-colors">Features</a>
                            <a href="#how-it-works" className="hover:text-primary transition-colors">How It Works</a>
                            <a href="#faq" className="hover:text-primary transition-colors">FAQ</a>
                        </nav>
                    </div>
                </footer>
            </div>
        </>
    );
}

function FeatureCard({ icon, title, description }) {
    return (
        <Card className="border-gray-100 shadow-sm hover:-translate-y-1 transition-transform duration-300 rounded-3xl overflow-hidden">
            <CardHeader className="p-5 sm:p-8 pb-4">
                <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center text-brand mb-4 sm:mb-6">
                    {icon}
                </div>
                <CardTitle className="text-xl font-bold text-primary">{title}</CardTitle>
            </CardHeader>
            <CardContent className="px-5 sm:px-8 pb-5 sm:pb-8 text-secondary leading-relaxed">
                {description}
            </CardContent>
        </Card>
    );
}

function StepCard({ step, icon, title, description }) {
    return (
        <div className="flex flex-col items-center text-center">
            <div className="relative mb-6">
                <div className="w-16 h-16 rounded-2xl bg-brand/10 flex items-center justify-center text-brand">
                    {icon}
                </div>
                <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-brand text-white text-xs font-bold flex items-center justify-center">
                    {step}
                </div>
            </div>
            <h3 className="text-lg font-bold text-primary mb-3">{title}</h3>
            <p className="text-secondary leading-relaxed">{description}</p>
        </div>
    );
}
