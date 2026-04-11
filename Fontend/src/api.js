import axios from 'axios';

// Automatically use the current hostname but point to port 8003 for local dev,
// or use the relative path if in production.
const IS_DEV = import.meta.env.DEV;
const API_BASE_URL = IS_DEV 
    ? 'http://localhost:8003/health-check/' // Our backend's status app
    : '/health-check/'; // In production, they'll likely be served together or via proxy

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

export default api;
