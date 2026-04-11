import React from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Typography,
    Box,
    Alert,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { Trash2, AlertTriangle } from 'lucide-react';
import {
    RED_COLOR,
    TEXT_COLOR,
    GRAY_COLOR,
} from '../../utils/constants';

const PermanentDeleteDialog = ({
    open,
    onClose,
    onConfirm,
    selectedCount,
    isLoading,
}) => {
    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="sm"
            fullWidth
            PaperProps={{
                sx: {
                    bgcolor: 'white',
                    borderRadius: '6px',
                    border: `1px solid ${alpha(RED_COLOR, 0.1)}`,
                },
            }}
        >
            <DialogTitle sx={permanentDialogTitleStyle}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box sx={permanentDialogIconStyle}>
                        <Trash2 size={18} />
                    </Box>
                    <Box>
                        <Typography variant="h6" sx={permanentDialogTitleTextStyle}>
                            Permanent Delete
                        </Typography>
                        <Typography variant="caption" sx={permanentDialogSubtitleStyle}>
                            This action cannot be undone
                        </Typography>
                    </Box>
                </Box>
            </DialogTitle>
            <DialogContent sx={permanentDialogContentStyle}>
                <Typography variant="body2" sx={permanentMessageStyle}>
                    Are you sure you want to permanently delete <strong>{selectedCount} item(s)</strong> from the recycle bin?
                </Typography>
                <Alert
                    severity="error"
                    icon={<AlertTriangle size={20} />}
                    sx={permanentWarningAlertStyle}
                >
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        Warning: This action is irreversible
                    </Typography>
                    <Typography variant="caption" sx={{ display: 'block', mt: 0.5 }}>
                        All selected items will be permanently removed and cannot be recovered.
                    </Typography>
                </Alert>
            </DialogContent>
            <DialogActions sx={permanentDialogActionsStyle}>
                <Button onClick={onClose} sx={permanentCancelButtonStyle}>
                    Cancel
                </Button>
                <Button
                    onClick={onConfirm}
                    variant="contained"
                    color="error"
                    startIcon={<Trash2 size={12} />}
                    disabled={isLoading}
                    sx={permanentConfirmButtonStyle}
                >
                    {isLoading ? 'Deleting...' : 'Delete Permanently'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

// Styles for PermanentDeleteDialog
const permanentDialogTitleStyle = {
    borderBottom: `1px solid ${alpha(RED_COLOR, 0.1)}`,
    pb: 1.5,
};

const permanentDialogIconStyle = {
    width: 32,
    height: 32,
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: alpha(RED_COLOR, 0.1),
    color: RED_COLOR,
};

const permanentDialogTitleTextStyle = {
    color: TEXT_COLOR,
    fontSize: '0.95rem',
    fontWeight: 600,
    lineHeight: 1.2,
};

const permanentDialogSubtitleStyle = {
    color: GRAY_COLOR,
    fontSize: '0.75rem',
    fontWeight: 400,
};

const permanentDialogContentStyle = {
    pt: 2.5,
    pb: 1.5,
};

const permanentMessageStyle = {
    color: TEXT_COLOR,
    fontSize: '0.85rem',
    fontWeight: 400,
    mb: 2,
};

const permanentWarningAlertStyle = {
    borderRadius: '6px',
    backgroundColor: alpha(RED_COLOR, 0.05),
    '& .MuiAlert-icon': {
        color: RED_COLOR,
    },
};

const permanentDialogActionsStyle = {
    p: 2,
    pt: 1.5,
};

const permanentCancelButtonStyle = {
    textTransform: 'none',
    color: TEXT_COLOR,
    fontSize: '0.85rem',
    fontWeight: 400,
    px: 2,
};

const permanentConfirmButtonStyle = {
    textTransform: 'none',
    fontSize: '0.8rem',
    fontWeight: 500,
    borderRadius: '2px',
    px: 2,
    bgcolor: RED_COLOR,
    boxShadow: 'none',
    '&:hover': {
        bgcolor: alpha(RED_COLOR, 0.9),
        boxShadow: 'none',
    },
};

export default PermanentDeleteDialog;