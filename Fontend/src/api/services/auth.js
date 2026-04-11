import axiosInstance from '../axios';

export const authApi = {
    register: (data) => axiosInstance.post('/auth/register', data),
    me: () => axiosInstance.get('/auth/me'),
    login: (credentials) => axiosInstance.post('/auth/login', credentials),
    logout: () => axiosInstance.post('/auth/logout'),
    updateProfile: (data) => axiosInstance.put('/auth/profile', data),
    changePassword: (data) => axiosInstance.put('/auth/change-password', data),
    refresh: () => axiosInstance.post('/auth/refresh')
};
