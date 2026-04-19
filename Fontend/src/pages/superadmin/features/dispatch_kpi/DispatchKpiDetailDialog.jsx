import React, { memo } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Box, Typography,
  IconButton, Stack, Button, Chip, alpha, Paper, Grid
} from '@mui/material';
import { X, TrendingUp, Calendar, User, PieChart, BarChart3, Target, PhoneCall } from 'lucide-react';

const PALETTE = {
    TEXT:   '#0F1115',
    GRAY:   '#6b7280',
    BLUE:   '#1976d2',
    GREEN:  '#10b981',
    ORANGE: '#ed6c02',
    AMBER:  '#f59e0b',
    TEAL:   '#0891b2',
    PURPLE: '#8b5cf6',
    RED:    '#ef4444',
};

const DispatchKpiDetailDialog = memo(({ open, item, onClose }) => {
  if (!item) return null;

  const camRatio = item.cameronTotal ? ((item.cameronBooked / item.cameronTotal) * 100).toFixed(2) : '0.00';
  const ericRatio = item.ericTotal ? ((item.ericBooked / item.ericTotal) * 100).toFixed(2) : '0.00';
  const pickupRatio = item.all_leads ? ((item.totalJobsBooked / item.all_leads) * 100).toFixed(2) : '0.00';

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
      <DialogTitle sx={{ p: 2, borderBottom: `1px solid ${alpha(PALETTE.TEXT, 0.05)}` }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{ 
              width: 40, height: 40, borderRadius: '10px', bgcolor: alpha(PALETTE.BLUE, 0.1), 
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: PALETTE.BLUE 
            }}>
              <TrendingUp size={22} />
            </Box>
            <Box>
              <Typography sx={{ fontWeight: 700, fontSize: '1.05rem', color: PALETTE.TEXT }}>
                Performance Record
              </Typography>
              <Typography variant="caption" sx={{ color: PALETTE.GRAY }}>
                Date: {item.date}
              </Typography>
            </Box>
          </Box>
          <IconButton autoFocus onClick={onClose} size="small" sx={{ color: PALETTE.GRAY }}>
            <X size={20} />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: 3 }}>
        <Stack spacing={3}>
          {/* Status Section (Aggregate Ratio) */}
          <Box>
            <Typography variant="caption" sx={{ fontWeight: 600, color: PALETTE.GRAY, textTransform: 'uppercase', mb: 1, display: 'block' }}>
              Pickup Ratio
            </Typography>
            <Stack direction="row" spacing={1}>
              <Chip 
                label={`${pickupRatio}% Call Success`} 
                size="small" 
                icon={<PieChart size={14} />}
                sx={{ 
                  bgcolor: alpha(PALETTE.TEAL, 0.1), 
                  color: PALETTE.TEAL, 
                  fontWeight: 600, 
                  border: `1px solid ${alpha(PALETTE.TEAL, 0.2)}` 
                }} 
              />
              <Chip 
                label={`${item.all_leads} Total Leads`} 
                size="small" 
                variant="outlined"
                sx={{ color: PALETTE.GRAY, fontWeight: 500 }} 
              />
            </Stack>
          </Box>

          {/* Aggregate Stats */}
          <Box>
            <Typography variant="caption" sx={{ fontWeight: 600, color: PALETTE.GRAY, textTransform: 'uppercase', mb: 1, display: 'block' }}>
              Aggregate Information
            </Typography>
            <Paper variant="outlined" sx={{ p: 2, bgcolor: alpha(PALETTE.GRAY, 0.02), borderRadius: '8px' }}>
              <Stack spacing={1.5}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <BarChart3 size={16} color={PALETTE.GRAY} />
                    <Typography variant="body2" sx={{ color: PALETTE.TEXT }}>Total Jobs Booked</Typography>
                  </Box>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: PALETTE.TEXT }}>{item.totalJobsBooked}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Target size={16} color={PALETTE.GRAY} />
                    <Typography variant="body2" sx={{ color: PALETTE.TEXT }}>Total Leads</Typography>
                  </Box>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: PALETTE.TEXT }}>{item.all_leads}</Typography>
                </Box>
              </Stack>
            </Paper>
          </Box>

          {/* Dispatcher Details */}
          <Box>
            <Typography variant="caption" sx={{ fontWeight: 600, color: PALETTE.GRAY, textTransform: 'uppercase', mb: 1, display: 'block' }}>
              Dispatcher Details
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              {/* Cameron */}
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                  <Box sx={{ p: 0.5, borderRadius: '4px', bgcolor: alpha(PALETTE.BLUE, 0.1) }}>
                    <User size={14} color={PALETTE.BLUE} />
                  </Box>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: PALETTE.BLUE }}>CAMERON</Typography>
                </Box>
                <Typography variant="body2" sx={{ fontWeight: 600, color: PALETTE.TEXT }}>{camRatio}% Booking</Typography>
                <Typography variant="caption" sx={{ color: PALETTE.GRAY, display: 'block' }}>
                  {item.cameronBooked} / {item.cameronTotal} jobs
                </Typography>
              </Box>

              {/* Eric */}
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                  <Box sx={{ p: 0.5, borderRadius: '4px', bgcolor: alpha(PALETTE.PURPLE, 0.1) }}>
                    <User size={14} color={PALETTE.PURPLE} />
                  </Box>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: PALETTE.PURPLE }}>ERIC</Typography>
                </Box>
                <Typography variant="body2" sx={{ fontWeight: 600, color: PALETTE.TEXT }}>{ericRatio}% Booking</Typography>
                <Typography variant="caption" sx={{ color: PALETTE.GRAY, display: 'block' }}>
                  {item.ericBooked} / {item.ericTotal} jobs
                </Typography>
              </Box>
            </Box>
          </Box>

          {/* Assignment fallback for context (if needed) */}
          <Box>
            <Typography variant="caption" sx={{ fontWeight: 600, color: PALETTE.GRAY, textTransform: 'uppercase', mb: 1, display: 'block' }}>
              Summary
            </Typography>
            <Stack spacing={1.5}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box sx={{ p: 0.75, borderRadius: '6px', bgcolor: alpha(PALETTE.BLUE, 0.08) }}>
                  <PhoneCall size={16} color={PALETTE.BLUE} />
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ color: PALETTE.GRAY, display: 'block' }}>Operational Context</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>Daily Performance Report</Typography>
                </Box>
              </Box>
            </Stack>
          </Box>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ p: 2, mt: 1, borderTop: `1px solid ${alpha(PALETTE.TEXT, 0.03)}` }}>
        <Button onClick={onClose} variant="contained" sx={{ 
          bgcolor: PALETTE.TEXT, 
          color: 'white', 
          textTransform: 'none', 
          borderRadius: '6px',
          fontWeight: 500,
          '&:hover': { bgcolor: alpha(PALETTE.TEXT, 0.8) }
        }}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
});

DispatchKpiDetailDialog.displayName = 'DispatchKpiDetailDialog';

export default DispatchKpiDetailDialog;
