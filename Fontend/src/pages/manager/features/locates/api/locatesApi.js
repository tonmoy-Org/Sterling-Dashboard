import axiosInstance from '../../../../../api/axios';

export const locatesApi = {
    getAll: () => axiosInstance.get('/locates/'),

    update: (id, data) => axiosInstance.patch(`/locates/${id}/`, data),

    delete: (id) => axiosInstance.delete(`/locates/${id}/`),

    markCalled: (id, data) => axiosInstance.patch(`/locates/${id}/`, data),
};