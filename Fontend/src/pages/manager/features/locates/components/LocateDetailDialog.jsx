import React, { memo } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Box, Typography,
  IconButton, Stack, Button, Chip, alpha, Divider,
  Paper
} from '@mui/material';
import { X, MapPin, User, Calendar, Clock, PhoneCall, AlertTriangle, CheckCircle, Mail, Map as MapIcon } from 'lucide-react';
import { formatDate } from '../utils/dateUtils';
import { BLUE_COLOR, GREEN_COLOR, ORANGE_COLOR, RED_COLOR, GRAY_COLOR, TEXT_COLOR } from '../utils/constants';

const LocateDetailDialog = memo(({ open, item, onClose }) => {
  if (!item) return null;

  const expirationDate = item.calledAt && item.callType ? 
    new Date(new Date(item.calledAt).getTime() + (item.callType === 'Emergency' || item.callType === 'EMERGENCY' ? 2 * 60 * 60 * 1000 : 48 * 60 * 60 * 1000)) : null;

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="sm" 
      fullWidth
      PaperProps={{ 
        sx: { 
          borderRadius: '12px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.1)'
        } 
      }}
    >
      <DialogTitle sx={{ p: 2, borderBottom: `1px solid ${alpha(TEXT_COLOR, 0.05)}` }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{ 
              width: 40, height: 40, borderRadius: '10px', bgcolor: alpha(BLUE_COLOR, 0.1), 
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: BLUE_COLOR 
            }}>
              <MapPin size={22} />
            </Box>
            <Box>
              <Typography sx={{ fontWeight: 700, fontSize: '1.05rem', color: TEXT_COLOR }}>
                Locate Details
              </Typography>
              <Typography variant="caption" sx={{ color: GRAY_COLOR }}>
                WO: {item.workOrderNumber}
              </Typography>
            </Box>
          </Box>
          <IconButton autoFocus onClick={onClose} size="small" sx={{ color: GRAY_COLOR }}>
            <X size={20} />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: 3 }}>
        <Stack spacing={3}>
          {/* Status Section */}
          <Box>
            <Typography variant="caption" sx={{ fontWeight: 600, color: GRAY_COLOR, textTransform: 'uppercase', mb: 1, display: 'block' }}>
              Status & Priority
            </Typography>
            <Stack direction="row" spacing={1}>
              {item.isEmergency && (
                <Chip 
                  label="Emergency" 
                  size="small" 
                  icon={<AlertTriangle size={14} />}
                  sx={{ bgcolor: alpha(RED_COLOR, 0.1), color: RED_COLOR, fontWeight: 600, border: `1px solid ${alpha(RED_COLOR, 0.2)}` }} 
                />
              )}
              {item.locatesCalled ? (
                <Chip 
                  label={item.callType || 'Called'} 
                  size="small" 
                  icon={<CheckCircle size={14} />}
                  sx={{ bgcolor: alpha(GREEN_COLOR, 0.1), color: GREEN_COLOR, fontWeight: 600, border: `1px solid ${alpha(GREEN_COLOR, 0.2)}` }} 
                />
              ) : (
                <Chip 
                  label="Pending Call" 
                  size="small" 
                  sx={{ bgcolor: alpha(ORANGE_COLOR, 0.1), color: ORANGE_COLOR, fontWeight: 600, border: `1px solid ${alpha(ORANGE_COLOR, 0.2)}` }} 
                />
              )}
            </Stack>
          </Box>

          {/* Customer Info */}
          <Box>
            <Typography variant="caption" sx={{ fontWeight: 600, color: GRAY_COLOR, textTransform: 'uppercase', mb: 1, display: 'block' }}>
              Customer Information
            </Typography>
            <Paper variant="outlined" sx={{ p: 2, bgcolor: alpha(GRAY_COLOR, 0.02), borderRadius: '8px' }}>
              <Stack spacing={1.5}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <User size={16} color={GRAY_COLOR} />
                  <Typography variant="body2" sx={{ fontWeight: 600, color: TEXT_COLOR }}>{item.customerName}</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                  <MapIcon size={16} color={GRAY_COLOR} style={{ marginTop: '2px' }} />
                  <Box>
                    <Typography variant="body2" sx={{ color: TEXT_COLOR }}>{item.street || item.original}</Typography>
                    <Typography variant="caption" sx={{ color: GRAY_COLOR }}>{[item.city, item.state, item.zip].filter(Boolean).join(', ')}</Typography>
                  </Box>
                </Box>
              </Stack>
            </Paper>
          </Box>

          {/* Timelines */}
          <Box>
            <Typography variant="caption" sx={{ fontWeight: 600, color: GRAY_COLOR, textTransform: 'uppercase', mb: 1, display: 'block' }}>
              Timelines
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <Box>
                <Typography variant="caption" sx={{ color: GRAY_COLOR, display: 'block' }}>Locate Triggered</Typography>
                <Typography variant="body2" sx={{ fontWeight: 500, color: TEXT_COLOR }}>{formatDate(item.locateTriggeredDate)}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" sx={{ color: GRAY_COLOR, display: 'block' }}>Target Work Date</Typography>
                <Typography variant="body2" sx={{ fontWeight: 500, color: TEXT_COLOR }}>{item.targetWorkDate || '—'}</Typography>
              </Box>
              {item.calledAt && (
                <>
                  <Box>
                    <Typography variant="caption" sx={{ color: ORANGE_COLOR, display: 'block' }}>Called In At</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500, color: ORANGE_COLOR }}>{formatDate(item.calledAt)}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" sx={{ color: RED_COLOR, display: 'block' }}>Expires At</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500, color: RED_COLOR }}>{expirationDate ? formatDate(expirationDate) : '—'}</Typography>
                  </Box>
                </>
              )}
            </Box>
          </Box>

          {/* Assignment */}
          <Box>
            <Typography variant="caption" sx={{ fontWeight: 600, color: GRAY_COLOR, textTransform: 'uppercase', mb: 1, display: 'block' }}>
              Assignment
            </Typography>
            <Stack spacing={1.5}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box sx={{ p: 0.75, borderRadius: '6px', bgcolor: alpha(BLUE_COLOR, 0.08) }}>
                  <User size={16} color={BLUE_COLOR} />
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ color: GRAY_COLOR, display: 'block' }}>Assigned Technician</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{item.techName}</Typography>
                </Box>
              </Box>
              {item.calledByName && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Box sx={{ p: 0.75, borderRadius: '6px', bgcolor: alpha(ORANGE_COLOR, 0.08) }}>
                    <PhoneCall size={16} color={ORANGE_COLOR} />
                  </Box>
                  <Box>
                    <Typography variant="caption" sx={{ color: GRAY_COLOR, display: 'block' }}>Called By</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{item.calledByName}</Typography>
                    {item.calledByEmail && (
                      <Typography variant="caption" sx={{ color: GRAY_COLOR, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Mail size={12} /> {item.calledByEmail}
                      </Typography>
                    )}
                  </Box>
                </Box>
              )}
            </Stack>
          </Box>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ p: 2, mt: 1, borderTop: `1px solid ${alpha(TEXT_COLOR, 0.03)}` }}>
        <Button onClick={onClose} variant="contained" sx={{ 
          bgcolor: TEXT_COLOR, 
          color: 'white', 
          textTransform: 'none', 
          borderRadius: '6px',
          '&:hover': { bgcolor: alpha(TEXT_COLOR, 0.8) }
        }}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
});

LocateDetailDialog.displayName = 'LocateDetailDialog';

export default LocateDetailDialog;
