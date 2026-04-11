import axiosInstance from '../axios';

export const workOrdersApi = {
    getAll: () => axiosInstance.get('/work-orders/'),
    create: (data) => axiosInstance.post('/work-orders/', data),
    update: (id, data) => axiosInstance.put(`/work-orders/${id}/`, data),
    patch: (id, data) => axiosInstance.patch(`/work-orders/${id}/`, data),
    delete: (id) => axiosInstance.delete(`/work-orders/${id}/`),
    markSeen: (data) => axiosInstance.post('/work-orders/seen/', data),
    // generic post if needed
    post: (endpoint, data) => axiosInstance.post(endpoint, data)
};
