import React from 'react';
import { Typography, Box } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { RotateCcw, AlertCircle } from 'lucide-react';
import CommonDialog from '../../../../../../components/ui/CommonDialog';
import {
    GREEN_COLOR,
    TEXT_COLOR,
} from '../../utils/constants';

const RestoreDialog = ({
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
            title="Restore Items"
            variant="success"
            confirmText="Restore Items"
            isLoading={isLoading}
            icon={<RotateCcw size={18} />}
        >
            <Typography variant="body2" sx={{ color: TEXT_COLOR, fontSize: '0.85rem', fontWeight: 400, mb: 2 }}>
                Are you sure you want to restore <strong>{selectedCount} item(s)</strong> from recycle bin?
            </Typography>
            <Box sx={{
                p: 1.5,
                borderRadius: '6px',
                backgroundColor: alpha(GREEN_COLOR, 0.05),
                border: `1px solid ${alpha(GREEN_COLOR, 0.1)}`,
                display: 'flex',
                alignItems: 'flex-start',
                gap: 1.5,
            }}>
                <AlertCircle size={18} color={GREEN_COLOR} />
                <Box>
                    <Typography variant="body2" sx={{ color: GREEN_COLOR, fontSize: '0.85rem', fontWeight: 500, mb: 0.5 }}>
                        Note
                    </Typography>
                    <Typography variant="caption" sx={{ color: TEXT_COLOR, fontSize: '0.8rem', fontWeight: 400 }}>
                        Restored items will be moved back to the Report Needed stage.
                    </Typography>
                </Box>
            </Box>
        </CommonDialog>
    );
};

export default RestoreDialog;