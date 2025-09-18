import React from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./contexts/AuthContext";
import AppLayout from "./components/layout/AppLayout";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import ProfilePage from "./pages/ProfilePage";
import StudioPage from "./pages/StudioPage";
import BuilderPage from "./pages/BuilderPage";
import KnowledgePage from "./pages/KnowledgePage";
import DatasetDetailPage from "./pages/DatasetDetailPage";
import DocumentChunksPage from "./pages/DocumentChunksPage";
import PreviewPage from "./pages/PreviewPage";
import ApiAccessPage from "./pages/ApiAccessPage";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import { Spin, Typography } from "antd";

const { Text } = Typography;

// Main App Content (protected routes)
const AppContent = () => {
  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<Navigate to="/studio" replace />} />
        <Route path="/studio" element={<StudioPage />} />
        <Route path="/builder/:workflowId" element={<BuilderPage />} />
        <Route path="/knowledge" element={<KnowledgePage />} />
        <Route path="/datasets/:datasetId" element={<DatasetDetailPage />} />
        <Route path="/document/details/:documentId" element={<DocumentChunksPage />} />
        <Route path="/preview" element={<PreviewPage />} />
        <Route path="/api" element={<ApiAccessPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="*" element={<Navigate to="/studio" replace />} />
      </Routes>
    </AppLayout>
  );
};

// Loading component
const FullPageLoading = ({ message = 'Loading...' }) => (
  <div style={{
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    width: '100%',
    gap: '16px'
  }}>
    <Spin size="large" />
    <Text type="secondary">{message}</Text>
  </div>
);

// Main App Component
const App = () => {
  const location = useLocation();
  const { loading, isAuthenticated, error, isInitialized } = useAuth();
  const [showLoading, setShowLoading] = React.useState(true);

  // Handle initial load and authentication state
  React.useEffect(() => {
    // Only show loading on initial app load, not during login attempts
    if (isInitialized) {
      const timer = setTimeout(() => setShowLoading(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isInitialized]);

  // Public routes that don't require authentication
  const publicRoutes = [
    '/login',
    '/callback',
    '/forgot-password',
    '/reset-password',
    '/auth' // Add this if you have any auth-related routes
  ];

  // Show loading state only during initial app load
  if (!isInitialized || showLoading) {
    return <FullPageLoading message="Loading..." />;
  }

  // For login/signup pages, handle specially to prevent redirect loops
  if (location.pathname === '/login' || location.pathname === '/signup') {
    if (isAuthenticated) {
      const returnTo = location.state?.from?.pathname || '/';
      return <Navigate to={returnTo} replace />;
    }
    
    if (location.pathname === '/login') {
      return <LoginPage />;
    }
    return <SignupPage />;
  }

  // Show loading while checking auth state
  if (!isInitialized) {
    return <FullPageLoading message="Loading..." />;
  }

  // For other routes, redirect to login if not authenticated
  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/*" element={<Navigate to="/login" state={{ from: location }} replace />} />
      </Routes>
    );
  }

  // For authenticated users
  return (
    <Routes>
      <Route path="/login" element={<Navigate to="/" replace />} />
      <Route path="/*" element={<AppContent />} />
    </Routes>
  );
};

export default App;
