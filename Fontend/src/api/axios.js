import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL;

const axiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

let isRedirectingToLogin = false;

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Only redirect if we have a token (real auth failure), not already logged out
      const hadToken = !!localStorage.getItem('authToken');
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');

      // Guard: don't redirect if already on /login or a redirect is already in progress
      const isOnLoginPage = window.location.pathname === '/login';
      if (hadToken && !isOnLoginPage && !isRedirectingToLogin) {
        isRedirectingToLogin = true;
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
