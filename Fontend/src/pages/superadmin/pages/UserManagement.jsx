import React, { useState } from 'react';
import {
    Box,
    Typography,
    Tooltip,
    IconButton,
    useTheme,
    useMediaQuery,
} from '@mui/material';
import { Helmet } from 'react-helmet-async';
import {
    UserPlus,
    Edit,
    Trash2,
    UserCheck,
    UserX,
    Mail,
} from 'lucide-react';
import GradientButton from '../../../components/ui/GradientButton';
import DashboardLoader from '../../../components/Loader/DashboardLoader';
import { useUsers } from '../../../hook/useUsers';
import { UserFormModal } from '../../../components/ui/UserFormModal';
import { DeleteConfirmationModal } from '../../../components/ui/DeleteConfirmationModal';
import { StatusToggleModal } from '../../../components/ui/StatusToggleModal';
import { DataTable } from '../../../components/DataTable/DataTable';
import { useAuth } from '../../../auth/AuthProvider';
import { useGlobalSnackbar } from '../../../context/GlobalSnackbarContext';

const TEXT_COLOR = '#0F1115';
const BLUE_COLOR = '#1976d2';
const GREEN_COLOR = '#10b981';
const RED_COLOR = '#ef4444';
const GRAY_COLOR = '#6b7280';

export const UserManagement = () => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const { user: currentUser } = useAuth();
    const { showSnackbar } = useGlobalSnackbar();

    const [isTogglingStatus, setIsTogglingStatus] = useState(false);

    const {
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
        handleChangePage,
        handleChangeRowsPerPage,
        handleOpenDialog,
        handleCloseDialog,
        handleDeleteClick,
        handleDeleteConfirm,
        handleToggleStatusClick,
        handleToggleStatusConfirm,
        handleInputChange,
        handleSubmit,
        setOpenDeleteDialog,
        setOpenStatusDialog,
    } = useUsers('/users', 'users');

    const handleEnhancedDeleteConfirm = async () => {
        try {
            await handleDeleteConfirm();
            showSnackbar('User deleted successfully', 'success');
        } catch (err) {
            showSnackbar(err.message || 'Failed to delete user', 'error');
            throw err;
        }
    };

    const handleEnhancedToggleConfirm = async () => {
        setIsTogglingStatus(true);
        try {
            const result = await handleToggleStatusConfirm();
            const action = userToToggle?.isActive ? 'deactivated' : 'activated';
            showSnackbar(`User ${action} successfully`, 'success');
            return result;
        } catch (err) {
            showSnackbar(err.message || 'Failed to update user status', 'error');
            throw err;
        } finally {
            setIsTogglingStatus(false);
        }
    };

    const handleEnhancedSubmit = async () => {
        try {
            const result = await handleSubmit();
            const action = selectedUser ? 'updated' : 'created';
            showSnackbar(`User ${action} successfully`, 'success');
            return result;
        } catch (err) {
            showSnackbar(err.message || 'Failed to save user', 'error');
            throw err;
        }
    };

    const isSelfOperation = (targetUser) => {
        return currentUser?.id === targetUser?.id;
    };

    const canEditUser = (targetUser) => {
        return true;
    };

    const canDeleteUser = (targetUser) => {
        if (isSelfOperation(targetUser)) {
            return false;
        }
        return true;
    };

    const canToggleStatus = (targetUser) => {
        if (isSelfOperation(targetUser)) {
            return false;
        }
        if (targetUser?.role === 'superadmin') {
            const superadminCount = users.filter(u => u.role === 'superadmin' && u.isActive).length;
            if (superadminCount <= 1 && targetUser.isActive) {
                return false;
            }
        }
        return true;
    };

    const getRoleStyle = (role) => {
        switch (role) {
            case 'superadmin':
                return {
                    backgroundColor: `rgba(239, 68, 68, 0.08)`,
                    color: RED_COLOR,
                    border: `1px solid rgba(239, 68, 68, 0.3)`,
                };
            case 'manager':
                return {
                    backgroundColor: `rgba(25, 118, 210, 0.08)`,
                    color: BLUE_COLOR,
                    border: `1px solid rgba(25, 118, 210, 0.3)`,
                };
            case 'tech':
                return {
                    backgroundColor: `rgba(16, 185, 129, 0.08)`,
                    color: GREEN_COLOR,
                    border: `1px solid rgba(16, 185, 129, 0.3)`,
                };
            default:
                return {
                    backgroundColor: `rgba(107, 114, 128, 0.08)`,
                    color: TEXT_COLOR,
                    border: `1px solid rgba(107, 114, 128, 0.3)`,
                };
        }
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
                        background: `linear-gradient(135deg, rgba(25, 118, 210, 0.8) 0%, ${BLUE_COLOR} 100%)`,
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
                            {isSelfOperation(user) && (
                                <Typography
                                    component="span"
                                    sx={{
                                        ml: 1,
                                        fontSize: '0.7rem',
                                        color: BLUE_COLOR,
                                        fontWeight: 500
                                    }}
                                >
                                    (You)
                                </Typography>
                            )}
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
            render: (user) => (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {user.role === 'superadmin' && <UserCheck size={14} color={RED_COLOR} />}
                    {user.role === 'manager' && <Edit size={14} color={BLUE_COLOR} />}
                    {user.role === 'tech' && <UserCheck size={14} color={GREEN_COLOR} />}
                    <Box
                        component="span"
                        sx={{
                            px: 1.5,
                            py: 0.5,
                            borderRadius: '12px',
                            fontSize: '0.75rem',
                            fontWeight: 500,
                            ...getRoleStyle(user.role),
                        }}
                    >
                        {user.role.toUpperCase()}
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
            render: (user) => {
                const isSelf = isSelfOperation(user);
                const canEdit = canEditUser(user);
                const canDelete = canDeleteUser(user);
                const canToggle = canToggleStatus(user);

                return (
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
                        <Tooltip title={canEdit ? "Edit User" : "Cannot edit user"}>
                            <span>
                                <IconButton
                                    size="small"
                                    onClick={() => handleOpenDialog(user)}
                                    disabled={!canEdit}
                                    sx={{
                                        color: canEdit ? BLUE_COLOR : GRAY_COLOR,
                                        padding: '4px',
                                        '&:hover': canEdit ? {
                                            backgroundColor: `rgba(25, 118, 210, 0.1)`,
                                        } : {},
                                    }}
                                >
                                    <Edit size={16} />
                                </IconButton>
                            </span>
                        </Tooltip>
                        <Tooltip title={
                            isSelf
                                ? "Cannot modify your own status"
                                : !canToggle
                                    ? "Cannot deactivate the last superadmin"
                                    : (user.isActive ? "Deactivate User" : "Activate User")
                        }>
                            <span>
                                <IconButton
                                    size="small"
                                    onClick={() => handleToggleStatusClick(user)}
                                    disabled={isSelf || !canToggle}
                                    sx={{
                                        color: (isSelf || !canToggle)
                                            ? GRAY_COLOR
                                            : (user.isActive ? RED_COLOR : GREEN_COLOR),
                                        padding: '4px',
                                        '&:hover': (!isSelf && canToggle) ? {
                                            backgroundColor: user.isActive
                                                ? `rgba(239, 68, 68, 0.1)`
                                                : `rgba(16, 185, 129, 0.1)`,
                                        } : {},
                                    }}
                                >
                                    {user.isActive ? <UserX size={16} /> : <UserCheck size={16} />}
                                </IconButton>
                            </span>
                        </Tooltip>
                        <Tooltip title={isSelf ? "Cannot delete your own account" : canDelete ? "Delete User" : "Cannot delete user"}>
                            <span>
                                <IconButton
                                    size="small"
                                    onClick={() => handleDeleteClick(user)}
                                    disabled={isSelf || !canDelete}
                                    sx={{
                                        color: (isSelf || !canDelete) ? GRAY_COLOR : RED_COLOR,
                                        padding: '4px',
                                        '&:hover': (!isSelf && canDelete) ? {
                                            backgroundColor: `rgba(239, 68, 68, 0.1)`,
                                        } : {},
                                    }}
                                >
                                    <Trash2 size={16} />
                                </IconButton>
                            </span>
                        </Tooltip>
                    </Box>
                );
            },
        },
    ];

    const headerActions = (
        <GradientButton
            variant="contained"
            startIcon={<UserPlus size={16} />}
            onClick={() => handleOpenDialog()}
            sx={{
                fontSize: '0.85rem',
                textTransform: 'none',
                px: 2,
                py: 1,
            }}
        >
            Add User
        </GradientButton>
    );

    if (isLoading) {
        return <DashboardLoader />;
    }

    return (
        <Box>
            <Helmet>
                <title>User Management | Sterling Septic & Plumbing LLC</title>
                <meta name="description" content="Manage users and their roles" />
            </Helmet>

            <Box sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                mb: 3,
                flexDirection: isMobile ? 'column' : 'row',
                gap: isMobile ? 2 : 0,
            }}>
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
                        User Management
                    </Typography>
                    <Typography
                        variant="body2"
                        sx={{
                            color: GRAY_COLOR,
                            fontSize: '0.85rem',
                            fontWeight: 400,
                        }}
                    >
                        Manage users and their roles
                    </Typography>
                </Box>
                {!isMobile && headerActions}
            </Box>

            {isMobile && (
                <Box sx={{ mb: 2 }}>
                    {headerActions}
                </Box>
            )}

            <DataTable
                data={paginatedUsers}
                columns={columns}
                title="Users"
                color={BLUE_COLOR}
                searchValue={searchQuery}
                onSearchChange={setSearchQuery}
                searchPlaceholder="Search users..."
                pagination={true}
                page={page}
                rowsPerPage={rowsPerPage}
                totalCount={filteredUsers.length}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
                headerActions={isMobile ? null : headerActions}
                emptyStateTitle="No users found."
                emptyStateDescription="Create one to get started."
                isMobile={isMobile}
            />

            <UserFormModal
                open={openDialog}
                onClose={handleCloseDialog}
                onSubmit={handleEnhancedSubmit}
                selectedUser={selectedUser}
                formData={formData}
                onInputChange={handleInputChange}
                title="User"
                color={BLUE_COLOR}
                disableRoleChange={isSelfOperation(selectedUser)}
                warningText={isSelfOperation(selectedUser) ?
                    "Note: You are editing your own account. You cannot change your role." :
                    undefined}
            />

            <DeleteConfirmationModal
                open={openDeleteDialog}
                onClose={() => setOpenDeleteDialog(false)}
                onConfirm={handleEnhancedDeleteConfirm}
                item={userToDelete}
                title="User"
                warningText={
                    isSelfOperation(userToDelete)
                        ? "You cannot delete your own account. Please ask another administrator to perform this action."
                        : undefined
                }
                disableConfirm={isSelfOperation(userToDelete)}
            />

            <StatusToggleModal
                open={openStatusDialog}
                onClose={() => setOpenStatusDialog(false)}
                onConfirm={handleEnhancedToggleConfirm}
                item={userToToggle}
                isLoading={isTogglingStatus}
                title="User"
                itemNameKey="name"
            />
        </Box>
    );
};

export default UserManagement;