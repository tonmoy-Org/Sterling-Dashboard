import React, { createContext, useContext, useState, useCallback } from 'react';
import SnackbarAlert from '../components/common/SnackbarAlert'

const GlobalSnackbarContext = createContext();

export const useGlobalSnackbar = () => {
    return useContext(GlobalSnackbarContext);
};

export const GlobalSnackbarProvider = ({ children }) => {
    const [snackbar, setSnackbar] = useState({
        open: false,
        message: '',
        severity: 'success',
    });

    const showSnackbar = useCallback((message, severity = 'success') => {
        setSnackbar({
            open: true,
            message,
            severity,
        });
    }, []);

    const handleClose = () => {
        setSnackbar(prev => ({ ...prev, open: false }));
    };

    return (
        <GlobalSnackbarContext.Provider value={{ showSnackbar }}>
            {children}
            <SnackbarAlert snackbar={snackbar} onClose={handleClose} />
        </GlobalSnackbarContext.Provider>
    );
};
