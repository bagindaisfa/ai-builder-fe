import React from 'react';
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const ProtectedRoute = ({ children, requireAuth = true }) => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        width: '100%'
      }}>
        <div>Verifying authentication...</div>
      </div>
    );
  }

  // If route requires auth but user is not authenticated, redirect to login
  if (requireAuth && !isAuthenticated) {
    // Store the attempted URL for redirecting after login
    const redirectPath = location.pathname !== '/login' ? location.pathname + location.search : '/';
    return <Navigate to="/login" state={{ from: redirectPath }} replace />;
  }

  // If route is auth-only (like login/signup) but user is authenticated, redirect to home
  if (!requireAuth && isAuthenticated) {
    const from = location.state?.from || '/';
    return <Navigate to={from} replace />;
  }

  // Use Outlet for nested routes, or children for direct rendering
  return children || <Outlet />;
};

export default ProtectedRoute;
