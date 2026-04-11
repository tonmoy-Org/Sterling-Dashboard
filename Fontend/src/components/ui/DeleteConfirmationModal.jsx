// modals/DeleteConfirmationModal.jsx
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
    Trash2,
    X,
    RefreshCw,
} from 'lucide-react';
import OutlineButton from '../ui/OutlineButton';

const TEXT_COLOR = '#0F1115';
const RED_COLOR = '#ef4444';
const GRAY_COLOR = '#6b7280';

export const DeleteConfirmationModal = ({
    open,
    onClose,
    onConfirm,
    item,
    isLoading = false,
    title = "User",
    itemNameKey = "name",
}) => {
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
                    border: `1px solid ${alpha(RED_COLOR, 0.15)}`,
                }
            }}
        >
            <DialogTitle sx={{
                p: 2,
                borderBottom: `1px solid ${alpha(RED_COLOR, 0.1)}`,
                bgcolor: 'white',
            }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Trash2 size={18} color={RED_COLOR} />
                    <Typography
                        sx={{
                            fontSize: '0.95rem',
                            color: TEXT_COLOR,
                            fontWeight: 600,
                        }}
                    >
                        Confirm Delete
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
                        Are you sure you want to delete the {title.toLowerCase()} <strong>"{item?.[itemNameKey]}"</strong>?
                        <br />
                        <span style={{ color: GRAY_COLOR, fontSize: '0.8rem' }}>
                            This action cannot be undone.
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
                    sx={{
                        color: 'white',
                        borderRadius: '6px',
                        padding: '6px 20px',
                        fontWeight: 500,
                        fontSize: '0.85rem',
                        textTransform: 'none',
                        bgcolor: RED_COLOR,
                        '&:hover': {
                            bgcolor: alpha(RED_COLOR, 0.9),
                        },
                    }}
                    onClick={onConfirm}
                    disabled={isLoading}
                    startIcon={isLoading ? (
                        <RefreshCw size={14} className="animate-spin" />
                    ) : (
                        <Trash2 size={16} />
                    )}
                >
                    {isLoading ? 'Deleting...' : `Delete ${title}`}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

const alpha = (color, opacity) => {
    return color + Math.round(opacity * 255).toString(16).padStart(2, '0');
};