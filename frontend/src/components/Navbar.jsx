import React, { useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion as Motion } from "framer-motion";
import { Button } from "./ui/button";

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  const navLinks = [
    { label: "Features", href: "#features" },
    { label: "How It Works", href: "#how-it-works" },
    { label: "FAQ", href: "#faq" },
  ];

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b" style={{ borderColor: 'var(--color-border-subtle)' }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-10 h-20 flex items-center justify-between gap-8">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group shrink-0">
            <img src="/resiko-logo.png" alt="Resiko" className="h-4 sm:h-5 md:h-6 lg:h-7 w-auto scale-100 group-hover:scale-105 transition-transform duration-200" />
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
              <span className={`block w-5 h-0.5 bg-text-primary transition-all duration-300 ${mobileOpen ? 'rotate-45 translate-y-2' : ''}`} />
              <span className={`block w-5 h-0.5 bg-text-primary transition-all duration-300 ${mobileOpen ? 'opacity-0' : ''}`} />
              <span className={`block w-5 h-0.5 bg-text-primary transition-all duration-300 ${mobileOpen ? '-rotate-45 -translate-y-2' : ''}`} />
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {mobileOpen && (
            <Motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="md:hidden overflow-hidden bg-primary border-t border-border-subtle"
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
                  className="w-full text-center py-3 text-sm font-semibold text-secondary border border-gray-200 rounded-lg hover:bg-secondary"
                >
                  Log in
                </Link>
                <Button asChild className="w-full" size="lg">
                  <Link to="/register" onClick={() => setMobileOpen(false)}>Get Started</Link>
                </Button>
              </div>
            </Motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Spacer */}
      <div className="h-20" />
    </>
  );
}
