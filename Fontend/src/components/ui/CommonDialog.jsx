import React, { memo } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Box, Typography,
  Button, CircularProgress, IconButton, Stack
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { X, AlertTriangle, Trash2, CheckCircle, Info, AlertCircle } from 'lucide-react';

const PALETTE = {
  danger: '#ef4444',
  warning: '#f59e0b',
  success: '#10b981',
  info: '#3b82f6',
  gray: '#6b7280',
  text: '#0F1115'
};

const DEFAULT_ICONS = {
  danger: <Trash2 size={18} />,
  warning: <AlertTriangle size={18} />,
  success: <CheckCircle size={18} />,
  info: <Info size={18} />,
  default: <AlertCircle size={18} />
};

/**
 * A reusable, premium confirmation/action dialog for the entire application.
 */
const CommonDialog = memo(({
  open,
  onClose,
  onConfirm,
  title,
  message,
  children,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'info', // danger, warning, success, info
  icon,
  isLoading = false,
  maxWidth = 'xs',
  showCancel = true,
  disabled = false,
  confirmProps = {},
  cancelProps = {},
}) => {
  const color = PALETTE[variant] || PALETTE.info;
  const headerIcon = icon || DEFAULT_ICONS[variant] || DEFAULT_ICONS.default;

  return (
    <Dialog
      open={open}
      onClose={isLoading ? null : onClose}
      maxWidth={maxWidth}
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '12px',
          bgcolor: 'white',
          border: `1px solid ${alpha(color, 0.12)}`,
          overflow: 'hidden',
          boxShadow: `0 20px 40px ${alpha('#000', 0.1)}`,
        }
      }}
    >
      <DialogTitle sx={{
        p: 2,
        borderBottom: `1px solid ${alpha(color, 0.08)}`,
        background: `linear-gradient(135deg, ${alpha(color, 0.04)} 0%, transparent 100%)`,
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{
              width: 36,
              height: 36,
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: alpha(color, 0.1),
              color: color
            }}>
              {headerIcon}
            </Box>
            <Box>
              <Typography sx={{ color: PALETTE.text, fontSize: '0.95rem', fontWeight: 700, lineHeight: 1.2 }}>
                {title}
              </Typography>
            </Box>
          </Box>
          {!isLoading && (
            <IconButton size="small" onClick={onClose} sx={{ color: alpha(PALETTE.text, 0.4) }}>
              <X size={18} />
            </IconButton>
          )}
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: 3, pt: 2.5 }}>
        {message && (
          <Typography variant="body2" sx={{ color: alpha(PALETTE.text, 0.8), fontSize: '0.88rem', lineHeight: 1.6 }}>
            {message}
          </Typography>
        )}
        {children && <Box sx={{ mt: message ? 2 : 0 }}>{children}</Box>}
      </DialogContent>

      <DialogActions sx={{ p: 2, pt: 1.5, gap: 1, borderTop: `1px solid ${alpha(color, 0.05)}` }}>
        {showCancel && (
          <Button
            onClick={onClose}
            disabled={isLoading}
            variant="text"
            sx={{
              textTransform: 'none',
              color: PALETTE.gray,
              fontSize: '0.85rem',
              fontWeight: 500,
              px: 2,
              '&:hover': { bgcolor: alpha(PALETTE.gray, 0.05) },
              ...cancelProps.sx
            }}
            {...cancelProps}
          >
            {cancelText}
          </Button>
        )}
        <Button
          onClick={onConfirm}
          disabled={isLoading || disabled}
          variant="contained"
          sx={{
            textTransform: 'none',
            fontSize: '0.85rem',
            fontWeight: 500,
            bgcolor: color,
            borderRadius: '3px',
            px: 3,
            '&:hover': { bgcolor: alpha(color, 0.9) },
            '&.Mui-disabled': { bgcolor: alpha(color, 0.3) },
            ...confirmProps.sx
          }}
          startIcon={isLoading ? <CircularProgress size={16} color="inherit" /> : null}
          {...confirmProps}
        >
          {isLoading ? 'Processing...' : confirmText}
        </Button>
      </DialogActions>
    </Dialog>
  );
});

CommonDialog.displayName = 'CommonDialog';

export default CommonDialog;
