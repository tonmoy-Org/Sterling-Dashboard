// TechUserManagement.jsx (Using DataTable)
import React from 'react';
import {
    Box,
    Typography,
} from '@mui/material';
import { Helmet } from 'react-helmet-async';
import DashboardLoader from '../../../components/Loader/DashboardLoader';
import { useReadOnlyUsers } from '../../../hook/useReadOnlyUsers';
import { NotificationSnackbar } from '../../../components/ui/NotificationSnackbar';
import { DataTable } from '../../../components/DataTable/DataTable';
import { Mail, UserCog, UserCheck, UserX } from 'lucide-react';

// Define color constants
const TEXT_COLOR = '#0F1115';
const GREEN_COLOR = '#10b981';
const RED_COLOR = '#ef4444';
const GRAY_COLOR = '#6b7280';

export const TechUserManagement = () => {
    const {
        // Data
        users,
        isLoading,
        filteredUsers,
        paginatedUsers,
        searchQuery,
        setSearchQuery,
        page,
        rowsPerPage,
        
        // Handlers
        handleChangePage,
        handleChangeRowsPerPage,
        
        // State
        success,
        error,
        setSuccess,
        setError,
    } = useReadOnlyUsers('/users/tech', 'tech-users');

    // Helper functions for styling
    const getRoleStyle = () => {
        return {
            backgroundColor: `rgba(16, 185, 129, 0.08)`,
            color: GREEN_COLOR,
            border: `1px solid rgba(16, 185, 129, 0.3)`,
        };
    };

    const getStatusStyle = (isActive) => {
        if (isActive) {
            return {
                backgroundColor: `rgba(16, 185, 129, 0.08)`,
                color: GREEN_COLOR,
                border: `1px solid rgba(16, 185, 129, 0.3)`,
            };
        } else {
            return {
                backgroundColor: `rgba(239, 68, 68, 0.08)`,
                color: RED_COLOR,
                border: `1px solid rgba(239, 68, 68, 0.3)`,
            };
        }
    };

    // Define columns for the table
    const columns = [
        {
            field: 'name',
            header: 'Name',
            render: (user) => (
                <Box display="flex" alignItems="center" gap={1.5}>
                    <Box sx={{
                        width: 32,
                        height: 32,
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: `linear-gradient(135deg, rgba(16, 185, 129, 0.8) 0%, ${GREEN_COLOR} 100%)`,
                        color: 'white',
                        fontWeight: 600,
                        fontSize: '0.8rem',
                    }}>
                        {user.name?.charAt(0).toUpperCase()}
                    </Box>
                    <Box>
                        <Typography
                            variant="body2"
                            sx={{
                                color: TEXT_COLOR,
                                fontSize: '0.85rem',
                                fontWeight: 600,
                                lineHeight: 1.2,
                            }}
                        >
                            {user.name}
                        </Typography>
                        <Typography
                            variant="caption"
                            sx={{
                                color: GRAY_COLOR,
                                fontSize: '0.75rem',
                                fontWeight: 400,
                            }}
                        >
                            ID: {user.id || user._id?.slice(-6)}
                        </Typography>
                    </Box>
                </Box>
            ),
        },
        {
            field: 'email',
            header: 'Email',
            render: (user) => (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Mail size={14} color={GRAY_COLOR} />
                    <Typography
                        variant="body2"
                        sx={{
                            color: TEXT_COLOR,
                            fontSize: '0.85rem',
                            fontWeight: 400,
                        }}
                    >
                        {user.email}
                    </Typography>
                </Box>
            ),
        },
        {
            field: 'role',
            header: 'Role',
            render: () => (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <UserCog size={14} color={GREEN_COLOR} />
                    <Box
                        component="span"
                        sx={{
                            px: 1.5,
                            py: 0.5,
                            borderRadius: '12px',
                            fontSize: '0.75rem',
                            fontWeight: 500,
                            ...getRoleStyle(),
                        }}
                    >
                        TECH
                    </Box>
                </Box>
            ),
        },
        {
            field: 'status',
            header: 'Status',
            render: (user) => (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {user.isActive ? (
                        <UserCheck size={14} color={GREEN_COLOR} />
                    ) : (
                        <UserX size={14} color={RED_COLOR} />
                    )}
                    <Box
                        component="span"
                        sx={{
                            px: 1.5,
                            py: 0.5,
                            borderRadius: '12px',
                            fontSize: '0.75rem',
                            fontWeight: 500,
                            ...getStatusStyle(user.isActive),
                        }}
                    >
                        {user.isActive ? 'Active' : 'Inactive'}
                    </Box>
                </Box>
            ),
        },
    ];

    if (isLoading) {
        return <DashboardLoader />;
    }

    return (
        <Box>
            <Helmet>
                <title>Tech Users | Sterling Septic & Plumbing LLC</title>
                <meta name="description" content="View all tech users" />
            </Helmet>

            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box>
                    <Typography
                        sx={{
                            fontWeight: 600,
                            mb: 0.5,
                            fontSize: '1rem',
                            color: TEXT_COLOR,
                            letterSpacing: '-0.01em',
                        }}
                    >
                        Tech User Management
                    </Typography>
                    <Typography
                        variant="body2"
                        sx={{
                            color: GRAY_COLOR,
                            fontSize: '0.8rem',
                            fontWeight: 400,
                        }}
                    >
                        View and manage tech users
                    </Typography>
                </Box>
            </Box>

            {/* Reusable DataTable */}
            <DataTable
                data={paginatedUsers}
                columns={columns}
                title="Tech Users"
                color={GREEN_COLOR}
                searchValue={searchQuery}
                onSearchChange={setSearchQuery}
                searchPlaceholder="Search tech users..."
                pagination={true}
                page={page}
                rowsPerPage={rowsPerPage}
                totalCount={filteredUsers.length}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
                emptyStateTitle={searchQuery ? 'No tech users found matching your search.' : 'No tech users found.'}
            />

            {/* Notification Snackbar */}
            <NotificationSnackbar
                success={success}
                error={error}
                onSuccessClose={() => setSuccess('')}
                onErrorClose={() => setError('')}
            />
        </Box>
    );
};

export default TechUserManagement;