import React from 'react';
import { Snackbar, Alert, Typography, useMediaQuery } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { CheckCircle, AlertCircle, AlertTriangle } from 'lucide-react';
import { TEXT_COLOR } from '../../pages/manager/features/locates/utils/constants';

const GREEN_COLOR = '#10b981';
const RED_COLOR = '#ef4444';
const ORANGE_COLOR = '#ed6c02';
const BLUE_COLOR = '#1976d2';

const SnackbarAlert = ({ snackbar, onClose }) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));

    const getBorderColor = (severity) => {
        switch (severity) {
            case 'success':
                return GREEN_COLOR;
            case 'error':
                return RED_COLOR;
            case 'warning':
                return ORANGE_COLOR;
            default:
                return BLUE_COLOR;
        }
    };

    return (
        <Snackbar
            open={snackbar.open}
            autoHideDuration={3000}
            onClose={onClose}
            anchorOrigin={{
                vertical: isMobile ? 'top' : 'bottom',
                horizontal: 'right',
            }}
        >
            <Alert
                onClose={onClose}
                severity={snackbar.severity}
                iconMapping={{
                    success: <CheckCircle size={20} />,
                    error: <AlertCircle size={20} />,
                    warning: <AlertTriangle size={20} />,
                    info: <AlertCircle size={20} />,
                }}
                sx={{
                    width: '100%',
                    borderRadius: '6px',
                    borderLeft: `4px solid ${getBorderColor(snackbar.severity)}`,
                    '& .MuiAlert-message': {
                        py: 0.5,
                    },
                }}
                elevation={6}
            >
                <Typography
                    sx={{
                        fontSize: '0.85rem',
                        fontWeight: 500,
                        color: TEXT_COLOR,
                    }}
                >
                    {snackbar.message}
                </Typography>
            </Alert>
        </Snackbar>
    );
};

export default SnackbarAlert;
