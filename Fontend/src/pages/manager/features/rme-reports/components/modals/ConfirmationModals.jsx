import React from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Box,
    Typography,
    Button,
    CircularProgress,
    Alert
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
    Trash2,
    RotateCcw,
    AlertTriangle,
    AlertCircle,
    Lock,
    XCircle
} from 'lucide-react';

import {
    TEXT_COLOR,
    GRAY_COLOR,
    ORANGE_COLOR,
    GREEN_COLOR,
    RED_COLOR,
    BLUE_COLOR
} from '../../utils/constants';

const BaseModal = ({
    children,
    open,
    onClose,
    icon: Icon,
    iconColor,
    title,
    subtitle,
    borderColor = GRAY_COLOR
}) => (
    <Dialog
        open={open}
        onClose={onClose}
        maxWidth="sm"
        fullWidth
        PaperProps={{
            sx: {
                bgcolor: 'white',
                borderRadius: '6px',
                border: `1px solid ${alpha(borderColor, 0.1)}`
            }
        }}
    >
        <DialogTitle
            sx={{
                borderBottom: `1px solid ${alpha(borderColor, 0.1)}`,
                pb: 1.5,
                pt: 2
            }}
        >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box
                    sx={{
                        width: 32,
                        height: 32,
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: alpha(iconColor, 0.1),
                        color: iconColor
                    }}
                >
                    {Icon}
                </Box>
                <Box>
                    <Typography
                        sx={{
                            color: TEXT_COLOR,
                            fontSize: '0.95rem',
                            fontWeight: 600
                        }}
                    >
                        {title}
                    </Typography>
                    {subtitle && (
                        <Typography
                            sx={{
                                color: GRAY_COLOR,
                                fontSize: '0.7rem',
                                mt: 0.25
                            }}
                        >
                            {subtitle}
                        </Typography>
                    )}
                </Box>
            </Box>
        </DialogTitle>
        {children}
    </Dialog>
);

const BaseModalActions = ({
    onClose,
    onConfirm,
    isLoading,
    confirmText,
    confirmColor,
    cancelText = 'Cancel',
    confirmIcon,
    isDestructive = false
}) => (
    <DialogActions sx={{ p: 2 }}>
        <Button
            onClick={onClose}
            disabled={isLoading}
            variant="outlined"
            sx={{
                textTransform: 'none',
                fontSize: '0.8rem',
                fontWeight: 400,
                color: TEXT_COLOR,
                borderColor: alpha(TEXT_COLOR, 0.2),
                '&:hover': {
                    borderColor: TEXT_COLOR,
                    backgroundColor: alpha(TEXT_COLOR, 0.05)
                },
                px: 2.5
            }}
        >
            {cancelText}
        </Button>
        <Button
            onClick={onConfirm}
            variant="contained"
            disabled={isLoading}
            startIcon={
                isLoading ? (
                    <CircularProgress size={14} sx={{ color: 'white' }} />
                ) : (
                    confirmIcon
                )
            }
            sx={{
                textTransform: 'none',
                fontSize: '0.8rem',
                fontWeight: 500,
                bgcolor: confirmColor,
                boxShadow: 'none',
                '&:hover': {
                    bgcolor: alpha(confirmColor, 0.9),
                    boxShadow: 'none'
                },
                px: 2.5,
                minWidth: 120
            }}
        >
            {isLoading ? `${confirmText}...` : confirmText}
        </Button>
    </DialogActions>
);

export const DeleteConfirmationModal = ({
    open,
    onClose,
    title = "Move to Recycle Bin",
    message,
    count,
    section,
    isLoading,
    onConfirm,
    actionText = 'Move to Recycle Bin'
}) => (
    <BaseModal
        open={open}
        onClose={onClose}
        icon={<Trash2 size={18} />}
        iconColor={ORANGE_COLOR}
        title={title}
        subtitle="Items can be restored from recycle bin"
        borderColor={ORANGE_COLOR}
    >
        <DialogContent sx={{ pt: 2.5 }}>
            <Typography sx={{ fontSize: '0.75rem', mb: 2, color: TEXT_COLOR }}>
                {message || `Are you sure you want to move ${count} item(s) from the ${section} section to recycle bin?`}
            </Typography>

            <Box
                sx={{
                    p: 1.5,
                    borderRadius: '6px',
                    backgroundColor: alpha(ORANGE_COLOR, 0.05),
                    border: `1px solid ${alpha(ORANGE_COLOR, 0.1)}`,
                    display: 'flex',
                    gap: 1.5,
                    alignItems: 'flex-start'
                }}
            >
                <AlertCircle size={18} color={ORANGE_COLOR} style={{ marginTop: 2 }} />
                <Box>
                    <Typography
                        sx={{
                            color: ORANGE_COLOR,
                            fontSize: '0.75rem',
                            fontWeight: 500,
                            mb: 0.25
                        }}
                    >
                        Note
                    </Typography>
                    <Typography sx={{ fontSize: '0.75rem', color: TEXT_COLOR }}>
                        Items moved to recycle bin can be restored later.
                    </Typography>
                </Box>
            </Box>
        </DialogContent>

        <BaseModalActions
            onClose={onClose}
            onConfirm={onConfirm}
            isLoading={isLoading}
            confirmText={actionText}
            confirmColor={ORANGE_COLOR}
            confirmIcon={<Trash2 size={16} />}
        />
    </BaseModal>
);

export const RestoreConfirmationModal = ({
    open,
    onClose,
    count,
    isLoading,
    onConfirm
}) => (
    <BaseModal
        open={open}
        onClose={onClose}
        icon={<RotateCcw size={18} />}
        iconColor={GREEN_COLOR}
        title="Restore Items"
        subtitle="Restore items from recycle bin"
        borderColor={GREEN_COLOR}
    >
        <DialogContent sx={{ pt: 2.5 }}>
            <Typography sx={{ fontSize: '0.75rem', mb: 2, color: TEXT_COLOR }}>
                Are you sure you want to restore <strong>{count}</strong> item(s) from recycle bin?
            </Typography>

            <Box
                sx={{
                    p: 1.5,
                    borderRadius: '6px',
                    backgroundColor: alpha(GREEN_COLOR, 0.05),
                    border: `1px solid ${alpha(GREEN_COLOR, 0.1)}`,
                    display: 'flex',
                    gap: 1.5,
                    alignItems: 'flex-start'
                }}
            >
                <AlertCircle size={18} color={GREEN_COLOR} style={{ marginTop: 2 }} />
                <Box>
                    <Typography
                        sx={{
                            color: GREEN_COLOR,
                            fontSize: '0.75rem',
                            fontWeight: 500,
                            mb: 0.25
                        }}
                    >
                        Note
                    </Typography>
                    <Typography sx={{ fontSize: '0.75rem', color: TEXT_COLOR }}>
                        Items will be restored to their original sections.
                    </Typography>
                </Box>
            </Box>
        </DialogContent>

        <BaseModalActions
            onClose={onClose}
            onConfirm={onConfirm}
            isLoading={isLoading}
            confirmText="Restore Items"
            confirmColor={GREEN_COLOR}
            confirmIcon={<RotateCcw size={16} />}
        />
    </BaseModal>
);

export const PermanentDeleteConfirmationModal = ({
    open,
    onClose,
    count,
    isLoading,
    onConfirm
}) => (
    <BaseModal
        open={open}
        onClose={onClose}
        icon={<Trash2 size={18} />}
        iconColor={RED_COLOR}
        title="Permanent Delete"
        subtitle="This action cannot be undone"
        borderColor={RED_COLOR}
    >
        <DialogContent sx={{ pt: 2.5 }}>
            <Typography sx={{ fontSize: '0.75rem', mb: 2, color: TEXT_COLOR }}>
                Are you sure you want to permanently delete <strong>{count}</strong> item(s)?
            </Typography>

            <Box
                sx={{
                    p: 1.5,
                    borderRadius: '6px',
                    backgroundColor: alpha(RED_COLOR, 0.05),
                    border: `1px solid ${alpha(RED_COLOR, 0.1)}`,
                    display: 'flex',
                    gap: 1.5,
                    alignItems: 'flex-start'
                }}
            >
                <AlertTriangle size={18} color={RED_COLOR} style={{ marginTop: 2 }} />
                <Box>
                    <Typography
                        sx={{
                            color: RED_COLOR,
                            fontSize: '0.75rem',
                            fontWeight: 500,
                            mb: 0.25
                        }}
                    >
                        Warning
                    </Typography>
                    <Typography sx={{ fontSize: '0.75rem', color: TEXT_COLOR }}>
                        This action cannot be undone. Items will be permanently removed and cannot be recovered.
                    </Typography>
                </Box>
            </Box>
        </DialogContent>

        <BaseModalActions
            onClose={onClose}
            onConfirm={onConfirm}
            isLoading={isLoading}
            confirmText="Delete Permanently"
            confirmColor={RED_COLOR}
            confirmIcon={<Trash2 size={16} />}
            isDestructive={true}
        />
    </BaseModal>
);

export const LockConfirmationModal = ({
    open,
    onClose,
    itemData,
    isLoading,
    onConfirm
}) => (
    <BaseModal
        open={open}
        onClose={onClose}
        icon={<Lock size={18} />}
        iconColor={GREEN_COLOR}
        title="Confirm Lock Action"
        subtitle="Lock report and move to finalized"
        borderColor={GREEN_COLOR}
    >
        <DialogContent sx={{ pt: 2.5 }}>
            <Typography sx={{ fontSize: '0.75rem', mb: 2, color: TEXT_COLOR }}>
                Lock this report and move it to the Finalized section?
            </Typography>

            {itemData && (
                <Box
                    sx={{
                        p: 1.5,
                        borderRadius: '6px',
                        backgroundColor: alpha(GREEN_COLOR, 0.05),
                        border: `1px solid ${alpha(GREEN_COLOR, 0.1)}`,
                        mb: 2
                    }}
                >
                    <Typography
                        sx={{
                            color: TEXT_COLOR,
                            fontSize: '0.75rem',
                            fontWeight: 500,
                            mb: 0.5
                        }}
                    >
                        Work Order Details
                    </Typography>
                    <Typography sx={{ fontSize: '0.75rem', color: TEXT_COLOR }}>
                        <strong>WO#:</strong> {itemData.woNumber || itemData.wo_number}
                    </Typography>
                    <Typography sx={{ fontSize: '0.75rem', color: TEXT_COLOR }}>
                        <strong>Address:</strong> {itemData.street}
                    </Typography>
                    <Typography sx={{ fontSize: '0.75rem', color: TEXT_COLOR }}>
                        <strong>City:</strong> {itemData.city}, {itemData.state} {itemData.zip}
                    </Typography>
                </Box>
            )}

            <Box
                sx={{
                    p: 1.5,
                    borderRadius: '6px',
                    backgroundColor: alpha(GREEN_COLOR, 0.05),
                    border: `1px solid ${alpha(GREEN_COLOR, 0.1)}`,
                    display: 'flex',
                    gap: 1.5,
                    alignItems: 'flex-start'
                }}
            >
                <AlertCircle size={18} color={GREEN_COLOR} style={{ marginTop: 2 }} />
                <Box>
                    <Typography
                        sx={{
                            color: GREEN_COLOR,
                            fontSize: '0.75rem',
                            fontWeight: 500,
                            mb: 0.25
                        }}
                    >
                        Note
                    </Typography>
                    <Typography sx={{ fontSize: '0.75rem', color: TEXT_COLOR }}>
                        Locked reports cannot be edited and will appear in the Finalized section.
                    </Typography>
                </Box>
            </Box>
        </DialogContent>

        <BaseModalActions
            onClose={onClose}
            onConfirm={onConfirm}
            isLoading={isLoading}
            confirmText="Lock Report"
            confirmColor={GREEN_COLOR}
            confirmIcon={<Lock size={16} />}
        />
    </BaseModal>
);

export const DiscardConfirmationModal = ({
    open,
    onClose,
    itemData,
    isLoading,
    onConfirm
}) => (
    <BaseModal
        open={open}
        onClose={onClose}
        icon={<XCircle size={18} />}
        iconColor={RED_COLOR}
        title="Confirm Discard Action"
        subtitle="Discard report and mark as deleted"
        borderColor={RED_COLOR}
    >
        <DialogContent sx={{ pt: 2.5 }}>
            <Typography sx={{ fontSize: '0.75rem', mb: 2, color: TEXT_COLOR }}>
                Discard this report and mark it as "DELETED"?
            </Typography>

            {itemData && (
                <Box
                    sx={{
                        p: 1.5,
                        borderRadius: '6px',
                        backgroundColor: alpha(RED_COLOR, 0.05),
                        border: `1px solid ${alpha(RED_COLOR, 0.1)}`,
                        mb: 2
                    }}
                >
                    <Typography
                        sx={{
                            color: TEXT_COLOR,
                            fontSize: '0.75rem',
                            fontWeight: 500,
                            mb: 0.5
                        }}
                    >
                        Work Order Details
                    </Typography>
                    <Typography sx={{ fontSize: '0.75rem', color: TEXT_COLOR }}>
                        <strong>WO#:</strong> {itemData.woNumber || itemData.wo_number}
                    </Typography>
                    <Typography sx={{ fontSize: '0.75rem', color: TEXT_COLOR }}>
                        <strong>Address:</strong> {itemData.street}
                    </Typography>
                    <Typography sx={{ fontSize: '0.75rem', color: TEXT_COLOR }}>
                        <strong>City:</strong> {itemData.city}, {itemData.state} {itemData.zip}
                    </Typography>
                </Box>
            )}

            <Box
                sx={{
                    p: 1.5,
                    borderRadius: '6px',
                    backgroundColor: alpha(RED_COLOR, 0.05),
                    border: `1px solid ${alpha(RED_COLOR, 0.1)}`,
                    display: 'flex',
                    gap: 1.5,
                    alignItems: 'flex-start'
                }}
            >
                <AlertTriangle size={18} color={RED_COLOR} style={{ marginTop: 2 }} />
                <Box>
                    <Typography
                        sx={{
                            color: RED_COLOR,
                            fontSize: '0.75rem',
                            fontWeight: 500,
                            mb: 0.25
                        }}
                    >
                        Warning
                    </Typography>
                    <Typography sx={{ fontSize: '0.75rem', color: TEXT_COLOR }}>
                        Discarded reports will be marked as DELETED and moved to appropriate sections.
                    </Typography>
                </Box>
            </Box>
        </DialogContent>

        <BaseModalActions
            onClose={onClose}
            onConfirm={onConfirm}
            isLoading={isLoading}
            confirmText="Discard Report"
            confirmColor={RED_COLOR}
            confirmIcon={<XCircle size={16} />}
            isDestructive={true}
        />
    </BaseModal>
);

export const ConfirmationModal = ({
    open,
    onClose,
    onConfirm,
    isLoading,
    icon,
    iconColor,
    title,
    subtitle,
    message,
    confirmText,
    confirmColor,
    cancelText,
    children,
    isDestructive = false,
    showNote = true,
    noteText,
    noteIcon,
    borderColor
}) => (
    <BaseModal
        open={open}
        onClose={onClose}
        icon={icon}
        iconColor={iconColor}
        title={title}
        subtitle={subtitle}
        borderColor={borderColor || iconColor}
    >
        <DialogContent sx={{ pt: 2.5 }}>
            {message && (
                <Typography sx={{ fontSize: '0.75rem', mb: 2, color: TEXT_COLOR }}>
                    {message}
                </Typography>
            )}

            {children}

            {showNote && noteText && (
                <Box
                    sx={{
                        p: 1.5,
                        borderRadius: '6px',
                        backgroundColor: alpha(iconColor, 0.05),
                        border: `1px solid ${alpha(iconColor, 0.1)}`,
                        display: 'flex',
                        gap: 1.5,
                        alignItems: 'flex-start',
                        mt: 2
                    }}
                >
                    {noteIcon || <AlertCircle size={18} color={iconColor} style={{ marginTop: 2 }} />}
                    <Box>
                        <Typography
                            sx={{
                                color: iconColor,
                                fontSize: '0.75rem',
                                fontWeight: 500,
                                mb: 0.25
                            }}
                        >
                            {isDestructive ? 'Warning' : 'Note'}
                        </Typography>
                        <Typography sx={{ fontSize: '0.75rem', color: TEXT_COLOR }}>
                            {noteText}
                        </Typography>
                    </Box>
                </Box>
            )}
        </DialogContent>

        <BaseModalActions
            onClose={onClose}
            onConfirm={onConfirm}
            isLoading={isLoading}
            confirmText={confirmText}
            confirmColor={confirmColor}
            cancelText={cancelText}
            isDestructive={isDestructive}
            confirmIcon={icon}
        />
    </BaseModal>
);