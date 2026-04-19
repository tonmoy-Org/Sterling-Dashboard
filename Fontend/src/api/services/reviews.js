import axiosInstance from '../axios';

export const reviewsApi = {
  getReviews: (params) => axiosInstance.get('reviews/reviews/', { params }),
  getAll: (params) => axiosInstance.get('reviews/reviews/', { params }),
  getStats: (params) => axiosInstance.get('reviews/reviews/stats/', { params }),
  getAnalysis: (params) => axiosInstance.get('reviews/reviews/analysis/', { params }),
  patch: (id, data) => axiosInstance.patch(`reviews/reviews/${id}/`, data),
  delete: (id) => axiosInstance.delete(`reviews/reviews/${id}/`),
  markSeen: (id) => axiosInstance.post(`reviews/reviews/${id}/mark_seen/`),
  markAllSeen: () => axiosInstance.post('reviews/reviews/mark_all_seen/'),
};
