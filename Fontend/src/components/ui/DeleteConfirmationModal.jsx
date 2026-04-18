import React from 'react';
import { Typography, Box } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { AlertTriangle } from 'lucide-react';
import CommonDialog from './CommonDialog';

const TEXT_COLOR = '#0F1115';
const RED_COLOR = '#ef4444';
const GRAY_COLOR = '#6b7280';

export const DeleteConfirmationModal = ({
    open,
    onClose,
    onConfirm,
    item,
    isLoading = false,
    title = "Item",
    itemNameKey = "name",
    warningText,
    disableConfirm = false,
}) => {
    return (
        <CommonDialog
            open={open}
            onClose={onClose}
            onConfirm={onConfirm}
            title={`Confirm Delete`}
            variant="danger"
            confirmText={isLoading ? "Deleting..." : `Delete ${title}`}
            isLoading={isLoading}
            disabled={disableConfirm}
        >
            <Box py={0.5}>
                <Typography
                    variant="body2"
                    sx={{
                        color: TEXT_COLOR,
                        fontSize: '0.88rem',
                        lineHeight: 1.6,
                        mb: 2
                    }}
                >
                    Are you sure you want to delete the {title.toLowerCase()} <strong>"{item?.[itemNameKey] || 'this item'}"</strong>?
                </Typography>

                {warningText && (
                    <Box sx={{ 
                        p: 1.5, 
                        borderRadius: '8px', 
                        bgcolor: alpha(RED_COLOR, 0.05), 
                        border: `1px solid ${alpha(RED_COLOR, 0.1)}`,
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 1.25,
                        mb: 2
                    }}>
                        <AlertTriangle size={16} color={RED_COLOR} style={{ flexShrink: 0, marginTop: 2 }} />
                        <Typography variant="caption" sx={{ color: RED_COLOR, fontWeight: 500, lineHeight: 1.4 }}>
                            {warningText}
                        </Typography>
                    </Box>
                )}

                <Typography sx={{ color: GRAY_COLOR, fontSize: '0.8rem', fontStyle: 'italic' }}>
                    This action cannot be undone and will permanently remove the record.
                </Typography>
            </Box>
        </CommonDialog>
    );
};