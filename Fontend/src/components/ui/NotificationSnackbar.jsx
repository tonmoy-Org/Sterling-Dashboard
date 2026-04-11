// components/NotificationSnackbar.jsx
import React from 'react';
import { Snackbar, Alert, Typography } from '@mui/material';
import { CheckCircle, XCircle } from 'lucide-react';

const TEXT_COLOR = '#0F1115';
const GREEN_COLOR = '#10b981';
const RED_COLOR = '#ef4444';

export const NotificationSnackbar = ({
    success,
    error,
    onSuccessClose,
    onErrorClose,
}) => {
    const alpha = (color, opacity) => {
        return color + Math.round(opacity * 255).toString(16).padStart(2, '0');
    };

    return (
        <>
            {/* Success Notification */}
            <Snackbar
                open={!!success}
                autoHideDuration={3000}
                onClose={onSuccessClose}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            >
                <Alert
                    severity="success"
                    icon={<CheckCircle size={20} />}
                    sx={{
                        width: '100%',
                        borderRadius: '6px',
                        backgroundColor: alpha(GREEN_COLOR, 0.05),
                        borderLeft: `4px solid ${GREEN_COLOR}`,
                        '& .MuiAlert-icon': {
                            color: GREEN_COLOR,
                        },
                    }}
                >
                    <Typography
                        sx={{
                            fontSize: '0.85rem',
                            fontWeight: 500,
                            color: TEXT_COLOR,
                        }}
                    >
                        {success}
                    </Typography>
                </Alert>
            </Snackbar>

            {/* Error Notification */}
            <Snackbar
                open={!!error}
                autoHideDuration={3000}
                onClose={onErrorClose}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            >
                <Alert
                    severity="error"
                    icon={<XCircle size={20} />}
                    sx={{
                        width: '100%',
                        borderRadius: '6px',
                        backgroundColor: alpha(RED_COLOR, 0.05),
                        borderLeft: `4px solid ${RED_COLOR}`,
                        '& .MuiAlert-icon': {
                            color: RED_COLOR,
                        },
                    }}
                >
                    <Typography
                        sx={{
                            fontSize: '0.85rem',
                            fontWeight: 500,
                            color: TEXT_COLOR,
                        }}
                    >
                        {error}
                    </Typography>
                </Alert>
            </Snackbar>
        </>
    );
};