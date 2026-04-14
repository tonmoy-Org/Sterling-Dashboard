import axiosInstance from '../axios';

export const rmeApi = {
    getAll: () => axiosInstance.get('/work-orders-today/'),
    getOne: (id) => axiosInstance.get(`/work-order-edit/${id}/`),
    update: (id, data) => axiosInstance.patch(`/work-orders-today/${id}/`, data),
    updateEdit: (id, data) => axiosInstance.patch(`/work-order-edit/${id}/`, data),
    delete: (id) => axiosInstance.delete(`/work-orders-today/${id}/`),
    lockReport: (id, data) => axiosInstance.patch(`/work-orders-today/${id}/`, data),
    waitToLock: (id, data) => axiosInstance.patch(`/work-orders-today/${id}/`, data),
    discardReport: (id, data) => axiosInstance.patch(`/work-orders-today/${id}/`, data),
    markSeen: (data) => axiosInstance.post('/work-orders-today/mark-seen/', data),
    getScraperStatus: () => axiosInstance.get('/work-orders-today/scraper-status/'),
    startScraping: () => axiosInstance.post('/work-orders-today/start-scraping/'),
    startDispatcherBookedScraping: () => axiosInstance.post('/work-orders-today/start-dispatcher-booked-scraping/'),
    startFieldedgeScraping: () => axiosInstance.post('/work-orders-today/start-fieldedge-scraping/'),
    startWorkOrdersAndRmeScraping: () => axiosInstance.post('/work-orders-today/start-work-orders-and-rme-scraping/'),
    startWorkOrdersTagsScraping: () => axiosInstance.post('/work-orders-today/start-work-orders-tags-scraping/'),
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