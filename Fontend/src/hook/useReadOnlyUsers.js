// hooks/useReadOnlyUsers.js
import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import axiosInstance from '../api/axios';

export const useReadOnlyUsers = (endpoint = '/users', queryKey = 'users') => {
    const [searchQuery, setSearchQuery] = useState('');
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');

    // Fetch users
    const { data: users = [], isLoading } = useQuery({
        queryKey: [queryKey],
        queryFn: async () => {
            const response = await axiosInstance.get(endpoint);
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

    // Handlers
    const handleChangePage = (event, newPage) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    // Show snackbar notifications
    const showSnackbar = (message, severity = 'success') => {
        if (severity === 'success') {
            setSuccess(message);
        } else {
            setError(message);
        }
        setTimeout(() => {
            severity === 'success' ? setSuccess('') : setError('');
        }, 3000);
    };

    return {
        // Data
        users,
        isLoading,
        filteredUsers,
        paginatedUsers,
        searchQuery,
        page,
        rowsPerPage,
        success,
        error,

        // Setters
        setSearchQuery,
        setSuccess,
        setError,

        // Handlers
        handleChangePage,
        handleChangeRowsPerPage,
        showSnackbar,
    };
};