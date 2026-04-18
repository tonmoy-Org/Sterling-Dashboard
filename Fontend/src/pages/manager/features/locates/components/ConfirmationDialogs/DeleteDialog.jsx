import React from 'react';
import { Typography, Box } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { Trash2, AlertCircle } from 'lucide-react';
import CommonDialog from '../../../../../../components/ui/CommonDialog';
import {
    ORANGE_COLOR,
    TEXT_COLOR,
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
        <CommonDialog
            open={open}
            onClose={onClose}
            onConfirm={onConfirm}
            title="Move to Recycle Bin"
            variant="warning"
            confirmText="Move to Recycle Bin"
            isLoading={isLoading}
            icon={<Trash2 size={18} />}
        >
            <Typography variant="body2" sx={{ color: TEXT_COLOR, fontSize: '0.85rem', fontWeight: 400, mb: 2 }}>
                Are you sure you want to move <strong>{selectedCount} item(s)</strong> from the{' '}
                <strong>{deletionSection}</strong> section to the recycle bin?
            </Typography>
            <Box sx={{
                p: 1.5,
                borderRadius: '6px',
                backgroundColor: alpha(ORANGE_COLOR, 0.05),
                border: `1px solid ${alpha(ORANGE_COLOR, 0.1)}`,
                display: 'flex',
                alignItems: 'flex-start',
                gap: 1.5,
            }}>
                <AlertCircle size={18} color={ORANGE_COLOR} />
                <Box>
                    <Typography variant="body2" sx={{ color: ORANGE_COLOR, fontSize: '0.85rem', fontWeight: 500, mb: 0.5 }}>
                        Note
                    </Typography>
                    <Typography variant="caption" sx={{ color: TEXT_COLOR, fontSize: '0.8rem', fontWeight: 400 }}>
                        Items moved to the recycle bin can be restored later. Permanent deletion is only available in the recycle bin.
                    </Typography>
                </Box>
            </Box>
        </CommonDialog>
    );
};

export default DeleteDialog;