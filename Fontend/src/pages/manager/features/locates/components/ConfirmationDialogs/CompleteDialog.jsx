import React from 'react';
import { Typography, Box } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { CheckCheck, AlertCircle } from 'lucide-react';
import CommonDialog from '../../../../../../components/ui/CommonDialog';
import {
    GREEN_COLOR,
    TEXT_COLOR,
} from '../../utils/constants';

const CompleteDialog = ({
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
            title="Complete Work Orders"
            variant="success"
            confirmText="Mark as Complete"
            isLoading={isLoading}
            icon={<CheckCheck size={18} />}
        >
            <Typography variant="body2" sx={{ color: TEXT_COLOR, fontSize: '0.85rem', fontWeight: 400, mb: 2 }}>
                Are you sure you want to mark <strong>{selectedCount} work order(s)</strong> as complete?
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
                        These items will be moved to the Completed section.
                    </Typography>
                </Box>
            </Box>
        </CommonDialog>
    );
};

export default CompleteDialog;