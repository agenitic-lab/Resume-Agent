import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import NewOptimization from "./pages/NewOptimization";
import OptimizationResults from "./pages/OptimizationResults";
import RunHistory from "./pages/RunHistory";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import Navbar from "./components/Navbar";
import DashboardLayout from "./components/DashboardLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import ResumeBuilder from "./pages/ResumeBuilder";

function AppContent() {
  const location = useLocation();

  const isDashboardRoute = location.pathname.startsWith('/dashboard') ||
    location.pathname.startsWith('/new-optimization') ||
    location.pathname.startsWith('/optimization') ||
    location.pathname.startsWith('/history') ||
    location.pathname.startsWith('/templates') ||
    location.pathname.startsWith('/settings') ||
    location.pathname.startsWith('/resume-builder');

  const showNavbar = !isDashboardRoute;

  return (
    <div className="min-h-screen bg-primary text-primary">
      {showNavbar && <Navbar />}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/signup" element={<Register />} />

        {/* Dashboard Routes with Sidebar */}
        <Route path="/dashboard" element={<ProtectedRoute><DashboardLayout><Dashboard /></DashboardLayout></ProtectedRoute>} />
        <Route path="/new-optimization" element={<ProtectedRoute><DashboardLayout><NewOptimization /></DashboardLayout></ProtectedRoute>} />
        <Route path="/optimization/:id" element={<ProtectedRoute><DashboardLayout><OptimizationResults /></DashboardLayout></ProtectedRoute>} />
        <Route path="/history" element={<ProtectedRoute><DashboardLayout><RunHistory /></DashboardLayout></ProtectedRoute>} />
        <Route path="/templates" element={<ProtectedRoute><DashboardLayout><div className="p-12"><h1 className="text-4xl font-black text-primary mb-2 italic tracking-tighter uppercase">Templates</h1><p className="text-secondary text-[10px] font-black uppercase tracking-widest">Library of optimized resume frameworks - Coming Soon</p></div></DashboardLayout></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><DashboardLayout><Settings /></DashboardLayout></ProtectedRoute>} />
        <Route path="/resume-builder" element={<ProtectedRoute><DashboardLayout><ResumeBuilder /></DashboardLayout></ProtectedRoute>} />

        <Route path="*" element={<NotFound />} />
      </Routes>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;
