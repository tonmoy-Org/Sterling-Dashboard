import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Tooltip,
    IconButton,
} from '@mui/material';
import { Helmet } from 'react-helmet-async';
import {
    UserPlus,
    Edit,
    Trash2,
    UserCheck,
    UserX,
    Mail,
    UserCog,
} from 'lucide-react';
import GradientButton from '../../../components/ui/GradientButton';
import DashboardLoader from '../../../components/Loader/DashboardLoader';
import { useUsers } from '../../../hook/useUsers';
import { UserFormModal } from '../../../components/ui/UserFormModal';
import { DeleteConfirmationModal } from '../../../components/ui/DeleteConfirmationModal';
import { StatusToggleModal } from '../../../components/ui/StatusToggleModal';
import { NotificationSnackbar } from '../../../components/ui/NotificationSnackbar';
import { DataTable } from '../../../components/DataTable/DataTable';

// Define color constants
const TEXT_COLOR = '#0F1115';
const GREEN_COLOR = '#10b981';
const RED_COLOR = '#ef4444';
const BLUE_COLOR = '#1976d2';
const GRAY_COLOR = '#6b7280';

export const TechUser = () => {
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');

    // Track previous modal states
    const [prevOpenDialog, setPrevOpenDialog] = useState(false);
    const [prevOpenDeleteDialog, setPrevOpenDeleteDialog] = useState(false);
    const [prevOpenStatusDialog, setPrevOpenStatusDialog] = useState(false);

    // Track pending notifications
    const [pendingNotification, setPendingNotification] = useState(null);

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
        selectedUser,
        userToDelete,
        userToToggle,
        openDialog,
        openDeleteDialog,
        openStatusDialog,
        formData,

        // Handlers
        handleChangePage,
        handleChangeRowsPerPage,
        handleOpenDialog,
        handleCloseDialog,
        handleDeleteClick,
        handleDeleteConfirm,
        handleToggleStatusClick,
        handleToggleStatusConfirm,
        handleInputChange,
        handleSwitchChange,
        handleSubmit,

        // Dialog controls
        setOpenDialog,
        setOpenDeleteDialog,
        setOpenStatusDialog,
    } = useUsers('/users/tech', 'tech-users-management');

    // Override formData for tech users
    const techFormData = {
        ...formData,
        role: 'tech'
    };

    // Effects to detect when modals close and show notifications
    useEffect(() => {
        // Check if UserFormModal just closed
        if (prevOpenDialog && !openDialog && pendingNotification) {
            if (pendingNotification.type === 'success') {
                setSuccess(pendingNotification.message);
            } else {
                setError(pendingNotification.message);
            }
            setPendingNotification(null);
        }
        setPrevOpenDialog(openDialog);
    }, [openDialog, prevOpenDialog, pendingNotification]);

    useEffect(() => {
        // Check if DeleteConfirmationModal just closed
        if (prevOpenDeleteDialog && !openDeleteDialog && pendingNotification) {
            if (pendingNotification.type === 'success') {
                setSuccess(pendingNotification.message);
            } else {
                setError(pendingNotification.message);
            }
            setPendingNotification(null);
        }
        setPrevOpenDeleteDialog(openDeleteDialog);
    }, [openDeleteDialog, prevOpenDeleteDialog, pendingNotification]);

    useEffect(() => {
        // Check if StatusToggleModal just closed
        if (prevOpenStatusDialog && !openStatusDialog && pendingNotification) {
            if (pendingNotification.type === 'success') {
                setSuccess(pendingNotification.message);
            } else {
                setError(pendingNotification.message);
            }
            setPendingNotification(null);
        }
        setPrevOpenStatusDialog(openStatusDialog);
    }, [openStatusDialog, prevOpenStatusDialog, pendingNotification]);

    // Enhanced handlers that store notifications
    const handleEnhancedDeleteConfirm = async () => {
        try {
            await handleDeleteConfirm();
            setPendingNotification({
                type: 'success',
                message: 'Tech user deleted successfully'
            });
        } catch (err) {
            setPendingNotification({
                type: 'error',
                message: err.message || 'Failed to delete tech user'
            });
            throw err;
        }
    };

    const handleEnhancedToggleConfirm = async () => {
        try {
            const result = await handleToggleStatusConfirm();
            const action = userToToggle?.isActive ? 'deactivated' : 'activated';
            setPendingNotification({
                type: 'success',
                message: `Tech user ${action} successfully`
            });
            return result;
        } catch (err) {
            setPendingNotification({
                type: 'error',
                message: err.message || 'Failed to update tech user status'
            });
            throw err;
        }
    };

    const handleEnhancedSubmit = async () => {
        try {
            const result = await handleSubmit();
            const action = selectedUser ? 'updated' : 'created';
            setPendingNotification({
                type: 'success',
                message: `Tech user ${action} successfully`
            });
            return result;
        } catch (err) {
            setPendingNotification({
                type: 'error',
                message: err.message || 'Failed to save tech user'
            });
            throw err;
        }
    };

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
        {
            field: 'actions',
            header: 'Actions',
            align: 'right',
            render: (user) => (
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
                    <Tooltip title="Edit Tech User">
                        <IconButton
                            size="small"
                            onClick={() => handleOpenDialog(user)}
                            sx={{
                                color: BLUE_COLOR,
                                padding: '4px',
                                '&:hover': {
                                    backgroundColor: `rgba(25, 118, 210, 0.1)`,
                                },
                            }}
                        >
                            <Edit size={16} />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title={user.isActive ? "Deactivate Tech User" : "Activate Tech User"}>
                        <IconButton
                            size="small"
                            onClick={() => handleToggleStatusClick(user)}
                            sx={{
                                color: user.isActive ? RED_COLOR : GREEN_COLOR,
                                padding: '4px',
                                '&:hover': {
                                    backgroundColor: user.isActive
                                        ? `rgba(239, 68, 68, 0.1)`
                                        : `rgba(16, 185, 129, 0.1)`,
                                },
                            }}
                        >
                            {user.isActive ? <UserX size={16} /> : <UserCheck size={16} />}
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete Tech User">
                        <IconButton
                            size="small"
                            onClick={() => handleDeleteClick(user)}
                            sx={{
                                color: RED_COLOR,
                                padding: '4px',
                                '&:hover': {
                                    backgroundColor: `rgba(239, 68, 68, 0.1)`,
                                },
                            }}
                        >
                            <Trash2 size={16} />
                        </IconButton>
                    </Tooltip>
                </Box>
            ),
        },
    ];

    // Header actions component
    const headerActions = (
        <GradientButton
            variant="contained"
            startIcon={<UserPlus size={16} />}
            onClick={() => handleOpenDialog()}
            sx={{
                backgroundColor: GREEN_COLOR,
                '&:hover': {
                    backgroundColor: `rgba(16, 185, 129, 0.9)`,
                },
            }}
        >
            Add Tech User
        </GradientButton>
    );

    if (isLoading) {
        return <DashboardLoader />;
    }

    return (
        <Box>
            <Helmet>
                <title>Tech User Management | Sterling Septic & Plumbing LLC</title>
                <meta name="description" content="Manage tech users and their roles" />
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
                        Manage tech users and their roles
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
                headerActions={headerActions}
                emptyStateTitle="No tech users found."
                emptyStateDescription="Create one to get started."
            />

            {/* Reusable Modals - Updated to use enhanced handlers */}
            <UserFormModal
                open={openDialog}
                onClose={handleCloseDialog}
                onSubmit={handleEnhancedSubmit}
                selectedUser={selectedUser}
                formData={techFormData}
                onInputChange={handleInputChange}
                onSwitchChange={handleSwitchChange}
                title="Tech User"
                color={GREEN_COLOR}
            />

            <DeleteConfirmationModal
                open={openDeleteDialog}
                onClose={() => setOpenDeleteDialog(false)}
                onConfirm={handleEnhancedDeleteConfirm}
                item={userToDelete}
                title="Tech User"
            />

            <StatusToggleModal
                open={openStatusDialog}
                onClose={() => setOpenStatusDialog(false)}
                onConfirm={handleEnhancedToggleConfirm}
                item={userToToggle}
                title="Tech User"
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

export default TechUser;