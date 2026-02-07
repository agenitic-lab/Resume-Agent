import { Link } from "react-router-dom";

export default function Navbar() {
  return (
    <nav className="flex items-center justify-between px-8 py-4 border-b border-slate-800">
      <Link to="/" className="text-xl font-bold text-cyan-400">
        ResumeAgent
      </Link>

      <div className="space-x-4">
        <Link
          to="/login"
          className="text-slate-300 hover:text-white transition"
        >
          Sign In
        </Link>
        <Link
          to="/register"
          className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-600 transition"
        >
          Get Started
        </Link>
      </div>
    </nav>
  );
}
