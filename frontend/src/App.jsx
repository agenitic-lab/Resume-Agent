import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import Home from "./pages/Home";
import Auth from "./pages/Auth";
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
import MissingSkills from "./pages/MissingSkills";
import Templates from "./pages/Templates";
import AdminDashboard from "./pages/AdminDashboard";
import AdminMetrics from "./pages/AdminMetrics";
import AdminUsers from "./pages/AdminUsers";
import AdminActivity from "./pages/AdminActivity";
import AdminTemplates from "./pages/AdminTemplates";
import Maintenance from "./pages/Maintenance";
import Support from "./pages/Support";
import AdminSupport from "./pages/AdminSupport";
import { getMaintenanceStatus, getCurrentUser, isAuthenticated } from "./services/api";

function AppContent() {
  const location = useLocation();
  const [maintenance, setMaintenance] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isTestUser, setIsTestUser] = useState(false);
  const [maintenanceChecked, setMaintenanceChecked] = useState(false);

  const checkMaintenance = async () => {
    try {
      const [status, user] = await Promise.allSettled([
        getMaintenanceStatus(),
        // Only fetch the current user when authenticated — calling this without
        // a token causes a 401 which would otherwise trigger the session-expired
        // redirect even on public routes like /login.
        isAuthenticated() ? getCurrentUser() : Promise.resolve(null),
      ]);
      const active = status.status === 'fulfilled' ? status.value?.active : false;
      const role = user.status === 'fulfilled' ? user.value?.role : null;
      const testUser = user.status === 'fulfilled' ? user.value?.is_test_user : false;
      setMaintenance(active);
      setIsAdmin(role === 'admin');
      setIsTestUser(!!testUser);
    } catch {
      // silently fail — don't block the app
    } finally {
      setMaintenanceChecked(true);
    }
  };

  useEffect(() => {
    checkMaintenance();
  }, [location.pathname]);

  const isDashboardRoute = location.pathname.startsWith('/dashboard') ||
    location.pathname.startsWith('/admin') ||
    location.pathname.startsWith('/new-optimization') ||
    location.pathname.startsWith('/optimization') ||
    location.pathname.startsWith('/history') ||
    location.pathname.startsWith('/templates') ||
    location.pathname.startsWith('/settings') ||
    location.pathname.startsWith('/resume-builder') ||
    location.pathname.startsWith('/missing-skills');

  const showNavbar = !isDashboardRoute;

  // While still checking, show a skeleton to prevent route flash (e.g. 404)
  if (!maintenanceChecked) {
    return (
      <div className="min-h-screen bg-white flex animate-pulse">
        {/* Sidebar skeleton */}
        <div className="w-64 border-r border-gray-100 bg-gray-50 flex flex-col gap-4 p-5 shrink-0">
          <div className="h-8 w-32 bg-gray-200 rounded-lg mb-4" />
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-9 bg-gray-200 rounded-lg" style={{ opacity: 1 - i * 0.1 }} />
          ))}
        </div>
        {/* Main content skeleton */}
        <div className="flex-1 p-8 flex flex-col gap-6">
          <div className="h-8 w-48 bg-gray-200 rounded-lg" />
          <div className="grid grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-28 bg-gray-100 rounded-xl border border-gray-100" />
            ))}
          </div>
          <div className="h-64 bg-gray-100 rounded-xl border border-gray-100" />
          <div className="h-40 bg-gray-100 rounded-xl border border-gray-100" />
        </div>
      </div>
    );
  }

  // Show maintenance page for non-admins when maintenance is active
  const isAdminRoute = location.pathname.startsWith('/admin');
  const isAuthRoute = ['/', '/login', '/register', '/signup'].includes(location.pathname);
  if (maintenanceChecked && maintenance && !isAdmin && !isTestUser && !isAdminRoute && !isAuthRoute) {
    return <Maintenance onRefresh={checkMaintenance} />;
  }

  return (
    <div className="min-h-screen bg-primary text-primary">
      {/* Admin maintenance indicator — fixed so it sits on top */}
      {maintenance && isAdmin && (
        <>
          <div className="fixed top-0 left-0 right-0 z-[9999] bg-amber-500 text-white text-center text-xs font-semibold py-1.5 flex items-center justify-center gap-2">
            <span className="w-2 h-2 bg-white rounded-full animate-pulse inline-block" />
            Maintenance Mode is ACTIVE — users are seeing the maintenance page
          </div>
          {/* Spacer so the fixed bar doesn't overlap page content */}
          <div className="h-7" />
        </>
      )}
      {showNavbar && <Navbar />}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Auth />} />
        <Route path="/register" element={<Navigate to="/login" replace />} />
        <Route path="/signup" element={<Navigate to="/login" replace />} />

        {/* Admin Routes */}
        <Route path="/admin" element={<ProtectedRoute><DashboardLayout><AdminDashboard><AdminMetrics /></AdminDashboard></DashboardLayout></ProtectedRoute>} />
        <Route path="/admin/dashboard" element={<ProtectedRoute><DashboardLayout><AdminDashboard><AdminMetrics /></AdminDashboard></DashboardLayout></ProtectedRoute>} />
        <Route path="/admin/users" element={<ProtectedRoute><DashboardLayout><AdminDashboard><AdminUsers /></AdminDashboard></DashboardLayout></ProtectedRoute>} />
        <Route path="/admin/activity" element={<ProtectedRoute><DashboardLayout><AdminDashboard><AdminActivity /></AdminDashboard></DashboardLayout></ProtectedRoute>} />
        <Route path="/admin/templates" element={<ProtectedRoute><DashboardLayout><AdminDashboard><AdminTemplates /></AdminDashboard></DashboardLayout></ProtectedRoute>} />
        <Route path="/admin/support" element={<ProtectedRoute><DashboardLayout><AdminDashboard><AdminSupport /></AdminDashboard></DashboardLayout></ProtectedRoute>} />

        {/* Dashboard Routes with Sidebar */}
        <Route path="/dashboard" element={<ProtectedRoute><DashboardLayout><Dashboard /></DashboardLayout></ProtectedRoute>} />
        <Route path="/new-optimization" element={<ProtectedRoute><DashboardLayout><NewOptimization /></DashboardLayout></ProtectedRoute>} />
        <Route path="/optimization/:id" element={<ProtectedRoute><DashboardLayout><OptimizationResults /></DashboardLayout></ProtectedRoute>} />
        <Route path="/history" element={<ProtectedRoute><DashboardLayout><RunHistory /></DashboardLayout></ProtectedRoute>} />
        <Route path="/templates" element={<ProtectedRoute><DashboardLayout><Templates /></DashboardLayout></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><DashboardLayout><Settings /></DashboardLayout></ProtectedRoute>} />
        <Route path="/resume-builder" element={<ProtectedRoute><DashboardLayout><ResumeBuilder /></DashboardLayout></ProtectedRoute>} />
        <Route path="/missing-skills" element={<ProtectedRoute><DashboardLayout><MissingSkills /></DashboardLayout></ProtectedRoute>} />
        <Route path="/support" element={<Support />} />
        <Route path="/maintenance" element={<Maintenance />} />

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
