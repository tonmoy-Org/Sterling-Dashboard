import React from 'react';
import { Typography, Box } from '@mui/material';
import { UserX, UserCheck } from 'lucide-react';
import CommonDialog from './CommonDialog';

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
    const variant = isActive ? 'danger' : 'success';
    const ActionIcon = isActive ? UserX : UserCheck;

    return (
        <CommonDialog
            open={open}
            onClose={onClose}
            onConfirm={onConfirm}
            title="Confirm Status Change"
            variant={variant}
            confirmText={isLoading ? "Updating..." : `${isActive ? 'Deactivate' : 'Activate'} ${title}`}
            isLoading={isLoading}
            icon={<ActionIcon size={18} />}
        >
            <Box py={0.5}>
                <Typography
                    variant="body2"
                    sx={{
                        color: TEXT_COLOR,
                        fontSize: '0.88rem',
                        lineHeight: 1.6,
                        mb: 1
                    }}
                >
                    Are you sure you want to {action} the {title.toLowerCase()} <strong>"{item?.[itemNameKey]}"</strong>?
                </Typography>
                <Typography sx={{ color: GRAY_COLOR, fontSize: '0.85rem' }}>
                    {isActive
                        ? "They will no longer be able to access the system."
                        : "They will regain access to the system."
                    }
                </Typography>
            </Box>
        </CommonDialog>
    );
};