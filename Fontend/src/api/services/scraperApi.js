import axiosInstance from '../axios';
import statusAxios from '../status_axios';

export const scraperApi = {
    run: () => axiosInstance.post('/scraper/run'),
    getStatus: () => axiosInstance.get('/scraper/status/'),
    getHealthDispatcher: () => statusAxios.get('/health/dispatcher/')
};
