// modals/StatusToggleModal.jsx
import React from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Box,
    Typography,
    Button,
} from '@mui/material';
import {
    UserX,
    UserCheck,
    X,
    RefreshCw,
} from 'lucide-react';
import OutlineButton from '../ui/OutlineButton';

const TEXT_COLOR = '#0F1115';
const GREEN_COLOR = '#10b981';
const RED_COLOR = '#ef4444';
const GRAY_COLOR = '#6b7280';

export const StatusToggleModal = ({
    open,
    onClose,
    onConfirm,
    item,
    isLoading = false,
    title = "User",
    itemNameKey = "name",
}) => {
    const isActive = item?.isActive;
    const action = isActive ? 'deactivate' : 'activate';
    const actionColor = isActive ? RED_COLOR : GREEN_COLOR;
    const ActionIcon = isActive ? UserX : UserCheck;

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="xs"
            fullWidth
            PaperProps={{
                sx: {
                    borderRadius: '8px',
                    bgcolor: 'white',
                    border: `1px solid ${alpha(actionColor, 0.15)}`,
                }
            }}
        >
            <DialogTitle sx={{
                p: 2,
                borderBottom: `1px solid ${alpha(actionColor, 0.1)}`,
                bgcolor: 'white',
            }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <ActionIcon size={18} color={actionColor} />
                    <Typography
                        sx={{
                            fontSize: '0.95rem',
                            color: TEXT_COLOR,
                            fontWeight: 600,
                        }}
                    >
                        Confirm Status Change
                    </Typography>
                </Box>
            </DialogTitle>
            <DialogContent sx={{ p: 2.5 }}>
                <Box py={1}>
                    <Typography
                        variant="body2"
                        sx={{
                            color: TEXT_COLOR,
                            fontSize: '0.85rem',
                            lineHeight: 1.6,
                        }}
                    >
                        Are you sure you want to {action} the {title.toLowerCase()} <strong>"{item?.[itemNameKey]}"</strong>?
                        <br />
                        <span style={{ color: GRAY_COLOR, fontSize: '0.8rem' }}>
                            {isActive
                                ? "They will no longer be able to access the system."
                                : "They will regain access to the system."
                            }
                        </span>
                    </Typography>
                </Box>
            </DialogContent>
            <DialogActions sx={{ px: 2.5, pb: 2.5, pt: 0 }}>
                <OutlineButton
                    onClick={onClose}
                    startIcon={<X size={16} />}
                >
                    Cancel
                </OutlineButton>
                <Button
                    variant="contained"
                    onClick={onConfirm}
                    disabled={isLoading}
                    startIcon={isLoading ? (
                        <RefreshCw size={14} className="animate-spin" />
                    ) : (
                        <ActionIcon size={16} />
                    )}
                    sx={{
                        fontSize: '0.85rem',
                        textTransform: 'none',
                        px: 2,
                        py: 0.8,
                        bgcolor: actionColor,
                        '&:hover': {
                            bgcolor: alpha(actionColor, 0.9),
                        },
                    }}
                >
                    {isLoading ? 'Updating...' : `${isActive ? 'Deactivate' : 'Activate'} ${title}`}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

const alpha = (color, opacity) => {
    return color + Math.round(opacity * 255).toString(16).padStart(2, '0');
};