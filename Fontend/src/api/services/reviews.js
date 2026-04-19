import axiosInstance from '../axios';

export const reviewsApi = {
  getReviews: (params) => axiosInstance.get('reviews/reviews/', { params }),
  getStats: (params) => axiosInstance.get('reviews/reviews/stats/', { params }),
  patch: (id, data) => axiosInstance.patch(`reviews/reviews/${id}/`, data),
  delete: (id) => axiosInstance.delete(`reviews/reviews/${id}/`),
};
