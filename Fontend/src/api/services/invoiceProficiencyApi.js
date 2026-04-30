import axiosInstance from '../axios';

export const invoiceProficiencyApi = {
    getAll: () => axiosInstance.get('/invoice-proficiency/records/'),
    getTrashed: () => axiosInstance.get('/invoice-proficiency/records/trashed/'),
    markSeen: (id) => axiosInstance.post(`/invoice-proficiency/records/${id}/mark-seen/`),
    markAllSeen: () => axiosInstance.post('/invoice-proficiency/records/mark-all-seen/'),
    restore: (id) => axiosInstance.post(`/invoice-proficiency/records/${id}/restore/`),
    delete: (id) => axiosInstance.delete(`/invoice-proficiency/records/${id}/`),
    permanentDelete: (id) => axiosInstance.delete(`/invoice-proficiency/records/${id}/permanent-delete/`),
};
