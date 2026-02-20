import React, { useState } from "react";
import { Link } from "react-router-dom";

import { motion as Motion, useScroll, useMotionValueEvent, AnimatePresence } from "framer-motion";

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, "change", (latest) => {
    if (latest > 50) {
      setIsScrolled(true);
    } else {
      setIsScrolled(false);
    }
  });

  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex justify-center pointer-events-none">
      <Motion.nav
        layout
        animate={{
          width: isScrolled ? "auto" : "100%",
          borderRadius: isScrolled ? "100px" : "0px",
          backgroundColor: isScrolled ? "rgba(10, 10, 10, 0.95)" : "rgba(10, 10, 10, 0.4)",
          marginTop: isScrolled ? "1.25rem" : "0rem",
          border: isScrolled ? "1px solid rgba(255, 255, 255, 0.08)" : "1px solid rgba(255, 255, 255, 0.03)",
          boxShadow: isScrolled ? "0 20px 40px -15px rgba(0, 0, 0, 0.4)" : "none",
        }}
        transition={{
          type: "spring",
          stiffness: 150,
          damping: 25,
          mass: 1,
          layout: { duration: 0.4, ease: "easeOut" }
        }}
        style={{
          willChange: "transform, width, border-radius",
          translateZ: 0
        }}
        className={` 
          flex items-center justify-between gap-12 backdrop-blur-[12px] pointer-events-auto overflow-hidden
          ${isScrolled ? "px-8 py-3.5" : "px-8 py-5 w-full"}
        `}
      >
        {/* Logo Section */}
        <Motion.div layout className="flex items-center gap-2.5 group shrink-0">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-brand-primary rounded-lg flex items-center justify-center transition-transform group-hover:scale-110 shadow-lg shadow-brand-primary/20 translate-z-0">
              <svg className="w-5 h-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <AnimatePresence mode="wait">
              {!isScrolled && (
                <Motion.span
                  key="logo-text"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2 }}
                  className="text-lg font-black text-text-primary tracking-tighter group-hover:text-brand-primary transition-colors"
                >
                  ResumeAgent
                </Motion.span>
              )}
            </AnimatePresence>
          </Link>
        </Motion.div>

        {/* Navigation Links */}
        <Motion.div layout className="hidden md:flex items-center gap-8">
          {["Home", "Features"].map((item) => (
            <a
              key={item}
              href={`#${item.toLowerCase().replace(" ", "-")}`}
              className="text-text-secondary hover:text-brand-primary font-black text-[10px] uppercase tracking-[0.2em] transition-colors"
            >
              {item}
            </a>
          ))}
        </Motion.div>

        {/* Auth Actions */}
        <Motion.div layout className="flex items-center gap-6 shrink-0">
          <Link
            to="/login"
            className="hidden sm:block text-text-secondary hover:text-brand-primary font-black text-[10px] uppercase tracking-[0.2em] transition-colors"
          >
            Sign In
          </Link>
          <Link
            to="/register"
            className="px-6 py-2.5 rounded-full bg-brand-primary text-black font-black text-[11px] uppercase tracking-wider hover:bg-brand-hover transition-all active:scale-95 shadow-xl shadow-brand-primary/10 translate-z-0"
          >
            Get Started
          </Link>
        </Motion.div>
      </Motion.nav>
    </div>
  );
}
