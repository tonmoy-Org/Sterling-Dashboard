import React, { useState, useMemo, useCallback, memo } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Chip, Stack, Button, Tooltip, IconButton,
  TablePagination, ToggleButtonGroup, ToggleButton, LinearProgress,
  Dialog, DialogTitle, DialogContent, DialogActions, Modal, CircularProgress, Checkbox,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
  Star, Search, X, Users, User, BarChart2, List, ChevronDown, ChevronUp,
  Award, MessageSquare, Trash2, History, RotateCcw, AlertCircle, Wrench,
  Check,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { reviewsApi } from '../../../../api/services/reviews';
import { rmeApi } from '../../../../api/services/rmeApi';
import { Helmet } from 'react-helmet-async';
import DashboardLoader from '../../../../components/Loader/DashboardLoader';
import RefreshButton from '../../../../components/ui/RefreshButton';
import CommonDialog from '../../../../components/ui/CommonDialog';
import { useAuth } from '../../../../auth/AuthProvider';
import { useGlobalSnackbar } from '../../../../context/GlobalSnackbarContext';
import { useLocation } from 'react-router-dom';
import { format } from 'date-fns';

const formatDateShort = (dateString) => {
  if (!dateString) return '—';
  const date = new Date(dateString);
  if (isNaN(date)) return dateString;
  return format(date, "MM/dd/yyyy hh:mm a");
};

const PALETTE = {
  TEXT: '#0F1115',
  GRAY: '#6b7280',
  BLUE: '#1976d2',
  GREEN: '#10b981',
  ORANGE: '#ed6c02',
  AMBER: '#f59e0b',
  TEAL: '#0891b2',
  PURPLE: '#8b5cf6',
  RED: '#ef4444',
  PINK: '#ec4899',
};

const EMPLOYEES = [
  { id: '01', name: 'Mackie', role: 'Pumper Technician' },
  { id: '02', name: 'Russell', role: 'Pumper Technician' },
  { id: '03', name: 'Skyler', role: 'Pumper Technician' },
  { id: '04', name: 'Ahkeem', role: 'Technician' },
  { id: '05', name: 'Cris', role: 'Technician' },
  { id: '06', name: 'Danny', role: 'Technician' },
  { id: '07', name: 'Jason', role: 'Technician' },
  { id: '08', name: 'Damien', role: 'Technician' },
];

const EMPLOYEE_NAMES = EMPLOYEES.map(e => e.name);

const PERIOD_OPTIONS = [
  { value: 'all', label: 'All time' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
];

const relativeToApproxDate = (rel) => {
  if (!rel) return null;
  const parsed = new Date(rel);
  if (!isNaN(parsed)) return parsed;

  const now = new Date();
  const r = rel.toLowerCase();
  
  const numMatch = r.match(/\d+/);
  const val = numMatch ? parseInt(numMatch[0], 10) : 1;

  if (r.includes('today') || r.includes('hour') || r.includes('just') || r.includes('min') || r.includes('sec')) return now;
  if (r.includes('yesterday')) return new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  if (r.includes('week')) return new Date(now.valueOf() - val * 7 * 864e5);
  if (r.includes('month')) return new Date(now.getFullYear(), now.getMonth() - val, now.getDate());
  if (r.includes('year')) return new Date(now.getFullYear() - val, now.getMonth(), now.getDate());
  return null;
};

const inPeriod = (dateStr, period) => {
  if (period === 'all') return true;
  const d = relativeToApproxDate(dateStr);
  if (!d) return true;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diff = today - d;
  if (period === 'daily') return diff <= 0;
  if (period === 'weekly') return diff <= 7 * 864e5;
  if (period === 'monthly') return diff <= 30 * 864e5;
  if (period === 'yearly') return diff <= 365 * 864e5;
  return true;
};

const extractEmployees = (text) => {
  if (!text) return [];
  const found = new Set();
  EMPLOYEE_NAMES.forEach(name => {
    if (new RegExp(`\\b${name}\\b`, 'i').test(text)) found.add(name);
  });
  return [...found];
};

const transformReview = (item) => ({
  id: item.id,
  reviewer: item.reviewer_name || 'Anonymous',
  rating: item.rating_value || 0,
  ratingText: item.rating_text || '',
  date: formatDateShort(item.review_date),
  rawDate: item.review_date || '',
  text: item.review_text || '',
  price: item.price_range || 'N/A',
  priceLabel: item.price_assessment || 'N/A',
  services: item.services_mentioned || 'N/A',
  business: item.business_name || '',
  isDeleted: item.is_deleted || false,
  deletedDate: formatDateShort(item.deleted_date),
  deletedBy: item.deleted_by || null,
  deletedByEmail: item.deleted_by_email || null,
  employees: extractEmployees(item.review_text),
  isSeen: item.is_seen || false,
});

const AVATAR_COLORS = [PALETTE.BLUE, PALETTE.GREEN, PALETTE.ORANGE, PALETTE.TEAL, PALETTE.PURPLE, PALETTE.PINK, PALETTE.AMBER];
const avatarColor = (name) => AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];

const Stars = memo(({ value, size = 14 }) => (
  <Box sx={{ display: 'flex', gap: 0.25 }}>
    {[1, 2, 3, 4, 5].map(n => (
      <Star key={n} size={size}
        fill={n <= value ? PALETTE.AMBER : 'none'}
        color={n <= value ? PALETTE.AMBER : PALETTE.GRAY}
        strokeWidth={1.5} />
    ))}
  </Box>
));
Stars.displayName = 'Stars';

const ExpandableText = memo(({ text, maxLines = 3 }) => {
  const [expanded, setExpanded] = useState(false);
  const lines = text.split('\n');
  const needsExpand = lines.length > maxLines || text.length > 180;
  const display = expanded ? text : lines.slice(0, maxLines).join('\n').slice(0, 180);
  return (
    <Box>
      <Typography variant="body2" sx={{ fontSize: '0.82rem', color: PALETTE.TEXT, lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontStyle: 'italic', opacity: 0.85 }}>
        "{display}{!expanded && needsExpand ? '…' : ''}"
      </Typography>
      {needsExpand && (
        <Button size="small" onClick={() => setExpanded(e => !e)}
          sx={{ textTransform: 'none', fontSize: '0.72rem', fontWeight: 600, color: PALETTE.BLUE, p: '2px 0', mt: 0.25, '&:hover': { bgcolor: 'transparent', textDecoration: 'underline' } }}
          endIcon={expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}>
          {expanded ? 'Less' : 'More'}
        </Button>
      )}
    </Box>
  );
});
ExpandableText.displayName = 'ExpandableText';

const EmpChip = memo(({ name }) => (
  <Chip label={name} size="small"
    sx={{
      fontSize: '0.72rem', height: '22px', fontWeight: 500,
      bgcolor: alpha(avatarColor(name), 0.1),
      color: avatarColor(name),
      border: `1px solid ${alpha(avatarColor(name), 0.25)}`,
      '& .MuiChip-label': { px: 1 },
    }} />
));
EmpChip.displayName = 'EmpChip';

const PeriodToggle = memo(({ value, onChange }) => (
  <ToggleButtonGroup value={value} exclusive onChange={(_, v) => v && onChange(v)} size="small"
    sx={{ '& .MuiToggleButton-root': { textTransform: 'none', fontSize: '0.75rem', fontWeight: 500, px: 1.5, py: 0.5, color: PALETTE.GRAY, border: `1px solid ${alpha(PALETTE.GRAY, 0.2)}`, '&.Mui-selected': { bgcolor: alpha(PALETTE.BLUE, 0.08), color: PALETTE.BLUE, borderColor: alpha(PALETTE.BLUE, 0.3) } } }}>
    {PERIOD_OPTIONS.map(o => <ToggleButton key={o.value} value={o.value}>{o.label}</ToggleButton>)}
  </ToggleButtonGroup>
));
PeriodToggle.displayName = 'PeriodToggle';

const Section = memo(({ title, color, count, filteredCount, selectedCount, onDelete, children, headerRight, tableSearch, onTableSearch, tableSearchPlaceholder }) => (
  <Paper elevation={0} sx={{ mb: 4, borderRadius: '6px', overflow: 'hidden', border: `1px solid ${alpha(color, 0.15)}`, bgcolor: 'white' }}>
    <Box sx={{ p: 1.5, bgcolor: 'white', borderBottom: `1px solid ${alpha(color, 0.1)}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
        <Typography sx={{ fontSize: '1rem', color: PALETTE.TEXT, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 0.75 }}>
          {title}
          <Chip size="small" label={tableSearch ? `${filteredCount}/${count}` : count}
            sx={{ bgcolor: alpha(color, 0.08), color: PALETTE.TEXT, fontSize: '0.75rem', fontWeight: 500, height: '24px', '& .MuiChip-label': { px: 1.2 } }} />
        </Typography>
      </Box>
      <Stack direction="row" spacing={1} alignItems="center">
        {headerRight}
        {onTableSearch && (
          <Box sx={{ position: 'relative', minWidth: 200 }}>
            <Box sx={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', pointerEvents: 'none', zIndex: 1 }}>
              <Search size={13} color={alpha(color, 0.5)} />
            </Box>
            <input
              type="text" value={tableSearch} onChange={e => onTableSearch(e.target.value)}
              placeholder={tableSearchPlaceholder || "Search…"}
              style={{ width: '100%', padding: '6px 28px', borderRadius: '6px', border: `1.5px solid ${alpha(color, 0.2)}`, fontSize: '0.78rem', outline: 'none', background: 'white', color: PALETTE.TEXT, boxSizing: 'border-box' }}
              onFocus={e => { e.target.style.borderColor = color; e.target.style.boxShadow = `0 0 0 3px ${alpha(color, 0.1)}`; }}
              onBlur={e => { e.target.style.borderColor = alpha(color, 0.2); e.target.style.boxShadow = 'none'; }}
            />
          </Box>
        )}
        {selectedCount > 0 && (
          <Button variant="outlined" color="error" size="small" onClick={onDelete} startIcon={<Trash2 size={14} />}
            sx={{ textTransform: 'none', fontSize: '0.75rem', height: '32px', px: 1.5 }}>
            Delete ({selectedCount})
          </Button>
        )}
      </Stack>
    </Box>
    {children}
  </Paper>
));
Section.displayName = 'Section';

const RecycleBinModal = memo(({
  open, onClose, items, isLoading, page, rowsPerPage, onPageChange, onRowsPerPageChange,
  selected, onToggle, onToggleAll, onBulkRestore, onBulkDelete, onSingleRestore, onSingleDelete,
  search, onSearchChange, isDeleting = false
}) => {
  const [permDeleteModal, setPermDeleteModal] = useState({ open: false, item: null, isBulk: false });

  const pageItems = useMemo(() =>
    items.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
    [items, page, rowsPerPage]
  );

  const allOnPage = pageItems.length > 0 && pageItems.every(i => selected.has(i.id));
  const someOnPage = pageItems.length > 0 && pageItems.some(i => selected.has(i.id)) && !allOnPage;

  const handleBulkDeleteClick = () => {
    setPermDeleteModal({ open: true, item: null, isBulk: true });
  };

  const handleSingleDeleteClick = (item) => {
    setPermDeleteModal({ open: true, item, isBulk: false });
  };

  const handleConfirmDelete = async () => {
    if (permDeleteModal.isBulk) {
      await onBulkDelete();
    } else {
      await onSingleDelete(permDeleteModal.item);
    }
    setPermDeleteModal({ open: false, item: null, isBulk: false });
  };

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1300
        }}
      >
        <Box sx={{
          width: '95%',
          maxWidth: 1400,
          maxHeight: '90vh',
          bgcolor: 'white',
          borderRadius: '12px',
          boxShadow: '0 25px 60px rgba(0,0,0,0.15)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {/* Header */}
          <Box sx={{
            p: 2.5,
            borderBottom: `1px solid ${alpha(PALETTE.PURPLE, 0.12)}`,
            background: `linear-gradient(135deg, ${alpha(PALETTE.PURPLE, 0.04)} 0%, ${alpha(PALETTE.PURPLE, 0.01)} 100%)`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box sx={{
                width: 40,
                height: 40,
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: alpha(PALETTE.PURPLE, 0.1),
                color: PALETTE.PURPLE
              }}>
                <History size={20} />
              </Box>
              <Box>
                <Typography sx={{ fontSize: '1.1rem', fontWeight: 700, color: PALETTE.TEXT }}>
                  Recycle Bin
                </Typography>
                <Typography variant="body2" sx={{ fontSize: '0.75rem', color: PALETTE.GRAY }}>
                  {items.length} deleted item(s) · Restore or permanently delete
                </Typography>
              </Box>
            </Box>
            <IconButton
              autoFocus
              size="small"
              onClick={onClose}
              sx={{
                color: PALETTE.GRAY,
                '&:hover': { bgcolor: alpha(PALETTE.GRAY, 0.1) }
              }}
            >
              <X size={18} />
            </IconButton>
          </Box>

          {/* Toolbar */}
          <Box sx={{
            px: 2.5,
            py: 1.5,
            borderBottom: `1px solid ${alpha(PALETTE.PURPLE, 0.08)}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 2,
            bgcolor: '#fafbfc'
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Checkbox
                size="small"
                checked={allOnPage}
                indeterminate={someOnPage}
                onChange={() => onToggleAll(pageItems)}
                sx={{
                  color: alpha(PALETTE.PURPLE, 0.4),
                  '&.Mui-checked': { color: PALETTE.PURPLE },
                  '&.MuiCheckbox-indeterminate': { color: PALETTE.PURPLE }
                }}
              />
              <Box sx={{ position: 'relative', minWidth: 260 }}>
                <input
                  type="text"
                  value={search}
                  onChange={e => onSearchChange(e.target.value)}
                  placeholder="Search deleted items…"
                  style={{
                    width: '100%',
                    padding: '8px 36px 8px 34px',
                    borderRadius: '8px',
                    border: `1.5px solid ${alpha(PALETTE.PURPLE, 0.18)}`,
                    fontSize: '0.82rem',
                    outline: 'none',
                    background: 'white',
                    color: PALETTE.TEXT,
                    transition: 'border-color 0.2s, box-shadow 0.2s',
                    boxSizing: 'border-box'
                  }}
                  onFocus={e => {
                    e.target.style.borderColor = PALETTE.PURPLE;
                    e.target.style.boxShadow = `0 0 0 3px ${alpha(PALETTE.PURPLE, 0.1)}`;
                  }}
                  onBlur={e => {
                    e.target.style.borderColor = alpha(PALETTE.PURPLE, 0.18);
                    e.target.style.boxShadow = 'none';
                  }}
                />
                <Box sx={{
                  position: 'absolute',
                  left: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  display: 'flex',
                  alignItems: 'center',
                  pointerEvents: 'none'
                }}>
                  <Search size={15} color={alpha(PALETTE.GRAY, 0.6)} />
                </Box>
                {search && (
                  <IconButton
                    size="small"
                    onClick={() => onSearchChange('')}
                    sx={{
                      position: 'absolute',
                      right: '6px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      padding: '2px'
                    }}
                  >
                    <X size={14} />
                  </IconButton>
                )}
              </Box>
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="outlined"
                size="small"
                startIcon={<RotateCcw size={14} />}
                onClick={onBulkRestore}
                disabled={selected.size === 0}
                sx={{
                  textTransform: 'none',
                  fontSize: '0.78rem',
                  fontWeight: 500,
                  color: PALETTE.GREEN,
                  borderColor: alpha(PALETTE.GREEN, 0.35),
                  borderRadius: '6px',
                  px: 1.5,
                  '&:hover': {
                    borderColor: PALETTE.GREEN,
                    bgcolor: alpha(PALETTE.GREEN, 0.06)
                  },
                  '&.Mui-disabled': { opacity: 0.45 }
                }}
              >
                Restore ({selected.size})
              </Button>
              <Button
                variant="outlined"
                size="small"
                startIcon={<Trash2 size={14} />}
                onClick={handleBulkDeleteClick}
                disabled={selected.size === 0}
                sx={{
                  textTransform: 'none',
                  fontSize: '0.78rem',
                  fontWeight: 500,
                  color: PALETTE.RED,
                  borderColor: alpha(PALETTE.RED, 0.35),
                  borderRadius: '6px',
                  px: 1.5,
                  '&:hover': {
                    borderColor: PALETTE.RED,
                    bgcolor: alpha(PALETTE.RED, 0.06)
                  },
                  '&.Mui-disabled': { opacity: 0.45 }
                }}
              >
                Delete ({selected.size})
              </Button>
            </Box>
          </Box>

          {/* Table Body */}
          <Box sx={{
            flex: 1,
            overflow: 'auto',
            minHeight: 300,
            '&::-webkit-scrollbar': { width: '6px', height: '6px' },
            '&::-webkit-scrollbar-track': { background: alpha(PALETTE.GRAY, 0.05) },
            '&::-webkit-scrollbar-thumb': { background: alpha(PALETTE.PURPLE, 0.2), borderRadius: '3px' }
          }}>
            {isLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8 }}>
                <CircularProgress size={32} sx={{ color: PALETTE.PURPLE }} />
              </Box>
            ) : items.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5 }}>
                <History size={48} color={alpha(PALETTE.GRAY, 0.3)} />
                <Typography variant="body2" sx={{ color: PALETTE.GRAY, fontSize: '0.9rem' }}>
                  {search ? 'No matching deleted items found' : 'No deleted items in recycle bin'}
                </Typography>
                <Typography variant="caption" sx={{ color: PALETTE.GRAY, fontSize: '0.8rem' }}>
                  {search ? 'Try a different search term' : 'Deleted items will appear here'}
                </Typography>
              </Box>
            ) : (
              <TableContainer sx={{ overflowX: 'auto' }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow sx={{
                      bgcolor: alpha(PALETTE.PURPLE, 0.03),
                      '& th': {
                        borderBottom: `2px solid ${alpha(PALETTE.PURPLE, 0.1)}`,
                        fontWeight: 600,
                        fontSize: '0.78rem',
                        color: PALETTE.TEXT,
                        py: 1.5,
                        px: 1.5,
                        whiteSpace: 'nowrap',
                        bgcolor: alpha(PALETTE.PURPLE, 0.02)
                      }
                    }}>
                      <TableCell padding="checkbox" width={50} />
                      <TableCell sx={{ minWidth: 150 }}>Employees Mentioned</TableCell>
                      <TableCell sx={{ minWidth: 150 }}>Reviewer</TableCell>
                      <TableCell sx={{ width: 100 }}>Rating</TableCell>
                      <TableCell sx={{ minWidth: 180 }}>Deleted By</TableCell>
                      <TableCell sx={{ minWidth: 160 }}>Deleted At</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {pageItems.map(item => {
                      const isSelected = selected.has(item.id);
                      return (
                        <TableRow
                          key={item.id}
                          hover
                          sx={{
                            bgcolor: isSelected ? alpha(PALETTE.PURPLE, 0.07) : 'white',
                            transition: 'background-color 0.15s',
                            '&:hover': {
                              backgroundColor: isSelected ? alpha(PALETTE.PURPLE, 0.1) : alpha(PALETTE.PURPLE, 0.03)
                            },
                            '&:last-child td': { borderBottom: 'none' }
                          }}
                        >
                          <TableCell padding="checkbox">
                            <Checkbox
                              size="small"
                              checked={isSelected}
                              onChange={() => onToggle(item.id)}
                              sx={{
                                padding: '4px',
                                color: alpha(PALETTE.PURPLE, 0.4),
                                '&.Mui-checked': { color: PALETTE.PURPLE }
                              }}
                            />
                          </TableCell>
                          <TableCell sx={{ py: 1.5 }}>
                            {item.employees && item.employees.length > 0 ? (
                              <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                                {item.employees.map(e => <EmpChip key={e} name={e} />)}
                              </Stack>
                            ) : (
                              <Typography variant="caption" sx={{ color: alpha(PALETTE.GRAY, 0.6), fontStyle: 'italic', fontSize: '0.75rem' }}>
                                None identified
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell>
                            <Box>
                              <Typography variant="body2" sx={{ fontSize: '0.83rem', fontWeight: 600, color: PALETTE.TEXT }}>
                                {item.reviewer}
                              </Typography>
                              <Typography variant="caption" sx={{ fontSize: '0.72rem', color: PALETTE.GRAY, display: 'block', mt: 0.25 }}>
                                {item.date}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Stars value={item.rating} size={12} />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontSize: '0.83rem', color: PALETTE.TEXT }}>
                              {item.deletedBy || 'Unknown'}
                            </Typography>
                            {item.deletedByEmail && (
                              <Typography variant="caption" sx={{ fontSize: '0.72rem', color: PALETTE.GRAY, display: 'block' }}>
                                {item.deletedByEmail}
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontSize: '0.83rem', color: PALETTE.TEXT }}>
                              {item.deletedDate || '—'}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>

          {/* Pagination */}
          {items.length > 0 && (
            <Box sx={{
              borderTop: `1px solid ${alpha(PALETTE.PURPLE, 0.08)}`,
              bgcolor: '#fafbfc'
            }}>
              <TablePagination
                rowsPerPageOptions={[5, 10, 25, 50]}
                component="div"
                count={items.length}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={onPageChange}
                onRowsPerPageChange={onRowsPerPageChange}
                SelectProps={{ MenuProps: { disableScrollLock: true } }}
                sx={{
                  '& .MuiTablePagination-toolbar': { minHeight: '44px' },
                  '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
                    fontSize: '0.78rem',
                    color: PALETTE.GRAY
                  }
                }}
              />
            </Box>
          )}
        </Box>
      </Modal>

      {/* Permanent Delete Confirmation Dialog */}
      <CommonDialog
        open={permDeleteModal.open}
        onClose={() => setPermDeleteModal(p => ({ ...p, open: false }))}
        onConfirm={handleConfirmDelete}
        title="Delete Permanently"
        variant="danger"
        confirmText="Delete Permanently"
        isLoading={isDeleting}
        icon={<Trash2 size={18} />}
      >
        <Typography variant="body2" sx={{ color: PALETTE.TEXT, fontSize: '0.85rem', lineHeight: 1.6, mb: 2 }}>
          {permDeleteModal.isBulk ? (
            <>Are you sure you want to permanently delete <Box component="strong" sx={{ color: PALETTE.RED }}>{selected.size} item(s)</Box> from the recycle bin?</>
          ) : (
            <>Are you sure you want to permanently delete the review from <Box component="strong">{permDeleteModal.item?.reviewer}</Box>?</>
          )}
        </Typography>
        <Box sx={{
          p: 1.5,
          borderRadius: '8px',
          backgroundColor: alpha(PALETTE.RED, 0.05),
          border: `1px solid ${alpha(PALETTE.RED, 0.12)}`,
          display: 'flex',
          alignItems: 'flex-start',
          gap: 1.25
        }}>
          <AlertCircle size={17} color={PALETTE.RED} style={{ flexShrink: 0, marginTop: 1 }} />
          <Box>
            <Typography variant="body2" sx={{ color: PALETTE.RED, fontSize: '0.82rem', fontWeight: 600, mb: 0.25 }}>
              Warning — cannot be undone
            </Typography>
            <Typography variant="caption" sx={{ color: PALETTE.TEXT, fontSize: '0.78rem', opacity: 0.75 }}>
              This data will be permanently erased and cannot be recovered.
            </Typography>
          </Box>
        </Box>
      </CommonDialog>
    </>
  );
});
RecycleBinModal.displayName = 'RecycleBinModal';

const StatCard = memo(({ label, value, color, icon }) => (
  <Box sx={{ p: 1.5, borderRadius: '6px', border: `1px solid ${alpha(color, 0.15)}`, bgcolor: alpha(color, 0.03), flex: 1, minWidth: 110 }}>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.5 }}>
      <Box sx={{ color, opacity: 0.7 }}>{icon}</Box>
      <Typography variant="caption" sx={{ fontSize: '0.72rem', color: PALETTE.GRAY, fontWeight: 500 }}>{label}</Typography>
    </Box>
    <Typography sx={{ fontSize: '1.3rem', fontWeight: 700, color: PALETTE.TEXT, lineHeight: 1 }}>{value}</Typography>
  </Box>
));
StatCard.displayName = 'StatCard';

const EmployeeBarChart = memo(({ data }) => {
  const max = Math.max(...data.map(d => d.count), 1);
  return (
    <Box sx={{ width: '100%', overflowX: 'auto' }}>
      <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1.5, minWidth: data.length * 72, px: 1, pt: 1, pb: 0.5, height: 160 }}>
        {data.map(d => (
          <Box key={d.name} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, gap: 0.5 }}>
            <Typography variant="caption" sx={{ fontSize: '0.72rem', fontWeight: 600, color: PALETTE.TEXT }}>{d.count}</Typography>
            <Tooltip title={`${d.name}: ${d.count} review(s) · avg ${d.avg}★`} arrow>
              <Box sx={{
                width: '100%', maxWidth: 48,
                height: `${Math.max((d.count / max) * 100, 6)}px`,
                bgcolor: avatarColor(d.name),
                borderRadius: '4px 4px 0 0',
                cursor: 'default',
                transition: 'opacity 0.15s',
                '&:hover': { opacity: 0.8 },
              }} />
            </Tooltip>
            <Typography variant="caption" sx={{ fontSize: '0.68rem', color: PALETTE.GRAY, textAlign: 'center', lineHeight: 1.2, wordBreak: 'break-word', maxWidth: 52 }}>
              {d.name}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
});
EmployeeBarChart.displayName = 'EmployeeBarChart';

const ReviewDetailDialog = memo(({ open, review, onClose }) => {
  if (!review) return null;
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
              width: 40, height: 40, borderRadius: '10px', bgcolor: alpha(PALETTE.AMBER, 0.1),
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: PALETTE.AMBER
            }}>
              <MessageSquare size={22} />
            </Box>
            <Box>
              <Typography sx={{ fontWeight: 700, fontSize: '1.05rem', color: PALETTE.TEXT }}>
                Review Details
              </Typography>
              <Typography variant="caption" sx={{ color: PALETTE.GRAY }}>
                Source: Google Reviews
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
          {/* Reviewer & Rating Section */}
          <Box>
            <Typography variant="caption" sx={{ fontWeight: 600, color: PALETTE.GRAY, textTransform: 'uppercase', mb: 1.5, display: 'block' }}>
              Reviewer & Rating
            </Typography>
            <Paper variant="outlined" sx={{ p: 2, bgcolor: alpha(PALETTE.GRAY, 0.02), borderRadius: '8px' }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: PALETTE.TEXT, mb: 0.5 }}>
                    {review.reviewer}
                  </Typography>
                  <Typography variant="caption" sx={{ color: PALETTE.GRAY, display: 'block' }}>
                    {review.date}
                  </Typography>
                </Box>
                <Stars value={review.rating} size={18} />
              </Stack>
            </Paper>
          </Box>

          {/* Feedback Section */}
          <Box>
            <Typography variant="caption" sx={{ fontWeight: 600, color: PALETTE.GRAY, textTransform: 'uppercase', mb: 1, display: 'block' }}>
              Customer Feedback
            </Typography>
            <Typography variant="body2" sx={{
              fontSize: '0.9rem',
              color: PALETTE.TEXT,
              lineHeight: 1.8,
              fontStyle: 'italic',
              bgcolor: alpha(PALETTE.AMBER, 0.03),
              p: 2,
              borderRadius: '8px',
              borderLeft: `3px solid ${PALETTE.AMBER}`
            }}>
              "{review.text}"
            </Typography>
          </Box>

          {/* Mentions & Services */}
          <Box>
            <Typography variant="caption" sx={{ fontWeight: 600, color: PALETTE.GRAY, textTransform: 'uppercase', mb: 1.5, display: 'block' }}>
              Insights
            </Typography>
            <Stack spacing={2}>
              {review.employees.length > 0 && (
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                  <Box sx={{ p: 0.75, borderRadius: '6px', bgcolor: alpha(PALETTE.BLUE, 0.08) }}>
                    <Users size={16} color={PALETTE.BLUE} />
                  </Box>
                  <Box>
                    <Typography variant="caption" sx={{ color: PALETTE.GRAY, display: 'block', mb: 0.5 }}>Staff Recognized</Typography>
                    <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                      {review.employees.map(e => <EmpChip key={e} name={e} />)}
                    </Stack>
                  </Box>
                </Box>
              )}

              {review.services !== 'N/A' && (
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                  <Box sx={{ p: 0.75, borderRadius: '6px', bgcolor: alpha(PALETTE.TEAL, 0.08) }}>
                    <Wrench size={16} color={PALETTE.TEAL} />
                  </Box>
                  <Box>
                    <Typography variant="caption" sx={{ color: PALETTE.GRAY, display: 'block', mb: 0.25 }}>Services Mentioned</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: PALETTE.TEAL }}>{review.services}</Typography>
                  </Box>
                </Box>
              )}

              {review.price !== 'N/A' && (
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                  <Box sx={{ p: 0.75, borderRadius: '6px', bgcolor: alpha(PALETTE.GREEN, 0.08) }}>
                    <Award size={16} color={PALETTE.GREEN} />
                  </Box>
                  <Box>
                    <Typography variant="caption" sx={{ color: PALETTE.GRAY, display: 'block', mb: 0.25 }}>Price Assessment</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: PALETTE.GREEN }}>{review.price} · {review.priceLabel}</Typography>
                  </Box>
                </Box>
              )}
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
ReviewDetailDialog.displayName = 'ReviewDetailDialog';

const AllReviewsTable = memo(({ reviews, onView, selected, onToggle, onToggleAll, onDelete }) => {
  const [page, setPage] = useState(0);
  const [rpp, setRpp] = useState(10);
  const pg = reviews.slice(page * rpp, page * rpp + rpp);
  const allOnPage = pg.length > 0 && pg.every(r => selected.has(r.id));
  const someOnPage = pg.length > 0 && pg.some(r => selected.has(r.id)) && !allOnPage;

  return (
    <>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: alpha(PALETTE.BLUE, 0.04), '& th': { borderBottom: `2px solid ${alpha(PALETTE.BLUE, 0.1)}`, fontWeight: 600, fontSize: '0.8rem', color: PALETTE.TEXT, py: 1.5, whiteSpace: 'nowrap' } }}>
              <TableCell padding="checkbox" sx={{ pl: 2 }}><Checkbox size="small" checked={allOnPage} indeterminate={someOnPage} onChange={() => onToggleAll(pg)} /></TableCell>
              <TableCell sx={{ minWidth: 150 }}>Employees Mentioned</TableCell>
              <TableCell sx={{ minWidth: 180 }}>Reviewer</TableCell>
              <TableCell sx={{ minWidth: 320 }}>Review</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {!pg.length ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                    <Search size={28} color={alpha(PALETTE.TEXT, 0.2)} />
                    <Typography variant="body2" sx={{ color: PALETTE.TEXT, opacity: 0.5, fontSize: '0.85rem' }}>No reviews match your filters</Typography>
                  </Box>
                </TableCell>
              </TableRow>
            ) : pg.map(r => (
              <TableRow key={r.id} hover sx={{ '&:hover': { bgcolor: alpha(PALETTE.BLUE, 0.03) }, '&:last-child td': { borderBottom: 'none' }, bgcolor: selected.has(r.id) ? alpha(PALETTE.BLUE, 0.02) : 'inherit' }}>
                <TableCell padding="checkbox" sx={{ pl: 2 }}>
                  <Checkbox size="small" checked={selected.has(r.id)} onChange={() => onToggle(r.id)} />
                </TableCell>
                <TableCell sx={{ py: 1.5 }}>
                  {r.employees.length > 0 ? (
                    <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                      {r.employees.map(e => <EmpChip key={e} name={e} />)}
                    </Stack>
                  ) : (
                    <Typography variant="caption" sx={{ color: alpha(PALETTE.GRAY, 0.6), fontStyle: 'italic', fontSize: '0.75rem' }}>
                      None identified
                    </Typography>
                  )}
                </TableCell>
                <TableCell sx={{ py: 1.5 }}>
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.85rem', color: PALETTE.TEXT }}>
                        {r.reviewer}
                      </Typography>
                      {!r.isSeen && (
                        <Chip
                          label="NEW"
                          size="small"
                          sx={{
                            height: 16,
                            fontSize: '0.65rem',
                            fontWeight: 700,
                            bgcolor: PALETTE.ORANGE,
                            color: 'white',
                            borderRadius: '4px',
                            '& .MuiChip-label': { px: 0.5 }
                          }}
                        />
                      )}
                    </Box>
                    <Box sx={{ mt: 0.5 }}>
                      <Stars value={r.rating} size={12} />
                      <Typography variant="caption" sx={{ fontSize: '0.7rem', color: PALETTE.GRAY, mt: 0.5 }}>
                        {r.date}
                      </Typography>
                    </Box>
                  </Box>
                </TableCell>
                <TableCell sx={{ py: 1.5, maxWidth: 320 }}>
                  <ExpandableText text={r.text} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      {reviews.length > 5 && (
        <TablePagination rowsPerPageOptions={[5, 10, 25]} component="div"
          count={reviews.length} rowsPerPage={rpp} page={page}
          onPageChange={(_, p) => setPage(p)}
          onRowsPerPageChange={e => { setRpp(+e.target.value); setPage(0); }}
          SelectProps={{ MenuProps: { disableScrollLock: true } }}
          sx={{ borderTop: `1px solid ${alpha(PALETTE.BLUE, 0.1)}`, '& .MuiTablePagination-toolbar': { minHeight: '44px' }, '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': { fontSize: '0.8rem', color: PALETTE.TEXT } }} />
      )}
    </>
  );
});
AllReviewsTable.displayName = 'AllReviewsTable';

const EmployeeReviewsTable = memo(({ reviews, onView }) => {
  const [page, setPage] = useState(0);
  const [rpp, setRpp] = useState(5);
  const pg = reviews.slice(page * rpp, page * rpp + rpp);

  return (
    <>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: alpha(PALETTE.TEAL, 0.04), '& th': { borderBottom: `2px solid ${alpha(PALETTE.TEAL, 0.1)}`, fontWeight: 600, fontSize: '0.78rem', color: PALETTE.TEXT, py: 1.25, whiteSpace: 'nowrap' } }}>
              <TableCell sx={{ minWidth: 180 }}>Reviewer / Rating / Date</TableCell>
              <TableCell sx={{ minWidth: 280 }}>Review excerpt</TableCell>
              <TableCell sx={{ minWidth: 150 }}>Services</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {!pg.length ? (
              <TableRow>
                <TableCell colSpan={3} align="center" sx={{ py: 4 }}>
                  <Typography variant="body2" sx={{ color: PALETTE.GRAY, fontSize: '0.83rem' }}>No reviews in this period</Typography>
                </TableCell>
              </TableRow>
            ) : pg.map(r => (
              <TableRow key={r.id} hover sx={{ '&:hover': { bgcolor: alpha(PALETTE.TEAL, 0.03) }, '&:last-child td': { borderBottom: 'none' } }}>
                <TableCell sx={{ py: 1.25 }}>
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.82rem', color: PALETTE.TEXT }}>
                      {r.reviewer}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                      <Stars value={r.rating} size={11} />
                      <Typography variant="caption" sx={{ fontSize: '0.7rem', color: PALETTE.GRAY }}>
                        {r.date}
                      </Typography>
                    </Box>
                  </Box>
                </TableCell>
                <TableCell sx={{ py: 1.25, maxWidth: 300 }}>
                  <ExpandableText text={r.text} maxLines={2} />
                </TableCell>
                <TableCell sx={{ py: 1.25 }}>
                  {r.services !== 'N/A' ? (
                    <Typography variant="caption" sx={{ fontSize: '0.72rem', color: PALETTE.TEAL, fontWeight: 500 }}>
                      {r.services}
                    </Typography>
                  ) : (
                    <Typography variant="caption" sx={{ color: PALETTE.GRAY, fontSize: '0.7rem' }}>—</Typography>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      {reviews.length > 5 && (
        <TablePagination rowsPerPageOptions={[5, 10]} component="div"
          count={reviews.length} rowsPerPage={rpp} page={page}
          onPageChange={(_, p) => setPage(p)}
          onRowsPerPageChange={e => { setRpp(+e.target.value); setPage(0); }}
          SelectProps={{ MenuProps: { disableScrollLock: true } }}
          sx={{ borderTop: `1px solid ${alpha(PALETTE.TEAL, 0.1)}`, '& .MuiTablePagination-toolbar': { minHeight: '40px' }, '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': { fontSize: '0.76rem', color: PALETTE.TEXT } }} />
      )}
    </>
  );
});
EmployeeReviewsTable.displayName = 'EmployeeReviewsTable';

export default function Review() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { showSnackbar } = useGlobalSnackbar();
  const location = useLocation();

  // Fetch active reviews
  const { data: rawReviews = [], isLoading, refetch } = useQuery({
    queryKey: ['reviews', { is_deleted: false }],
    queryFn: async () => {
      const res = await reviewsApi.getReviews({ is_deleted: false });
      const raw = Array.isArray(res.data) ? res.data : res.data?.results ?? res.data?.data ?? [];
      return raw.map(transformReview);
    },
    staleTime: 5 * 60 * 1000,
  });

  // Seen status mutations
  const markSeenMutation = useMutation({
    mutationFn: (id) => reviewsApi.markSeen(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });

  const markAllSeenMutation = useMutation({
    mutationFn: () => reviewsApi.markAllSeen(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      showSnackbar('All reviews marked as read', 'success');
    }
  });

  // Fetch deleted reviews for recycle bin
  const { data: binItems = [], isLoading: binLoading, refetch: refetchBin } = useQuery({
    queryKey: ['reviews', { is_deleted: true }],
    queryFn: async () => {
      const res = await reviewsApi.getReviews({ is_deleted: true });
      const raw = Array.isArray(res.data) ? res.data : res.data?.results ?? res.data?.data ?? [];
      return raw.map(transformReview);
    },
    staleTime: 2 * 60 * 1000,
  });

  const [view, setView] = useState('all');
  const [period, setPeriod] = useState('all');
  const [search, setSearch] = useState('');
  const [tableSearch, setTableSearch] = useState('');
  const [binSearch, setBinSearch] = useState('');
  const [empFilter, setEmpFilter] = useState('all');
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailItem, setDetailItem] = useState(null);
  const [selected, setSelected] = useState(new Set());
  const [binSelected, setBinSelected] = useState(new Set());
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, item: null, isBulk: false });
  const [binOpen, setBinOpen] = useState(false);
  const [binPage, setBinPage] = useState(0);
  const [binRpp, setBinRpp] = useState(10);

  const openDetail = useCallback((r) => {
    setDetailItem(r);
    setDetailOpen(true);
    if (!r.isSeen) {
      markSeenMutation.mutate(r.id);
    }
  }, [markSeenMutation]);

  const highlightedRef = React.useRef(null);

  React.useEffect(() => {
    const targetId = location.state?.highlightReviewId;
    if (targetId && rawReviews.length > 0 && highlightedRef.current !== targetId) {
      const review = rawReviews.find(r => r.id === targetId);
      if (review) {
        highlightedRef.current = targetId;
        openDetail(review);
      }
    }
  }, [location.state, rawReviews, openDetail]);

  const toggleSelect = useCallback((id) => setSelected(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  }), []);

  const toggleSelectAll = useCallback((items) => setSelected(prev => {
    const next = new Set(prev);
    const allOnPage = items.every(i => next.has(i.id));
    items.forEach(i => allOnPage ? next.delete(i.id) : next.add(i.id));
    return next;
  }), []);

  const toggleBinSelect = useCallback((id) => setBinSelected(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  }), []);

  const toggleBinSelectAll = useCallback((items) => setBinSelected(prev => {
    const next = new Set(prev);
    const allOnPage = items.every(i => next.has(i.id));
    items.forEach(i => allOnPage ? next.delete(i.id) : next.add(i.id));
    return next;
  }), []);

  // Restore mutation
  const restoreMutation = useMutation({
    mutationFn: async (ids) => {
      const payload = {
        is_deleted: false,
        deleted_by: null,
        deleted_by_email: null,
        deleted_date: null
      };
      const promises = ids.map(async (id) => {
        try {
          return await reviewsApi.patch(id, payload);
        } catch (error) {
          console.error(`Failed to restore review ${id}:`, error);
          throw error;
        }
      });
      return Promise.all(promises);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['reviews', { is_deleted: false }] });
      queryClient.invalidateQueries({ queryKey: ['reviews', { is_deleted: true }] });
      setBinSelected(new Set());
      showSnackbar(`${data.length} item(s) restored successfully`, 'success');
    },
    onError: (error) => {
      console.error('Restore error:', error);
      showSnackbar(error?.response?.data?.message || 'Failed to restore items. Please try again.', 'error');
    }
  });

  // Soft delete mutation
  const softDeleteMutation = useMutation({
    mutationFn: async (ids) => {
      const payload = {
        is_deleted: true,
        deleted_by: user?.name || 'Admin',
        deleted_by_email: user?.email || '',
        deleted_date: new Date().toISOString()
      };
      return Promise.all(ids.map(id => reviewsApi.patch(id, payload)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews', { is_deleted: false }] });
      queryClient.invalidateQueries({ queryKey: ['reviews', { is_deleted: true }] });
      setSelected(new Set());
      showSnackbar('Items moved to recycle bin', 'success');
    },
    onError: (error) => {
      console.error('Soft delete error:', error);
      showSnackbar(error?.response?.data?.message || 'Failed to move items to recycle bin', 'error');
    }
  });

  // Permanent delete mutation
  const permanentDeleteMutation = useMutation({
    mutationFn: async (ids) => {
      return Promise.all(ids.map(id => reviewsApi.delete(id)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews', { is_deleted: false }] });
      queryClient.invalidateQueries({ queryKey: ['reviews', { is_deleted: true }] });
      setBinSelected(new Set());
      showSnackbar('Items deleted permanently', 'success');
    },
    onError: (error) => {
      console.error('Permanent delete error:', error);
      showSnackbar(error?.response?.data?.message || 'Failed to delete items permanently', 'error');
    }
  });

  // Filter logic
  const filteredRoot = useMemo(() => {
    let list = rawReviews.filter(r => inPeriod(r.rawDate, period));
    if (search) {
      const lq = search.toLowerCase();
      list = list.filter(r => r.reviewer.toLowerCase().includes(lq) || r.text.toLowerCase().includes(lq) || r.employees.some(e => e.toLowerCase().includes(lq)));
    }
    if (empFilter !== 'all') list = list.filter(r => r.employees.includes(empFilter));
    
    // Sort newest first
    list.sort((a, b) => {
      const dateA = relativeToApproxDate(a.rawDate)?.getTime() || 0;
      const dateB = relativeToApproxDate(b.rawDate)?.getTime() || 0;
      return dateB - dateA;
    });

    return list;
  }, [rawReviews, period, search, empFilter]);

  const filtered = useMemo(() => {
    if (!tableSearch) return filteredRoot;
    const lq = tableSearch.toLowerCase();
    return filteredRoot.filter(r => r.reviewer.toLowerCase().includes(lq) || r.text.toLowerCase().includes(lq));
  }, [filteredRoot, tableSearch]);

  const filteredBin = useMemo(() => {
    let list = binItems;
    if (binSearch) {
      const lq = binSearch.toLowerCase();
      list = list.filter(r => r.reviewer.toLowerCase().includes(lq) || r.text.toLowerCase().includes(lq));
    }
    
    // Sort newest first
    list.sort((a, b) => {
      const dateA = relativeToApproxDate(a.rawDate)?.getTime() || 0;
      const dateB = relativeToApproxDate(b.rawDate)?.getTime() || 0;
      return dateB - dateA;
    });

    return list;
  }, [binItems, binSearch]);

  // Employee statistics
  const employeeStats = useMemo(() => {
    const map = {};
    EMPLOYEES.forEach(({ name }) => { map[name] = { name, count: 0, totalRating: 0, reviews: [] }; });
    filtered.forEach(r => {
      r.employees.forEach(emp => {
        if (map[emp]) { map[emp].count++; map[emp].totalRating += r.rating; map[emp].reviews.push(r); }
      });
    });
    return Object.values(map).map(e => ({ ...e, avg: e.count ? (e.totalRating / e.count).toFixed(1) : '0.0' })).sort((a, b) => b.count - a.count);
  }, [filtered]);

  const totalReviews = filtered.length;
  const avgRating = totalReviews ? (filtered.reduce((s, r) => s + r.rating, 0) / totalReviews).toFixed(1) : '0.0';
  const fiveStars = filtered.filter(r => r.rating === 5).length;
  const empCount = employeeStats.filter(e => e.count > 0).length;

  if (isLoading) return <DashboardLoader />;

  return (
    <Box>
      <Helmet>
        <title>Reviews Tracking | Sterling Septic & Plumbing LLC</title>
        <meta name="description" content="Employee review analytics and scraper management" />
      </Helmet>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography sx={{ fontWeight: 600, mb: 0.5, fontSize: '1rem', color: PALETTE.TEXT, letterSpacing: '-0.01em' }}>Reviews Tracking</Typography>
          <Typography variant="body2" sx={{ color: PALETTE.GRAY, fontSize: '0.8rem' }}>Customer reviews with employee recognition and deletion management</Typography>
        </Box>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <RefreshButton onRefresh={rmeApi.startReviewTrackerScraping} onComplete={() => {
            queryClient.invalidateQueries(['reviews']);
            refetch();
            refetchBin();
          }} />
          {rawReviews.some(r => !r.isSeen) && (
            <Button
              variant="outlined"
              startIcon={<Check size={16} />}
              onClick={() => markAllSeenMutation.mutate()}
              disabled={markAllSeenMutation.isPending}
              sx={{
                textTransform: 'none',
                color: PALETTE.ORANGE,
                borderColor: alpha(PALETTE.ORANGE, 0.3),
                height: '36px',
                px: 2,
                '&:hover': {
                  bgcolor: alpha(PALETTE.ORANGE, 0.05),
                  borderColor: PALETTE.ORANGE
                }
              }}
            >
              Mark all read
            </Button>
          )}
          <Button variant="outlined" startIcon={<History size={16} />} onClick={() => setBinOpen(true)}
            sx={{ textTransform: 'none', color: PALETTE.PURPLE, borderColor: alpha(PALETTE.PURPLE, 0.3), height: '36px', px: 2, '&:hover': { bgcolor: alpha(PALETTE.PURPLE, 0.05), borderColor: PALETTE.PURPLE } }}>
            Recycle Bin ({binItems.length})
          </Button>
          <ToggleButtonGroup value={view} exclusive onChange={(_, v) => v && setView(v)} size="small"
            sx={{ height: '36px', '& .MuiToggleButton-root': { textTransform: 'none', px: 1.5, color: PALETTE.GRAY, border: `1px solid ${alpha(PALETTE.GRAY, 0.2)}`, '&.Mui-selected': { bgcolor: alpha(PALETTE.BLUE, 0.08), color: PALETTE.BLUE, borderColor: alpha(PALETTE.BLUE, 0.3) } } }}>
            <ToggleButton value="all"><List size={14} style={{ marginRight: 6 }} /> List</ToggleButton>
            <ToggleButton value="employee"><User size={14} style={{ marginRight: 6 }} /> Staff</ToggleButton>
            <ToggleButton value="chart"><BarChart2 size={14} style={{ marginRight: 6 }} /> Analytics</ToggleButton>
          </ToggleButtonGroup>
        </Stack>
      </Box>

      <Box sx={{ display: 'flex', gap: 1.5, mb: 2.5, flexWrap: 'wrap', alignItems: 'center' }}>
        <PeriodToggle value={period} onChange={setPeriod} />
        <Box sx={{ position: 'relative', minWidth: 220 }}>
          <Box sx={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', pointerEvents: 'none' }}><Search size={13} color={alpha(PALETTE.BLUE, 0.5)} /></Box>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Filter all data…"
            style={{ width: '100%', padding: '6px 28px', borderRadius: '6px', border: `1.5px solid ${alpha(PALETTE.BLUE, 0.15)}`, fontSize: '0.78rem', outline: 'none' }} />
        </Box>
        <Box sx={{ minWidth: 200 }}>
          <select value={empFilter} onChange={e => setEmpFilter(e.target.value)}
            style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: `1.5px solid ${alpha(PALETTE.PURPLE, 0.15)}`, fontSize: '0.78rem', outline: 'none', background: 'white' }}>
            <option value="all">All specific employees</option>
            {EMPLOYEES.map(e => <option key={e.id} value={e.name}>{e.name} ({e.role})</option>)}
          </select>
        </Box>
      </Box>

      <Stack direction="row" spacing={1.5} sx={{ mb: 3, flexWrap: 'wrap' }} useFlexGap>
        <StatCard label="Total Reviews" value={totalReviews} color={PALETTE.BLUE} icon={<MessageSquare size={14} />} />
        <StatCard label="Staff Recognized" value={empCount} color={PALETTE.PURPLE} icon={<Users size={14} />} />
      </Stack>

      {view === 'all' && (
        <Section title="Customer Reviews" color={PALETTE.BLUE} count={filteredRoot.length} filteredCount={filtered.length}
          selectedCount={selected.size} onDelete={() => setDeleteConfirm({ open: true, item: null, isBulk: true })}
          tableSearch={tableSearch} onTableSearch={setTableSearch} tableSearchPlaceholder="Search this table…">
          <AllReviewsTable reviews={filtered} onView={openDetail} selected={selected} onToggle={toggleSelect} onToggleAll={toggleSelectAll} onDelete={(r) => setDeleteConfirm({ open: true, item: r, isBulk: false })} />
        </Section>
      )}

      {view === 'employee' && (
        employeeStats.every(e => e.count === 0) ? (
          <Paper elevation={0} sx={{ p: 5, textAlign: 'center', borderRadius: '6px', border: `1px solid ${alpha(PALETTE.GRAY, 0.1)}` }}>
            <Users size={36} color={alpha(PALETTE.GRAY, 0.2)} sx={{ mb: 2.5 }} />
            <Typography sx={{ color: PALETTE.GRAY, fontSize: '0.88rem' }}>No recognized employees for current filters</Typography>
          </Paper>
        ) : employeeStats.map(emp => (
          <Section key={emp.name} title={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography sx={{ fontSize: '0.95rem', fontWeight: 600 }}>{emp.name}</Typography>
              <Typography sx={{ fontSize: '0.72rem', color: PALETTE.GRAY }}>· {EMPLOYEES.find(e => e.name === emp.name)?.role}</Typography>
            </Box>
          } color={avatarColor(emp.name)} count={emp.count}
            headerRight={
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Stars value={Math.round(Number(emp.avg))} size={13} />
                <Typography variant="caption" sx={{ color: PALETTE.GRAY }}>avg {emp.avg}</Typography>
              </Stack>
            }>
            <EmployeeReviewsTable reviews={emp.reviews} onView={openDetail} />
          </Section>
        ))
      )}

      {view === 'chart' && (
        <Section title="Performance Analytics" color={PALETTE.TEAL} count={employeeStats.filter(e => e.count > 0).length}>
          {employeeStats.every(e => e.count === 0) ? (
            <Box sx={{ p: 5, textAlign: 'center' }}><Typography sx={{ color: PALETTE.GRAY }}>Insufficient data for analytics</Typography></Box>
          ) : (
            <Box sx={{ p: 2 }}>
              <EmployeeBarChart data={employeeStats} />
              <TableContainer sx={{ mt: 3 }}>
                <Table size="small">
                  <TableHead><TableRow sx={{ '& th': { borderBottom: `2px solid ${alpha(PALETTE.TEAL, 0.1)}`, fontWeight: 600, fontSize: '0.78rem' } }}>
                    <TableCell>Employee</TableCell><TableCell align="right">Mentions</TableCell><TableCell sx={{ width: '40%' }}>Intensity</TableCell>
                  </TableRow></TableHead>
                  <TableBody>
                    {employeeStats.map(emp => (
                      <TableRow key={emp.name} hover>
                        <TableCell sx={{ py: 1.25 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: avatarColor(emp.name) }} />
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>{emp.name}</Typography>
                          </Box>
                        </TableCell>
                        <TableCell align="right">{emp.count}</TableCell>
                        <TableCell><LinearProgress variant="determinate" value={(emp.count / (Math.max(...employeeStats.map(e => e.count)) || 1)) * 100} sx={{ height: 6, borderRadius: 3, bgcolor: alpha(avatarColor(emp.name), 0.1), '& .MuiLinearProgress-bar': { bgcolor: avatarColor(emp.name), borderRadius: 3 } }} /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
        </Section>
      )}

      <ReviewDetailDialog open={detailOpen} review={detailItem} onClose={() => setDetailOpen(false)} />

      {/* Soft Delete Confirmation Dialog */}
      <CommonDialog
        open={deleteConfirm.open}
        onClose={() => setDeleteConfirm({ open: false, item: null, isBulk: false })}
        onConfirm={() => {
          softDeleteMutation.mutate(deleteConfirm.isBulk ? Array.from(selected) : [deleteConfirm.item.id]);
          setDeleteConfirm({ open: false, item: null, isBulk: false });
        }}
        title="Move to Recycle Bin"
        variant="warning"
        confirmText="Move to Bin"
        isLoading={softDeleteMutation.isPending}
      >
        <Typography variant="body2">
          {deleteConfirm.isBulk
            ? `Are you sure you want to move ${selected.size} review(s) to the Recycle Bin?`
            : `Are you sure you want to move the review from "${deleteConfirm.item?.reviewer}" to the Recycle Bin?`
          }
        </Typography>
        <Typography variant="caption" sx={{ display: 'block', mt: 1, color: PALETTE.GRAY }}>
          You can restore items from the Recycle Bin later.
        </Typography>
      </CommonDialog>

      {/* Recycle Bin Modal */}
      <RecycleBinModal
        open={binOpen}
        onClose={() => setBinOpen(false)}
        items={filteredBin}
        isLoading={binLoading}
        selected={binSelected}
        page={binPage}
        rowsPerPage={binRpp}
        onPageChange={(_, p) => setBinPage(p)}
        onRowsPerPageChange={(e) => { setBinRpp(+e.target.value); setBinPage(0); }}
        onToggle={toggleBinSelect}
        onToggleAll={toggleBinSelectAll}
        onSearchChange={setBinSearch}
        search={binSearch}
        onBulkRestore={() => restoreMutation.mutate(Array.from(binSelected))}
        onBulkDelete={() => permanentDeleteMutation.mutate(Array.from(binSelected))}
        onSingleRestore={(i) => restoreMutation.mutate([i.id])}
        onSingleDelete={(i) => permanentDeleteMutation.mutate([i.id])}
        isDeleting={permanentDeleteMutation.isPending}
      />
    </Box>
  );
}