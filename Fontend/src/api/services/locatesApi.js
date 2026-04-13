import axiosInstance from '../axios';

export const locatesApi = {
    getAll: () => axiosInstance.get('/locates/'),
    update: (id, data) => axiosInstance.patch(`/locates/${id}/`, data),
    delete: (id) => axiosInstance.delete(`/locates/${id}/`),
    markCalled: (id, data) => axiosInstance.patch(`/locates/${id}/`, data),
    markSeen: (data) => axiosInstance.post('/locates/mark-seen/', data),
};