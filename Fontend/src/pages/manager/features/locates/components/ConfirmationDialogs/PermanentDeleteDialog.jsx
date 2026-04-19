import React from 'react';
import { Typography, Box, Alert } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { Trash2, AlertTriangle } from 'lucide-react';
import CommonDialog from '../../../../../../components/ui/CommonDialog';
import {
    RED_COLOR,
    TEXT_COLOR,
} from '../../utils/constants';

const PermanentDeleteDialog = ({
    open,
    onClose,
    onConfirm,
    selectedCount,
    isLoading,
}) => {
    return (
        <CommonDialog
            open={open}
            onClose={onClose}
            onConfirm={onConfirm}
            title="Permanent Delete"
            variant="danger"
            confirmText="Delete Permanently"
            isLoading={isLoading}
            icon={<Trash2 size={18} />}
        >
            <Typography variant="body2" sx={{ color: TEXT_COLOR, fontSize: '0.85rem', fontWeight: 400, mb: 2 }}>
                Are you sure you want to permanently delete <strong>{selectedCount} item(s)</strong> from the recycle bin?
            </Typography>
            <Alert
                severity="error"
                icon={<AlertTriangle size={20} />}
                sx={{
                    borderRadius: '6px',
                    backgroundColor: alpha(RED_COLOR, 0.05),
                    color: TEXT_COLOR,
                    '& .MuiAlert-icon': {
                        color: RED_COLOR,
                    },
                }}
            >
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    Warning: This action is irreversible
                </Typography>
                <Typography variant="caption" sx={{ display: 'block', mt: 0.5 }}>
                    All selected items will be permanently removed and cannot be recovered.
                </Typography>
            </Alert>
        </CommonDialog>
    );
};

export default PermanentDeleteDialog;