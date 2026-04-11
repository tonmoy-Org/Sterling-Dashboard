import axiosInstance from '../axios';

export const notificationsApi = {
    getAll: () => axiosInstance.get('/notifications/'),
    markRead: (id) => axiosInstance.patch(`/notifications/${id}/read/`),
    markAllRead: () => axiosInstance.post('/notifications/mark-all-read/'),
    delete: (id) => axiosInstance.delete(`/notifications/${id}/`),
    clearAll: () => axiosInstance.delete('/notifications/clear-all/')
};
