import api from '../axios';

export const callrailApi = {
    getLogs: async () => {
        const response = await api.get('/callrail/logs/');
        return response.data;
    },
};
