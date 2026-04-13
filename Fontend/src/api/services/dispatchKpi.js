import axiosInstance from '../axios';

export const dispatchKpiApi = {
    getAll: () => axiosInstance.get('/dispatcher-booked/'),
    create: (data) => axiosInstance.post('/dispatcher-booked/', data),
    update: (id, data) => axiosInstance.put(`/dispatcher-booked/${id}/`, data),
    patch: (id, data) => axiosInstance.patch(`/dispatcher-booked/${id}/`, data),
    delete: (id) => axiosInstance.delete(`/dispatcher-booked/${id}/`),
    markSeen: (data) => axiosInstance.post('/dispatcher-booked-seen/', data),
};
