import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { rmeApi } from '../api/services/rmeApi';

const ScrapingContext = createContext(null);

const STORAGE_KEY = 'scraping_loading';
const POLL_INTERVAL = 3000; // Poll every 3 seconds

export const ScrapingProvider = ({ children }) => {
    const [loading, setLoadingState] = useState(() => {
        try {
            return localStorage.getItem(STORAGE_KEY) === 'true';
        } catch (error) {
            console.warn('Failed to read from localStorage:', error);
            return false;
        }
    });

    // We use a ref to track the latest state inside the setInterval
    const loadingRef = useRef(loading);

    const setLoading = useCallback((value) => {
        try {
            localStorage.setItem(STORAGE_KEY, String(value));
            setLoadingState(value);
            loadingRef.current = value;
        } catch (error) {
            console.error('Failed to persist loading state:', error);
            setLoadingState(value);
            loadingRef.current = value;
        }
    }, []);

    // Effect to continuously check actual backend server status
    useEffect(() => {
        const checkStatus = async () => {
            try {
                const response = await rmeApi.getScraperStatus();
                const isRunning = response.data?.is_running;

                // Sync UI state dynamically to actual backend state
                if (isRunning === true && !loadingRef.current) {
                    setLoading(true);
                } else if (isRunning === false && loadingRef.current) {
                    setLoading(false);
                }
            } catch (error) {
                console.error('Failed to poll scraper status:', error);
            }
        };

        // Check immediately on mount to clear falsy local storage state
        checkStatus();

        // Loop indefinitely every 3s
        const intervalId = setInterval(checkStatus, POLL_INTERVAL);

        return () => clearInterval(intervalId);
    }, [setLoading]);

    const value = {
        loading,
        setLoading,
    };

    return (
        <ScrapingContext.Provider value={value}>
            {children}
        </ScrapingContext.Provider>
    );
};

export const useScraping = () => {
    const context = useContext(ScrapingContext);

    if (context === null) {
        throw new Error(
            'useScraping must be used within a <ScrapingProvider>. ' +
            'Ensure your component tree includes the provider at or above this component.'
        );
    }

    return context;
};