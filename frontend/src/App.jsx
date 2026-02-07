import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import NewOptimization from "./pages/NewOptimization";
import OptimizationResults from "./pages/OptimizationResults";
import RunHistory from "./pages/RunHistory";
import Settings from "./pages/Settings";
import Results from "./pages/Results";
import NotFound from "./pages/NotFound";
import Navbar from "./components/Navbar";
import DashboardLayout from "./components/DashboardLayout";

function AppContent() {
  const location = useLocation();
  const isDashboardRoute = location.pathname.startsWith('/dashboard') ||
    location.pathname.startsWith('/new-optimization') ||
    location.pathname.startsWith('/optimization') ||
    location.pathname.startsWith('/history') ||
    location.pathname.startsWith('/templates') ||
    location.pathname.startsWith('/settings');

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {!isDashboardRoute && <Navbar />}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/signup" element={<Register />} />

        {/* Dashboard Routes with Sidebar */}
        <Route path="/dashboard" element={<DashboardLayout><Dashboard /></DashboardLayout>} />
        <Route path="/new-optimization" element={<DashboardLayout><NewOptimization /></DashboardLayout>} />
        <Route path="/optimization/details" element={<DashboardLayout><OptimizationResults /></DashboardLayout>} />
        <Route path="/optimization/:id" element={<DashboardLayout><OptimizationResults /></DashboardLayout>} />
        <Route path="/history" element={<DashboardLayout><RunHistory /></DashboardLayout>} />
        <Route path="/templates" element={<DashboardLayout><div className="p-8"><h1 className="text-3xl font-bold">Templates</h1></div></DashboardLayout>} />
        <Route path="/settings" element={<DashboardLayout><Settings /></DashboardLayout>} />

        <Route path="/results/:id" element={<Results />} />
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

