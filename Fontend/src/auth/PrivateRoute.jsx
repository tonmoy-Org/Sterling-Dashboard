import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthProvider';
import CommonLoader from '../components/Loader/CommonLoader';

export const PrivateRoute = ({ children, requiredRoles }) => {
  const { isAuthenticated, user, isLoading } = useAuth();

  if (isLoading) {
    return <CommonLoader />;
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRoles && !requiredRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
};
