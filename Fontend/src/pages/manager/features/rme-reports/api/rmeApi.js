import axiosInstance from '../../../../../api/axios';

export const rmeApi = {
    getAll: () => axiosInstance.get('/work-orders-today/'),
    update: (id, data) => axiosInstance.patch(`/work-orders-today/${id}/`, data),
    delete: (id) => axiosInstance.delete(`/work-orders-today/${id}/`),
    lockReport: (id, data) => axiosInstance.patch(`/work-orders-today/${id}/`, data),
    waitToLock: (id, data) => axiosInstance.patch(`/work-orders-today/${id}/`, data),
    discardReport: (id, data) => axiosInstance.patch(`/work-orders-today/${id}/`, data),
    bulkSoftDelete: (ids, data) => {
        const promises = Array.from(ids).map(id =>
            axiosInstance.patch(`/work-orders-today/${id}/`, data)
        );
        return Promise.all(promises);
    },
    bulkDelete: (ids) => {
        const promises = ids.map(id =>
            axiosInstance.delete(`/work-orders-today/${id}/`)
        );
        return Promise.all(promises);
    },
    bulkRestore: (ids, data) => {
        const promises = ids.map(id =>
            axiosInstance.patch(`/work-orders-today/${id}/`, data)
        );
        return Promise.all(promises);
    },
};