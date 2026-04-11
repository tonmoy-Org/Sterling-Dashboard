import axiosInstance from '../axios';

export const repairsApi = {
    getAll: () => axiosInstance.get('/tank-repairs/'),
    create: (data) => axiosInstance.post('/tank-repairs/', data),
    update: (id, data) => axiosInstance.put(`/tank-repairs/${id}/`, data),
    patch: (id, data) => axiosInstance.patch(`/tank-repairs/${id}/`, data),
    delete: (id) => axiosInstance.delete(`/tank-repairs/${id}/`)
};
