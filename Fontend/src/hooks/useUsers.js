// hooks/useUsers.js
import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi } from '../api/services/users';

export const useUsers = (queryKey = 'users') => {
    const queryClient = useQueryClient();
    const [searchQuery, setSearchQuery] = useState('');
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [selectedUser, setSelectedUser] = useState(null);
    const [userToDelete, setUserToDelete] = useState(null);
    const [userToToggle, setUserToToggle] = useState(null);
    const [openDialog, setOpenDialog] = useState(false);
    const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
    const [openStatusDialog, setOpenStatusDialog] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        role: 'manager',
        isActive: true,
    });

    // Fetch users
    const { data: users = [], isLoading } = useQuery({
        queryKey: [queryKey],
        queryFn: async () => {
            const response = await usersApi.getAll();
            return response.data.users || response.data.data || response.data;
        },
        staleTime: 30000,
        refetchInterval: 60000,
    });

    // Filter users based on search query
    const filteredUsers = useMemo(() => {
        if (!searchQuery.trim()) return users;

        const query = searchQuery.toLowerCase();
        return users.filter(user =>
            user.name?.toLowerCase().includes(query) ||
            user.email?.toLowerCase().includes(query) ||
            user.role?.toLowerCase().includes(query)
        );
    }, [users, searchQuery]);

    // Pagination logic
    const paginatedUsers = useMemo(() => {
        return filteredUsers.slice(
            page * rowsPerPage,
            page * rowsPerPage + rowsPerPage
        );
    }, [filteredUsers, page, rowsPerPage]);

    // Mutations
    const createUserMutation = useMutation({
        mutationFn: async (userData) => {
            const response = await usersApi.create(userData);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [queryKey] });
            setOpenDialog(false);
            resetForm();
            setPage(0);
        },
    });

    const deleteUserMutation = useMutation({
        mutationFn: async (userId) => {
            const response = await usersApi.delete(userId);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [queryKey] });
            setOpenDeleteDialog(false);
            setUserToDelete(null);
            if (paginatedUsers.length === 1 && page > 0) {
                setPage(page - 1);
            }
        },
    });

    const updateUserMutation = useMutation({
        mutationFn: async ({ userId, userData }) => {
            const response = await usersApi.update(userId, userData);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [queryKey] });
            setOpenDialog(false);
            resetForm();
        },
    });

    const toggleUserStatusMutation = useMutation({
        mutationFn: async (userId) => {
            const response = await usersApi.toggleStatus(userId);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [queryKey] });
            setOpenStatusDialog(false);
            setUserToToggle(null);
        },
    });

    // Handlers
    const handleChangePage = (event, newPage) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    const handleOpenDialog = (user = null) => {
        if (user) {
            setSelectedUser(user);
            setFormData({
                name: user.name,
                email: user.email,
                password: '',
                role: user.role,
                isActive: user.isActive !== undefined ? user.isActive : true,
            });
        } else {
            resetForm();
        }
        setOpenDialog(true);
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
        setSelectedUser(null);
        resetForm();
    };

    const handleDeleteClick = (user) => {
        setUserToDelete(user);
        setOpenDeleteDialog(true);
    };

    const handleDeleteConfirm = () => {
        if (userToDelete) {
            deleteUserMutation.mutate(userToDelete.id || userToDelete._id);
        }
    };

    const handleToggleStatusClick = (user) => {
        setUserToToggle(user);
        setOpenStatusDialog(true);
    };

    const handleToggleStatusConfirm = () => {
        if (userToToggle) {
            toggleUserStatusMutation.mutate(userToToggle.id || userToToggle._id);
        }
    };

    const resetForm = () => {
        setFormData({
            name: '',
            email: '',
            password: '',
            role: 'manager',
            isActive: true,
        });
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSwitchChange = (e) => {
        setFormData(prev => ({
            ...prev,
            isActive: e.target.checked
        }));
    };

    const handleSubmit = () => {
        if (selectedUser) {
            const updateData = { ...formData };
            if (!updateData.password) {
                delete updateData.password;
            }
            updateUserMutation.mutate({
                userId: selectedUser.id || selectedUser._id,
                userData: updateData
            });
        } else {
            createUserMutation.mutate(formData);
        }
    };

    return {
        // State
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

        // Mutations
        createUserMutation,
        deleteUserMutation,
        updateUserMutation,
        toggleUserStatusMutation,

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
        setUserToDelete,
        setUserToToggle,
    };
};