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
import { Trash2, AlertTriangle, AlertCircle } from 'lucide-react';
import {
    ORANGE_COLOR,
    TEXT_COLOR,
    GRAY_COLOR,
} from '../../utils/constants';

const DeleteDialog = ({
    open,
    onClose,
    onConfirm,
    selectedCount,
    deletionSection,
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
                    border: `1px solid ${alpha(ORANGE_COLOR, 0.1)}`,
                },
            }}
        >
            <DialogTitle sx={dialogTitleStyle}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box sx={dialogIconStyle}>
                        <Trash2 size={18} />
                    </Box>
                    <Box>
                        <Typography variant="h6" sx={dialogTitleTextStyle}>
                            Move to Recycle Bin
                        </Typography>
                        <Typography variant="caption" sx={dialogSubtitleStyle}>
                            Items can be restored from the recycle bin
                        </Typography>
                    </Box>
                </Box>
            </DialogTitle>
            <DialogContent sx={dialogContentStyle}>
                <Typography variant="body2" sx={messageStyle}>
                    Are you sure you want to move <strong>{selectedCount} item(s)</strong> from the{' '}
                    <strong>{deletionSection}</strong> section to the recycle bin?
                </Typography>
                <Box sx={noteBoxStyle}>
                    <AlertCircle size={18} color={ORANGE_COLOR} />
                    <Box>
                        <Typography variant="body2" sx={noteTitleStyle}>
                            Note
                        </Typography>
                        <Typography variant="caption" sx={noteTextStyle}>
                            Items moved to the recycle bin can be restored later. Permanent deletion is only available in the recycle bin.
                        </Typography>
                    </Box>
                </Box>
            </DialogContent>
            <DialogActions sx={dialogActionsStyle}>
                <Button onClick={onClose} sx={cancelButtonStyle}>
                    Cancel
                </Button>
                <Button
                    onClick={onConfirm}
                    variant="contained"
                    color="warning"
                    startIcon={<Trash2 size={12} />}
                    disabled={isLoading}
                    sx={confirmButtonStyle}
                >
                    {isLoading ? 'Moving...' : 'Move to Recycle Bin'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

const dialogTitleStyle = {
    borderBottom: `1px solid ${alpha(ORANGE_COLOR, 0.1)}`,
    pb: 1.5,
};

const dialogIconStyle = {
    width: 32,
    height: 32,
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: alpha(ORANGE_COLOR, 0.1),
    color: ORANGE_COLOR,
};

const dialogTitleTextStyle = {
    color: TEXT_COLOR,
    fontSize: '0.95rem',
    fontWeight: 600,
    lineHeight: 1.2,
};

const dialogSubtitleStyle = {
    color: GRAY_COLOR,
    fontSize: '0.75rem',
    fontWeight: 400,
};

const dialogContentStyle = {
    pt: 2.5,
    pb: 1.5,
};

const messageStyle = {
    color: TEXT_COLOR,
    fontSize: '0.85rem',
    fontWeight: 400,
    mb: 2,
};

const noteBoxStyle = {
    p: 1.5,
    borderRadius: '6px',
    backgroundColor: alpha(ORANGE_COLOR, 0.05),
    border: `1px solid ${alpha(ORANGE_COLOR, 0.1)}`,
    display: 'flex',
    alignItems: 'flex-start',
    gap: 1.5,
};

const noteTitleStyle = {
    color: ORANGE_COLOR,
    fontSize: '0.85rem',
    fontWeight: 500,
    mb: 0.5,
};

const noteTextStyle = {
    color: TEXT_COLOR,
    fontSize: '0.8rem',
    fontWeight: 400,
};

const dialogActionsStyle = {
    p: 2,
    pt: 1.5,
};

const cancelButtonStyle = {
    textTransform: 'none',
    color: TEXT_COLOR,
    fontSize: '0.85rem',
    fontWeight: 400,
    px: 2,
};

const confirmButtonStyle = {
    textTransform: 'none',
    fontSize: '0.8rem',
    fontWeight: 500,
    borderRadius: '2px',
    px: 2,
    bgcolor: '#10b981',
    boxShadow: 'none',
    '&:hover': {
        bgcolor: alpha('#10b981', 0.9),
        boxShadow: 'none',
    },
};

export default DeleteDialog;