import axiosInstance from '../axios';

export const timeTrackingApi = {
    // Time Tracking Records
    getTimeTracking: (params) => axiosInstance.get('/time-tracking/', { params }),
    getDeletedTimeTracking: () => axiosInstance.get('/time-tracking/', { params: { is_deleted: true } }),
    
    // Scraper Control
    startTimeTrackingScraping: () => axiosInstance.post('/work-orders-today/start-time-tracking-scraping/'),
    startTimeTrackingCombinedScraping: () => axiosInstance.post('/work-orders-today/start-time-tracking-combined-scraping/'),
    
    // Actions
    updateTimeTracking: (id, data) => axiosInstance.patch(`/time-tracking/${id}/`, data),
    softDeleteTimeTracking: (id) => axiosInstance.post(`/time-tracking/${id}/soft_delete/`),
    restoreTimeTracking: (id) => axiosInstance.post(`/time-tracking/${id}/restore/`),
    deleteTimeTracking: (id) => axiosInstance.delete(`/time-tracking/${id}/`),
    markAsSeen: (id) => axiosInstance.post(`/time-tracking/${id}/mark_as_seen/`),
    
    // Bulk Actions
    bulkSoftDeleteTimeTracking: (ids) => axiosInstance.post('/time-tracking/bulk_soft_delete/', { ids }),
    bulkRestoreTimeTracking: (ids) => axiosInstance.post('/time-tracking/bulk_restore/', { ids }),
    bulkDeleteTimeTracking: (ids) => axiosInstance.post('/time-tracking/bulk_delete/', { ids }),
    bulkMarkAsSeen: (ids) => axiosInstance.post('/time-tracking/bulk_mark_as_seen/', { ids }),
};
