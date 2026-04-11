import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthProvider';
import CommonLoader from '../components/Loader/CommonLoader';

export const LoginRoute = ({ children }) => {
    const { isAuthenticated, user, isLoading } = useAuth();

    if (isLoading) {
        return (
            <CommonLoader />
        );
    }

    if (isAuthenticated && user) {
        switch (user.role) {
            case 'superadmin':
                return <Navigate to="/super-admin-dashboard" replace />;
            case 'manager':
                return <Navigate to="/manager-dashboard" replace />;
            case 'tech':
                return <Navigate to="/tech-dashboard" replace />;
            default:
                return <Navigate to="/dashboard" replace />;
        }
    }

    return <>{children}</>;
};
