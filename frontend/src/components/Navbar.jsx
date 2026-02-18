import React, { useState } from "react";
import { Link } from "react-router-dom";
import { motion, useScroll, useMotionValueEvent, AnimatePresence } from "framer-motion";

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
      <motion.nav
        layout
        animate={{
          width: isScrolled ? "auto" : "100%",
          borderRadius: isScrolled ? "100px" : "0px",
          backgroundColor: isScrolled ? "rgba(255, 255, 255, 0.95)" : "rgba(255, 255, 255, 0.6)",
          marginTop: isScrolled ? "1.25rem" : "0rem",
          border: isScrolled ? "1px solid rgba(0, 0, 0, 0.05)" : "1px solid rgba(0, 0, 0, 0.03)",
          boxShadow: isScrolled ? "0 20px 40px -15px rgba(0, 0, 0, 0.05)" : "none",
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
        <motion.div layout className="flex items-center gap-2.5 group shrink-0">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-[#606c38] rounded-lg flex items-center justify-center transition-transform group-hover:scale-110 shadow-lg shadow-[#606c38]/20 translate-z-0">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <AnimatePresence mode="wait">
              {!isScrolled && (
                <motion.span
                  key="logo-text"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2 }}
                  className="text-lg font-black text-neutral-900 tracking-tighter group-hover:text-[#606c38] transition-colors"
                >
                  ResumeAgent
                </motion.span>
              )}
            </AnimatePresence>
          </Link>
        </motion.div>

        {/* Navigation Links */}
        <motion.div layout className="hidden md:flex items-center gap-8">
          {["Home", "Features"].map((item) => (
            <a
              key={item}
              href={`#${item.toLowerCase().replace(" ", "-")}`}
              className="text-neutral-500 hover:text-[#606c38] font-black text-[10px] uppercase tracking-[0.2em] transition-colors"
            >
              {item}
            </a>
          ))}
        </motion.div>

        {/* Auth Actions */}
        <motion.div layout className="flex items-center gap-6 shrink-0">
          <Link
            to="/login"
            className="hidden sm:block text-neutral-500 hover:text-[#606c38] font-black text-[10px] uppercase tracking-[0.2em] transition-colors"
          >
            Sign In
          </Link>
          <Link
            to="/register"
            className="px-6 py-2.5 rounded-full bg-[#606c38] text-white font-black text-[11px] uppercase tracking-wider hover:bg-[#4a532b] transition-all active:scale-95 shadow-xl shadow-[#606c38]/10 translate-z-0"
          >
            Get Started
          </Link>
        </motion.div>
      </motion.nav>
    </div>
  );
}
