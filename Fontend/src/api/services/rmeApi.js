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
    startReviewTrackerScraping: () => axiosInstance.post('/work-orders-today/start-review-tracker-scraping/'),
    startYelpReviewScraping: () => axiosInstance.post('/work-orders-today/start-yelp-review-scraping/'),
    startInvoiceProficiencyScraping: () => axiosInstance.post('/work-orders-today/start-invoice-proficiency-scraping/'),
    startTimeTrackingScraping: () => axiosInstance.post('/work-orders-today/start-time-tracking-scraping/'),
    startTimeTrackingCombinedScraping: () => axiosInstance.post('/work-orders-today/start-time-tracking-combined-scraping/'),

    // Invoice Proficiency Records
    getInvoiceProficiency: () => axiosInstance.get('/invoice-proficiency/records/'),
    getInvoiceProficiencyData: () => axiosInstance.get('/invoice-proficiency/records/'),
    getTrashedInvoiceProficiency: () => axiosInstance.get('/invoice-proficiency/records/trashed/'),
    deleteInvoiceProficiency: (id, data) => axiosInstance.delete(`/invoice-proficiency/records/${id}/`, { data }),
    restoreInvoiceProficiency: (id) => axiosInstance.post(`/invoice-proficiency/records/${id}/restore/`),
    permanentDeleteInvoiceProficiency: (id) => axiosInstance.delete(`/invoice-proficiency/records/${id}/permanent-delete/`),

    // Bulk Operations for Invoice Proficiency
    bulkDeleteInvoiceProficiency: (ids, data) => Promise.all(ids.map(id => axiosInstance.delete(`/invoice-proficiency/records/${id}/`, { data }))),
    bulkRestoreInvoiceProficiency: (ids) => Promise.all(ids.map(id => axiosInstance.post(`/invoice-proficiency/records/${id}/restore/`))),
    bulkPermanentDeleteInvoiceProficiency: (ids) => Promise.all(ids.map(id => axiosInstance.delete(`/invoice-proficiency/records/${id}/permanent-delete/`))),

    markSeenInvoiceProficiency: (id) => axiosInstance.post(`/invoice-proficiency/records/${id}/mark-seen/`),
    markAllSeenInvoiceProficiency: () => axiosInstance.post('/invoice-proficiency/records/mark-all-seen/'),
};