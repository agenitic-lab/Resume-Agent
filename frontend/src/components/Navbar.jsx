import React, { useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "./ui/button";

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  const navLinks = [
    { label: "Features", href: "#features" },
    { label: "How It Works", href: "#how-it-works" },
  ];

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b" style={{ borderColor: 'var(--color-border-subtle)' }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-10 h-20 flex items-center justify-between gap-8">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group shrink-0">
            <div className="w-9 h-9 bg-brand rounded-[10px] flex items-center justify-center text-white scale-100 group-hover:scale-105 transition-transform duration-200 shadow-sm" style={{ backgroundColor: 'var(--color-brand-primary)' }}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <span className="text-xl font-bold tracking-tight text-primary">
              ResumeAgent
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-sm font-medium text-secondary hover:text-primary transition-colors duration-200"
              >
                {link.label}
              </a>
            ))}
            <Link
              to="/pricing"
              className="text-sm font-medium text-secondary hover:text-primary transition-colors duration-200"
            >
              Pricing
            </Link>
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-4 shrink-0">
            <Link
              to="/login"
              className="hidden sm:block text-sm font-medium text-secondary hover:text-primary transition-colors duration-200"
            >
              Log in
            </Link>
            <Button asChild className="rounded-full px-6 shadow-sm hover:-translate-y-0.5 transition-all duration-200">
              <Link to="/register">Get Started</Link>
            </Button>

            {/* Mobile Hamburger */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden flex flex-col justify-center items-center w-8 h-8 gap-1.5"
            >
              <span className={`block w-5 h-0.5 bg-gray-800 transition-all duration-300 ${mobileOpen ? 'rotate-45 translate-y-2' : ''}`} />
              <span className={`block w-5 h-0.5 bg-gray-800 transition-all duration-300 ${mobileOpen ? 'opacity-0' : ''}`} />
              <span className={`block w-5 h-0.5 bg-gray-800 transition-all duration-300 ${mobileOpen ? '-rotate-45 -translate-y-2' : ''}`} />
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="md:hidden overflow-hidden bg-white border-t" style={{ borderColor: 'var(--color-border-subtle)' }}
            >
              <div className="p-6 flex flex-col gap-4">
                {navLinks.map((link) => (
                  <a
                    key={link.label}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className="text-base font-medium text-secondary hover:text-primary py-2"
                  >
                    {link.label}
                  </a>
                ))}
                <div className="h-px bg-gray-100 my-2" />
                <Link
                  to="/login"
                  onClick={() => setMobileOpen(false)}
                  className="w-full text-center py-3 text-sm font-semibold text-secondary border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  Log in
                </Link>
                <Button asChild className="w-full" size="lg">
                  <Link to="/register" onClick={() => setMobileOpen(false)}>Get Started</Link>
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Spacer */}
      <div className="h-20" />
    </>
  );
}
