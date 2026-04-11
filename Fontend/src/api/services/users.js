import axiosInstance from '../axios';

export const usersApi = {
    getAll: () => axiosInstance.get('/users/'),
    create: (data) => axiosInstance.post('/users/', data),
    update: (id, data) => axiosInstance.put(`/users/${id}/`, data),
    delete: (id) => axiosInstance.delete(`/users/${id}/`),
    toggleStatus: (id) => axiosInstance.patch(`/users/${id}/toggle-status`),
    get: (endpoint) => axiosInstance.get(endpoint)
};
