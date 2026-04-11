import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const ScrapingContext = createContext(null);

const STORAGE_KEY = 'scraping_loading';
const LOADING_TIMEOUT = 5 * 60 * 1000;

export const ScrapingProvider = ({ children }) => {
    const [loading, setLoadingState] = useState(() => {
        try {
            return localStorage.getItem(STORAGE_KEY) === 'true';
        } catch (error) {
            console.warn('Failed to read from localStorage:', error);
            return false;
        }
    });

    const setLoading = useCallback((value) => {
        try {
            localStorage.setItem(STORAGE_KEY, String(value));
            setLoadingState(value);
        } catch (error) {
            console.error('Failed to persist loading state:', error);
            setLoadingState(value);
        }
    }, []);

    useEffect(() => {
        if (!loading) return;

        const timeoutId = setTimeout(() => {
            console.warn(
                'Scraping state stuck for 5 minutes. Auto-recovering...'
            );
            setLoading(false);
        }, LOADING_TIMEOUT);

        return () => clearTimeout(timeoutId);
    }, [loading, setLoading]);

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