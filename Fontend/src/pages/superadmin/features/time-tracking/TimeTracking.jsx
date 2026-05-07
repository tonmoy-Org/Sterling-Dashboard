import React, { useState, useMemo, useCallback, memo } from 'react';
import OutlineButton from '../../../../components/ui/OutlineButton';
import {
    Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Chip, Stack, LinearProgress,
    IconButton, useTheme, useMediaQuery, Grid, TablePagination,
    Modal, Tooltip, Checkbox, Button, TextField,
    Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import { styled, alpha } from '@mui/material/styles';
import { Helmet } from 'react-helmet-async';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Clock, MapPin, Briefcase, ChevronRight, Calendar,
    DollarSign, Truck, History, Trash2, RotateCcw, X, AlertCircle, Search,
    ChevronDown, ChevronUp, FileText, Eye
} from 'lucide-react';
import RefreshButton from '../../../../components/ui/RefreshButton';
import CommonDialog from '../../../../components/ui/CommonDialog';
import { format } from 'date-fns';
import { rmeApi } from '../../../../api/services/rmeApi';
import { timeTrackingApi } from '../../../../api/services/timeTrackingApi';
import { formatDate } from '../../../../utils/dateFormats';
import { useGlobalSnackbar } from '../../../../context/GlobalSnackbarContext';
import DashboardLoader from '../../../../components/Loader/DashboardLoader';

// ─── Palette (matching CustomerCenter) ─────────────────────────────────────
const PALETTE = {
    TEXT: '#0F1115',
    GRAY: '#6b7280',
    BLUE: '#1976d2',
    GREEN: '#10b981',
    ORANGE: '#ed6c02',
    PURPLE: '#8b5cf6',
    RED: '#ef4444',
    TEAL: '#0891b2',
    AMBER: '#f59e0b',
};

// ─── Date formatter (matching CustomerCenter) ──────────────────────────────
const formatDateTimeWithTZ = (dateString) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    return isNaN(date) ? '—' : format(date, "MM/dd/yy hh:mm a");
};

// ─── Table Search Bar (matching CustomerCenter style) ──────────────────────
const TableSearchBar = memo(({ value, onChange, color, placeholder = 'Search…' }) => (
    <Box sx={{ position: 'relative', minWidth: 220 }}>
        <Box sx={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', pointerEvents: 'none', zIndex: 1 }}>
            <Search size={13} color={alpha(color, 0.55)} />
        </Box>
        <input
            type="text"
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder={placeholder}
            style={{
                width: '100%', padding: '5px 30px', borderRadius: '6px',
                border: `1.5px solid ${alpha(color, 0.2)}`, fontSize: '0.78rem',
                outline: 'none', background: 'white', color: PALETTE.TEXT,
                boxSizing: 'border-box', transition: 'border-color 0.15s, box-shadow 0.15s',
            }}
            onFocus={e => { e.target.style.borderColor = color; e.target.style.boxShadow = `0 0 0 3px ${alpha(color, 0.1)}`; }}
            onBlur={e => { e.target.style.borderColor = alpha(color, 0.2); e.target.style.boxShadow = 'none'; }}
        />
        {value && (
            <IconButton size="small" onClick={() => onChange('')} sx={{ position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)', padding: '2px', color: PALETTE.GRAY, '&:hover': { color } }}>
                <X size={12} />
            </IconButton>
        )}
    </Box>
));
TableSearchBar.displayName = 'TableSearchBar';

// ─── Section Wrapper (matching CustomerCenter) ────────────────────────────
const Section = memo(({ title, color, count, filteredCount, selectedCount, onDelete, items, children, tableSearch, onTableSearch, tableSearchPlaceholder }) => (
    <Paper elevation={0} sx={{ mb: 4, borderRadius: '6px', overflow: 'hidden', border: `1px solid ${alpha(color, 0.15)}`, bgcolor: 'white' }}>
        <Box sx={{ p: 1.5, bgcolor: 'white', borderBottom: `1px solid ${alpha(color, 0.1)}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                <Typography component="div" sx={{ fontSize: '1rem', color: PALETTE.TEXT, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    {title}
                    <Chip size="small" label={tableSearch ? `${filteredCount}/${count}` : count}
                        sx={{ bgcolor: alpha(color, 0.08), color: PALETTE.TEXT, fontSize: '0.75rem', fontWeight: 500, height: '24px', '& .MuiChip-label': { px: 1.2, py: 0 } }} />
                </Typography>
            </Box>
            <Stack direction="row" spacing={1} alignItems="center">
                {selectedCount > 0 ? (
                    <OutlineButton color="error" size="small" onClick={onDelete} startIcon={<Trash2 size={14} />}
                        sx={{ height: '32px', px: 2, borderRadius: '6px' }}>
                        Trash Selected ({selectedCount})
                    </OutlineButton>
                ) : (
                    <TableSearchBar value={tableSearch} onChange={onTableSearch} color={color} placeholder={tableSearchPlaceholder} />
                )}
            </Stack>
        </Box>
        {children}
    </Paper>
));

Section.displayName = 'Section';

// ─── Table Head (matching CustomerCenter) ──────────────────────────────────
const THead = memo(({ color, allOnPage, someOnPage, onToggleAll, extraCols }) => (
    <TableHead>
        <TableRow sx={{ bgcolor: alpha(color, 0.04), '& th': { borderBottom: `2px solid ${alpha(color, 0.1)}` } }}>
            <TableCell padding="checkbox" sx={{ pl: 2.5, py: 1.5 }}>
                <Checkbox size="small" checked={allOnPage} indeterminate={someOnPage && !allOnPage} onChange={onToggleAll} sx={{ color: PALETTE.TEXT, padding: '4px' }} />
            </TableCell>
            {[
                { label: 'Employee', width: 180 },
                { label: 'Date', width: 120 },
                { label: 'Duration (min)', width: 130 },
                { label: 'Travel', width: 100 },
                { label: 'Work', width: 100 },
                { label: 'Billing', width: 100 },
            ].map(col => (
                <TableCell key={col.label} sx={{ color: PALETTE.TEXT, fontSize: '0.8rem', fontWeight: 600, py: 1.5, width: col.width, minWidth: col.minWidth, whiteSpace: 'nowrap' }}>
                    {col.label}
                </TableCell>
            ))}
            {extraCols.map((c, i) => (
                <TableCell key={i} sx={{ color: PALETTE.TEXT, fontSize: '0.8rem', fontWeight: 600, py: 1.5, width: c.width, whiteSpace: 'nowrap' }}>
                    {c.label}
                </TableCell>
            ))}
        </TableRow>
    </TableHead>
));
THead.displayName = 'THead';

// ─── Empty Row (matching CustomerCenter) ───────────────────────────────────
const EmptyRow = memo(({ colSpan, isFiltered }) => (
    <TableRow>
        <TableCell colSpan={colSpan} align="center" sx={{ py: 6 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                <Search size={32} color={alpha(PALETTE.TEXT, 0.2)} />
                <Typography variant="body2" sx={{ color: PALETTE.TEXT, opacity: 0.5, fontSize: '0.85rem', fontWeight: 500 }}>
                    {isFiltered ? 'No matching records' : 'No records'}
                </Typography>
                {isFiltered && <Typography variant="caption" sx={{ color: PALETTE.GRAY, fontSize: '0.78rem' }}>Try adjusting your search</Typography>}
            </Box>
        </TableCell>
    </TableRow>
));
EmptyRow.displayName = 'EmptyRow';

// ─── Proficiency Chip ──────────────────────────────────────────────────────
const ProficiencyChip = memo(({ value, color }) => (
    <Chip
        label={`${value}%`}
        size="small"
        sx={{
            height: 20,
            fontSize: '0.7rem',
            fontWeight: 600,
            bgcolor: alpha(color, 0.12),
            color: color,
            '& .MuiChip-label': { px: 1, py: 0 }
        }}
    />
));
ProficiencyChip.displayName = 'ProficiencyChip';

// ─── Time Entry Row Component (refactored to match CustomerCenter style) ───
const TimeEntryRow = memo(({ entry, expanded, onToggle, onDelete, onRestore, isSelected, onSelect }) => {
    const travelProficiencyColor = entry.travel?.proficiency >= 80 ? PALETTE.GREEN : entry.travel?.proficiency >= 70 ? PALETTE.AMBER : PALETTE.RED;
    const workProficiencyColor = entry.workingTime?.proficiency >= 90 ? PALETTE.GREEN : entry.workingTime?.proficiency >= 80 ? PALETTE.AMBER : PALETTE.RED;
    const billingProficiencyColor = (entry.billing?.proficiency || 0) >= 120 ? PALETTE.GREEN : PALETTE.AMBER;

    return (
        <>
            <TableRow
                hover
                sx={{
                    bgcolor: isSelected ? alpha(PALETTE.BLUE, 0.07) : 'white',
                    transition: 'background-color 0.15s',
                    '&:hover': { backgroundColor: isSelected ? alpha(PALETTE.BLUE, 0.1) : alpha(PALETTE.BLUE, 0.03) },
                    '&:last-child td': { borderBottom: 'none' },
                    opacity: entry.is_deleted ? 0.7 : 1,
                    cursor: 'pointer'
                }}
                onClick={onToggle}
            >
                <TableCell padding="checkbox" sx={{ pl: 2.5, py: 1.5 }}>
                    <Checkbox 
                        size="small" 
                        checked={isSelected} 
                        onChange={(e) => { e.stopPropagation(); onSelect(); }} 
                        sx={{ color: PALETTE.TEXT, padding: '4px' }} 
                    />
                </TableCell>
                <TableCell sx={{ py: 1.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.85rem', color: PALETTE.TEXT }}>
                            {entry.employeeName}
                        </Typography>
                        {!entry.is_seen && (
                            <Chip 
                                label="NEW" 
                                size="small" 
                                sx={{ 
                                    height: 16, fontSize: '0.65rem', fontWeight: 700, 
                                    bgcolor: PALETTE.BLUE, color: 'white', borderRadius: '4px',
                                    '& .MuiChip-label': { px: 0.5 }
                                }} 
                            />
                        )}
                    </Box>
                    {entry.workOrder && (
                        <Typography variant="caption" sx={{ fontSize: '0.72rem', color: PALETTE.GRAY, display: 'block', mt: 0.25 }}>
                            WO: {entry.workOrder}
                        </Typography>
                    )}
                </TableCell>
                <TableCell sx={{ py: 1.5 }}>
                    <Typography variant="body2" sx={{ fontSize: '0.82rem', color: PALETTE.TEXT }}>
                        {formatDate(entry.date)}
                    </Typography>
                </TableCell>
                <TableCell sx={{ py: 1.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                        <Clock size={12} color={PALETTE.GRAY} />
                        <Typography variant="body2" sx={{ fontSize: '0.82rem', fontWeight: 500, color: PALETTE.TEXT }}>
                            {entry.workingTime?.marked?.minutes || 0}m
                        </Typography>
                        <Typography variant="caption" sx={{ fontSize: '0.7rem', color: PALETTE.GRAY }}>
                            / {entry.workingTime?.actual?.minutes || 0}m
                        </Typography>
                    </Box>
                </TableCell>
                <TableCell sx={{ py: 1.5 }}>
                    <ProficiencyChip value={entry.travel?.proficiency || 0} color={travelProficiencyColor} />
                </TableCell>
                <TableCell sx={{ py: 1.5 }}>
                    <ProficiencyChip value={entry.workingTime?.proficiency || 0} color={workProficiencyColor} />
                </TableCell>
                <TableCell sx={{ py: 1.5 }}>
                    <ProficiencyChip value={entry.billing?.proficiency || 0} color={billingProficiencyColor} />
                </TableCell>
                <TableCell sx={{ py: 1.5, pr: 2.5 }}>
                    <Stack direction="row" spacing={0.5} justifyContent="flex-end" alignItems="center">
                        {entry.is_deleted ? (
                            <Tooltip title="Restore">
                                <IconButton 
                                    size="small" 
                                    onClick={(e) => { e.stopPropagation(); onRestore(entry.id); }}
                                    sx={{ color: PALETTE.GREEN, borderRadius: '6px', p: 0.75, '&:hover': { bgcolor: alpha(PALETTE.GREEN, 0.1) } }}
                                >
                                    <RotateCcw size={15} />
                                </IconButton>
                            </Tooltip>
                        ) : (
                            <Tooltip title="Move to Recycle Bin">
                                <IconButton 
                                    size="small" 
                                    onClick={(e) => { e.stopPropagation(); onDelete(entry.id); }}
                                    sx={{ color: PALETTE.RED, borderRadius: '6px', p: 0.75, '&:hover': { bgcolor: alpha(PALETTE.RED, 0.1) } }}
                                >
                                    <Trash2 size={15} />
                                </IconButton>
                            </Tooltip>
                        )}
                        <IconButton size="small" sx={{ color: PALETTE.GRAY, borderRadius: '6px', p: 0.75 }}>
                            {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                        </IconButton>
                    </Stack>
                </TableCell>
            </TableRow>

            {/* Expanded Details Row - styled to match CustomerCenter */}
            {expanded && (
                <TableRow>
                    <TableCell colSpan={8} sx={{ p: 0, bgcolor: alpha(PALETTE.BLUE, 0.02), borderBottom: 'none' }}>
                        <Box sx={{ p: 2.5 }}>
                            <Grid container spacing={2}>
                                {/* Travel Section */}
                                <Grid size={{ xs: 12, md: 4 }}>
                                    <Paper elevation={0} sx={{ p: 1.5, borderRadius: '6px', bgcolor: 'white', border: `1px solid ${alpha(PALETTE.TEXT, 0.08)}`, height: '100%' }}>
                                        <Typography variant="caption" sx={{ fontSize: '0.7rem', fontWeight: 600, color: PALETTE.GRAY, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: 0.5, mb: 1.5 }}>
                                            <MapPin size={12} /> Travel Time
                                        </Typography>
                                        <Stack spacing={1.5}>
                                            <Box>
                                                <Typography variant="caption" sx={{ fontSize: '0.7rem', color: PALETTE.GRAY }}>Marked (FieldEdge)</Typography>
                                                <Typography variant="body2" sx={{ fontSize: '0.8rem', fontWeight: 500, color: PALETTE.TEXT }}>
                                                    {entry.travel?.marked?.start || 'N/A'} — {entry.travel?.marked?.end || 'N/A'}
                                                </Typography>
                                                <Typography variant="caption" sx={{ fontSize: '0.75rem', color: PALETTE.ORANGE, fontWeight: 500 }}>
                                                    {entry.travel?.marked?.minutes || 0} MIN
                                                </Typography>
                                            </Box>
                                            <Box>
                                                <Typography variant="caption" sx={{ fontSize: '0.7rem', color: PALETTE.GRAY }}>Actual (Fleetmatics)</Typography>
                                                <Typography variant="body2" sx={{ fontSize: '0.8rem', fontWeight: 500, color: PALETTE.TEXT }}>
                                                    {entry.travel?.actual?.start || 'N/A'} — {entry.travel?.actual?.end || 'N/A'}
                                                </Typography>
                                                <Typography variant="caption" sx={{ fontSize: '0.75rem', color: PALETTE.GREEN, fontWeight: 500 }}>
                                                    {entry.travel?.actual?.minutes || 0} MIN
                                                </Typography>
                                            </Box>
                                        </Stack>
                                    </Paper>
                                </Grid>

                                {/* Working Time Section */}
                                <Grid size={{ xs: 12, md: 4 }}>
                                    <Paper elevation={0} sx={{ p: 1.5, borderRadius: '6px', bgcolor: 'white', border: `1px solid ${alpha(PALETTE.TEXT, 0.08)}`, height: '100%' }}>
                                        <Typography variant="caption" sx={{ fontSize: '0.7rem', fontWeight: 600, color: PALETTE.GRAY, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: 0.5, mb: 1.5 }}>
                                            <Briefcase size={12} /> Working Time
                                        </Typography>
                                        <Stack spacing={1.5}>
                                            <Box>
                                                <Typography variant="caption" sx={{ fontSize: '0.7rem', color: PALETTE.GRAY }}>Marked (FieldEdge)</Typography>
                                                <Typography variant="body2" sx={{ fontSize: '0.8rem', fontWeight: 500, color: PALETTE.TEXT }}>
                                                    {entry.workingTime?.marked?.start || 'N/A'} — {entry.workingTime?.marked?.end || 'N/A'}
                                                </Typography>
                                                <Typography variant="caption" sx={{ fontSize: '0.75rem', color: PALETTE.ORANGE, fontWeight: 500 }}>
                                                    {entry.workingTime?.marked?.minutes || 0} MIN
                                                </Typography>
                                            </Box>
                                            <Box>
                                                <Typography variant="caption" sx={{ fontSize: '0.7rem', color: PALETTE.GRAY }}>Actual (Fleetmatics)</Typography>
                                                <Typography variant="body2" sx={{ fontSize: '0.8rem', fontWeight: 500, color: PALETTE.TEXT }}>
                                                    {entry.workingTime?.actual?.start || 'N/A'} — {entry.workingTime?.actual?.end || 'N/A'}
                                                </Typography>
                                                <Typography variant="caption" sx={{ fontSize: '0.75rem', color: PALETTE.GREEN, fontWeight: 500 }}>
                                                    {entry.workingTime?.actual?.minutes || 0} MIN
                                                </Typography>
                                            </Box>
                                        </Stack>
                                    </Paper>
                                </Grid>

                                {/* Billing Section */}
                                <Grid size={{ xs: 12, md: 4 }}>
                                    <Paper elevation={0} sx={{ p: 1.5, borderRadius: '6px', bgcolor: 'white', border: `1px solid ${alpha(PALETTE.TEXT, 0.08)}`, height: '100%' }}>
                                        <Typography variant="caption" sx={{ fontSize: '0.7rem', fontWeight: 600, color: PALETTE.GRAY, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: 0.5, mb: 1.5 }}>
                                            <DollarSign size={12} /> Billing
                                        </Typography>
                                        <Stack spacing={1.5}>
                                            <Box>
                                                <Typography variant="caption" sx={{ fontSize: '0.7rem', color: PALETTE.GRAY }}>Variant Time Billed (FieldEdge)</Typography>
                                                <Typography variant="body2" sx={{ fontSize: '0.85rem', fontWeight: 600, color: PALETTE.ORANGE }}>
                                                    {entry.billing?.variant?.minutes || 0} MIN
                                                </Typography>
                                            </Box>
                                            <Box>
                                                <Typography variant="caption" sx={{ fontSize: '0.7rem', color: PALETTE.GRAY }}>Actual Worked (Fleetmatics)</Typography>
                                                <Typography variant="body2" sx={{ fontSize: '0.85rem', fontWeight: 600, color: PALETTE.GREEN }}>
                                                    {entry.billing?.actual?.minutes || 0} MIN
                                                </Typography>
                                            </Box>
                                        </Stack>
                                    </Paper>
                                </Grid>

                                {/* Timeline Activities - full width */}
                                <Grid size={{ xs: 12 }}>
                                    <Paper variant="outlined" sx={{ p: 2, borderRadius: '6px', borderColor: alpha(PALETTE.GRAY, 0.15), bgcolor: alpha(PALETTE.BLUE, 0.01) }}>
                                        <Typography variant="caption" sx={{ fontSize: '0.7rem', fontWeight: 600, color: PALETTE.GRAY, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: 0.5, mb: 2 }}>
                                            <History size={12} /> Activity Timeline
                                        </Typography>
                                        <Grid container spacing={2}>
                                            {/* FieldEdge Column */}
                                            <Grid size={{ xs: 12, md: 6 }}>
                                                <Typography variant="caption" sx={{ fontSize: '0.7rem', fontWeight: 600, color: PALETTE.BLUE, mb: 1, display: 'block' }}>
                                                    FieldEdge Activities
                                                </Typography>
                                                <Stack spacing={1}>
                                                    {entry.fieldedgeEntries?.map((activity, idx) => (
                                                        <Box key={idx} sx={{ 
                                                            display: 'flex', 
                                                            justifyContent: 'space-between', 
                                                            alignItems: 'center',
                                                            p: 1,
                                                            borderRadius: '4px',
                                                            bgcolor: alpha(activity.status === 'Working' ? PALETTE.BLUE : PALETTE.ORANGE, 0.05),
                                                            border: `1px solid ${alpha(activity.status === 'Working' ? PALETTE.BLUE : PALETTE.ORANGE, 0.1)}`
                                                        }}>
                                                            <Stack direction="row" spacing={1.5} alignItems="center">
                                                                <Box sx={{ 
                                                                    px: 1, py: 0.25, borderRadius: '12px', 
                                                                    bgcolor: activity.status === 'Working' ? alpha(PALETTE.BLUE, 0.15) : alpha(PALETTE.ORANGE, 0.15),
                                                                    color: activity.status === 'Working' ? PALETTE.BLUE : PALETTE.ORANGE,
                                                                    fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase'
                                                                }}>
                                                                    {activity.status}
                                                                </Box>
                                                                <Typography variant="body2" sx={{ fontSize: '0.78rem', fontWeight: 500 }}>
                                                                    {activity.startTime} — {activity.endTime}
                                                                </Typography>
                                                            </Stack>
                                                            <Typography variant="caption" sx={{ fontWeight: 600, color: PALETTE.TEXT, fontSize: '0.75rem' }}>
                                                                {activity.duration}
                                                            </Typography>
                                                        </Box>
                                                    ))}
                                                    {!entry.fieldedgeEntries?.length && (
                                                        <Typography variant="caption" sx={{ color: PALETTE.GRAY, textAlign: 'center', py: 2, fontSize: '0.75rem' }}>
                                                            No FieldEdge data available.
                                                        </Typography>
                                                    )}
                                                </Stack>
                                            </Grid>

                                            {/* Fleetmatics Column */}
                                            <Grid size={{ xs: 12, md: 6 }}>
                                                <Typography variant="caption" sx={{ fontSize: '0.7rem', fontWeight: 600, color: PALETTE.TEAL, mb: 1, display: 'block' }}>
                                                    Fleetmatics Activities
                                                </Typography>
                                                <Stack spacing={1}>
                                                    {entry.fleetmaticsEntries?.map((activity, idx) => (
                                                        <Box key={idx} sx={{ 
                                                            display: 'flex', 
                                                            justifyContent: 'space-between', 
                                                            alignItems: 'center',
                                                            p: 1,
                                                            borderRadius: '4px',
                                                            bgcolor: alpha(activity.category?.toLowerCase().includes('idle') ? PALETTE.AMBER : PALETTE.GREEN, 0.05),
                                                            border: `1px solid ${alpha(activity.category?.toLowerCase().includes('idle') ? PALETTE.AMBER : PALETTE.GREEN, 0.1)}`
                                                        }}>
                                                            <Stack direction="row" spacing={1.5} alignItems="center">
                                                                <Box sx={{ 
                                                                    px: 1, py: 0.25, borderRadius: '12px', 
                                                                    bgcolor: activity.category?.toLowerCase().includes('idle') ? alpha(PALETTE.AMBER, 0.15) : alpha(PALETTE.GREEN, 0.15),
                                                                    color: activity.category?.toLowerCase().includes('idle') ? PALETTE.AMBER : PALETTE.GREEN,
                                                                    fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase'
                                                                }}>
                                                                    {activity.category}
                                                                </Box>
                                                                <Box>
                                                                    <Typography variant="body2" sx={{ fontSize: '0.78rem', fontWeight: 500 }}>
                                                                        {activity.arrival_time} — {activity.departure_time}
                                                                    </Typography>
                                                                    {activity.vehicle_name && (
                                                                        <Typography variant="caption" sx={{ fontSize: '0.65rem', color: PALETTE.GRAY, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                                            <Truck size={10} /> {activity.vehicle_name}
                                                                        </Typography>
                                                                    )}
                                                                </Box>
                                                            </Stack>
                                                            <Typography variant="caption" sx={{ fontWeight: 600, color: PALETTE.TEXT, fontSize: '0.75rem' }}>
                                                                {activity.duration} MIN
                                                            </Typography>
                                                        </Box>
                                                    ))}
                                                    {!entry.fleetmaticsEntries?.length && (
                                                        <Typography variant="caption" sx={{ color: PALETTE.GRAY, textAlign: 'center', py: 2, fontSize: '0.75rem' }}>
                                                            No Fleetmatics data available.
                                                        </Typography>
                                                    )}
                                                </Stack>
                                            </Grid>
                                        </Grid>
                                    </Paper>
                                </Grid>
                            </Grid>
                        </Box>
                    </TableCell>
                </TableRow>
            )}
        </>
    );
});
TimeEntryRow.displayName = 'TimeEntryRow';

// ─── Recycle Bin Modal (refactored to match CustomerCenter style) ──────────
const RecycleBinModal = memo(({ open, onClose, items, isLoading, isRestoring, isDeleting, onRestore, onDeletePermanently, onBulkRestore, onBulkDelete }) => {
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [search, setSearch] = useState('');
    const [selected, setSelected] = useState(new Set());
    const [permDeleteModal, setPermDeleteModal] = useState({ open: false, item: null, isBulk: false });
    const [restoreModal, setRestoreModal] = useState({ open: false, item: null, isBulk: false });

    const filteredItems = useMemo(() => {
        if (!search) return items;
        const q = search.toLowerCase();
        return items.filter(i => 
            (i.technician_name || '').toLowerCase().includes(q) ||
            (i.wo_number || '').toLowerCase().includes(q) ||
            (i.deleted_by_name || '').toLowerCase().includes(q)
        );
    }, [items, search]);

    const pageItems = useMemo(() => 
        filteredItems.slice(page * rowsPerPage, (page + 1) * rowsPerPage),
        [filteredItems, page, rowsPerPage]
    );

    const allOnPage = pageItems.length > 0 && pageItems.every(i => selected.has(i.id));
    const someOnPage = pageItems.length > 0 && pageItems.some(i => selected.has(i.id)) && !allOnPage;

    const handleToggle = useCallback((id) => {
        setSelected(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    }, []);

    const handleToggleAll = useCallback((items) => {
        const allSelected = items.every(i => selected.has(i.id));
        setSelected(prev => {
            const next = new Set(prev);
            items.forEach(i => allSelected ? next.delete(i.id) : next.add(i.id));
            return next;
        });
    }, [selected]);

    return (
        <>
            <Modal open={open} onClose={onClose} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Box sx={{ width: '95%', maxWidth: 1400, maxHeight: '85vh', bgcolor: 'white', borderRadius: '8px', boxShadow: '0 25px 60px rgba(0,0,0,0.15)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                    
                    {/* Header */}
                    <Box sx={{ p: 2, borderBottom: `1px solid ${alpha(PALETTE.PURPLE, 0.12)}`, background: `linear-gradient(135deg, ${alpha(PALETTE.PURPLE, 0.06)} 0%, ${alpha(PALETTE.PURPLE, 0.02)} 100%)`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Box sx={{ width: 42, height: 42, borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: `linear-gradient(135deg, ${alpha(PALETTE.PURPLE, 0.15)} 0%, ${alpha(PALETTE.PURPLE, 0.08)} 100%)`, color: PALETTE.PURPLE, border: `1px solid ${alpha(PALETTE.PURPLE, 0.15)}` }}>
                                <History size={20} />
                            </Box>
                            <Box>
                                <Typography sx={{ fontSize: '1rem', fontWeight: 700, color: PALETTE.TEXT, letterSpacing: '-0.01em' }}>Recycle Bin</Typography>
                                <Typography variant="body2" sx={{ fontSize: '0.78rem', color: PALETTE.GRAY }}>{items.length} deleted record(s) · Restore or permanently delete</Typography>
                            </Box>
                        </Box>
                        <IconButton size="small" onClick={onClose} sx={{ color: PALETTE.GRAY, borderRadius: '8px', '&:hover': { bgcolor: alpha(PALETTE.GRAY, 0.1), color: PALETTE.TEXT } }}>
                            <X size={18} />
                        </IconButton>
                    </Box>

                    {/* Toolbar */}
                    <Box sx={{ px: 2, py: 1.25, borderBottom: `1px solid ${alpha(PALETTE.PURPLE, 0.08)}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, bgcolor: '#fafbfc' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Checkbox size="small" checked={allOnPage} indeterminate={someOnPage} onChange={() => handleToggleAll(pageItems)}
                                sx={{ padding: '4px', color: alpha(PALETTE.PURPLE, 0.4), '&.Mui-checked': { color: PALETTE.PURPLE }, '&.MuiCheckbox-indeterminate': { color: PALETTE.PURPLE } }} />
                            <Box sx={{ position: 'relative', minWidth: 260 }}>
                                <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search deleted items…"
                                    style={{ width: '100%', padding: '7px 36px 7px 34px', borderRadius: '6px', border: `1.5px solid ${alpha(PALETTE.PURPLE, 0.18)}`, fontSize: '0.82rem', outline: 'none', background: 'white', color: PALETTE.TEXT, transition: 'border-color 0.2s, box-shadow 0.2s', boxSizing: 'border-box' }}
                                    onFocus={e => { e.target.style.borderColor = PALETTE.PURPLE; e.target.style.boxShadow = `0 0 0 3px ${alpha(PALETTE.PURPLE, 0.1)}`; }}
                                    onBlur={e => { e.target.style.borderColor = alpha(PALETTE.PURPLE, 0.18); e.target.style.boxShadow = 'none'; }} />
                                <Box sx={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', pointerEvents: 'none' }}>
                                    <History size={15} color={alpha(PALETTE.GRAY, 0.6)} />
                                </Box>
                                {search && (
                                    <IconButton size="small" onClick={() => setSearch('')} sx={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', padding: '2px' }}>
                                        <X size={14} />
                                    </IconButton>
                                )}
                            </Box>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                            <Button variant="outlined" size="small" startIcon={<RotateCcw size={13} />} onClick={() => setRestoreModal({ open: true, item: null, isBulk: true })} disabled={selected.size === 0}
                                sx={{ textTransform: 'none', fontSize: '0.78rem', fontWeight: 500, color: PALETTE.GREEN, borderColor: alpha(PALETTE.GREEN, 0.35), borderRadius: '6px', px: 1.5, '&:hover': { borderColor: PALETTE.GREEN, bgcolor: alpha(PALETTE.GREEN, 0.06) }, '&.Mui-disabled': { opacity: 0.45 } }}>
                                Restore ({selected.size})
                            </Button>
                            <Button variant="outlined" size="small" startIcon={<Trash2 size={13} />} onClick={() => setPermDeleteModal({ open: true, item: null, isBulk: true })} disabled={selected.size === 0}
                                sx={{ textTransform: 'none', fontSize: '0.78rem', fontWeight: 500, color: PALETTE.RED, borderColor: alpha(PALETTE.RED, 0.35), borderRadius: '6px', px: 1.5, '&:hover': { borderColor: PALETTE.RED, bgcolor: alpha(PALETTE.RED, 0.06) }, '&.Mui-disabled': { opacity: 0.45 } }}>
                                Delete ({selected.size})
                            </Button>
                        </Box>
                    </Box>

                    {/* Table Body */}
                    <Box sx={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', scrollbarWidth: 'thin' }}>
                        {isLoading ? (
                            <Box sx={{ py: 8 }}>
                                <DashboardLoader />
                            </Box>
                        ) : items.length === 0 ? (
                            <Box sx={{ textAlign: 'center', py: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                                <History size={48} color={alpha(PALETTE.GRAY, 0.3)} />
                                <Typography variant="body2" sx={{ mt: 2, color: PALETTE.GRAY, fontSize: '0.9rem' }}>
                                    {search ? 'No matching deleted items found' : 'No deleted items in recycle bin'}
                                </Typography>
                            </Box>
                        ) : (
                            <TableContainer sx={{ overflowX: 'auto' }}>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow sx={{ bgcolor: alpha(PALETTE.PURPLE, 0.03), '& th': { borderBottom: `2px solid ${alpha(PALETTE.PURPLE, 0.1)}`, fontWeight: 600, fontSize: '0.78rem', color: PALETTE.TEXT, py: 1.5, px: 1.5, whiteSpace: 'nowrap' } }}>
                                            <TableCell padding="checkbox" width={50} />
                                            <TableCell sx={{ minWidth: 130 }}>Technician</TableCell>
                                            <TableCell sx={{ minWidth: 100 }}>Date</TableCell>
                                            <TableCell sx={{ minWidth: 120 }}>Work Order</TableCell>
                                            <TableCell sx={{ minWidth: 150 }}>Deleted By</TableCell>
                                            <TableCell sx={{ minWidth: 160 }}>Deleted At</TableCell>
                                            <TableCell width={130} sx={{ minWidth: 120 }}>Actions</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {pageItems.map(item => (
                                            <TableRow 
                                                key={item.id} 
                                                hover 
                                                onClick={() => handleToggle(item.id)}
                                                sx={{ cursor: 'pointer', bgcolor: selected.has(item.id) ? alpha(PALETTE.PURPLE, 0.07) : 'white' }}
                                            >
                                                <TableCell padding="checkbox">
                                                    <Checkbox 
                                                        size="small" 
                                                        checked={selected.has(item.id)} 
                                                        onChange={(e) => { e.stopPropagation(); handleToggle(item.id); }} 
                                                        sx={{ padding: '4px', color: alpha(PALETTE.PURPLE, 0.4), '&.Mui-checked': { color: PALETTE.PURPLE } }} 
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Typography variant="body2" sx={{ fontSize: '0.83rem', fontWeight: 600, color: PALETTE.TEXT }}>{item.technician_name}</Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Typography variant="body2" sx={{ fontSize: '0.83rem', color: PALETTE.TEXT }}>{formatDate(item.date)}</Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Typography variant="body2" sx={{ fontSize: '0.83rem', color: PALETTE.GRAY }}>{item.wo_number || '—'}</Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Typography variant="body2" sx={{ fontSize: '0.83rem', color: PALETTE.TEXT }}>{item.deleted_by_name || 'Unknown'}</Typography>
                                                    {item.deleted_by_email && <Typography variant="caption" sx={{ fontSize: '0.72rem', color: PALETTE.GRAY }}>{item.deleted_by_email}</Typography>}
                                                </TableCell>
                                                <TableCell>
                                                    <Typography variant="body2" sx={{ fontSize: '0.83rem', color: PALETTE.TEXT }}>{item.deleted_at ? formatDateTimeWithTZ(item.deleted_at) : '—'}</Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Stack direction="row" spacing={0.25}>
                                                        <Tooltip title="Restore" arrow>
                                                            <IconButton size="small" onClick={(e) => { e.stopPropagation(); setRestoreModal({ open: true, item, isBulk: false }); }} sx={{ color: PALETTE.GREEN, borderRadius: '6px', p: 0.75, '&:hover': { bgcolor: alpha(PALETTE.GREEN, 0.1) } }}>
                                                                <RotateCcw size={15} />
                                                            </IconButton>
                                                        </Tooltip>
                                                        <Tooltip title="Delete Permanently" arrow>
                                                            <IconButton size="small" onClick={(e) => { e.stopPropagation(); setPermDeleteModal({ open: true, item, isBulk: false }); }} sx={{ color: PALETTE.RED, borderRadius: '6px', p: 0.75, '&:hover': { bgcolor: alpha(PALETTE.RED, 0.1) } }}>
                                                                <Trash2 size={15} />
                                                            </IconButton>
                                                        </Tooltip>
                                                    </Stack>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        )}
                    </Box>

                    {/* Pagination */}
                    {items.length > 0 && (
                        <Box sx={{ borderTop: `1px solid ${alpha(PALETTE.PURPLE, 0.08)}`, bgcolor: '#fafbfc' }}>
                            <TablePagination
                                rowsPerPageOptions={[5, 10, 25, 50]} component="div"
                                count={filteredItems.length} rowsPerPage={rowsPerPage} page={page}
                                onPageChange={(_, p) => setPage(p)} onRowsPerPageChange={e => { setRowsPerPage(+e.target.value); setPage(0); }}
                                SelectProps={{ MenuProps: { disableScrollLock: true } }}
                                sx={{ '& .MuiTablePagination-toolbar': { minHeight: '44px' }, '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': { fontSize: '0.78rem', color: PALETTE.GRAY } }}
                            />
                        </Box>
                    )}
                </Box>
            </Modal>

            {/* Restore Dialog */}
            <CommonDialog
                open={restoreModal.open}
                onClose={() => setRestoreModal({ open: false, item: null, isBulk: false })}
                onConfirm={async () => {
                    if (restoreModal.isBulk) {
                        await onBulkRestore(Array.from(selected));
                        setSelected(new Set());
                    } else {
                        await onRestore(restoreModal.item.id);
                    }
                    setRestoreModal({ open: false, item: null, isBulk: false });
                }}
                title="Restore Records"
                isLoading={isRestoring}
                variant="success"
                confirmText="Restore"
                icon={<RotateCcw size={16} />}
            >
                <Typography sx={{ fontSize: '0.85rem', color: PALETTE.TEXT }}>
                    Restore {restoreModal.isBulk ? `${selected.size} records` : 'this record'} back to the active list?
                </Typography>
            </CommonDialog>

            {/* Permanent Delete Dialog */}
            <CommonDialog
                open={permDeleteModal.open}
                onClose={() => setPermDeleteModal({ open: false, item: null, isBulk: false })}
                onConfirm={async () => {
                    if (permDeleteModal.isBulk) {
                        await onBulkDelete(Array.from(selected));
                        setSelected(new Set());
                    } else {
                        await onDeletePermanently(permDeleteModal.item.id);
                    }
                    setPermDeleteModal({ open: false, item: null, isBulk: false });
                }}
                title="Delete Permanently"
                isLoading={isDeleting}
                variant="danger"
                confirmText="Delete Forever"
                icon={<AlertCircle size={16} />}
            >
                <Typography sx={{ fontSize: '0.85rem', color: PALETTE.TEXT }}>
                    Are you sure you want to permanently delete {permDeleteModal.isBulk ? `${selected.size} records` : 'this record'}? 
                    This action <strong style={{ color: PALETTE.RED }}>cannot</strong> be undone.
                </Typography>
            </CommonDialog>
        </>
    );
});
RecycleBinModal.displayName = 'RecycleBinModal';

// ─── Pagination Component (matching CustomerCenter) ────────────────────────
const Pagination = memo(({ color, count, rowsPerPage, page, onPageChange, onRowsPerPageChange }) => {
    if (!count) return null;
    return (
        <TablePagination
            rowsPerPageOptions={[5, 10, 25]} component="div"
            count={count} rowsPerPage={rowsPerPage} page={page}
            onPageChange={onPageChange} onRowsPerPageChange={onRowsPerPageChange}
            SelectProps={{ MenuProps: { disableScrollLock: true } }}
            sx={{ borderTop: `1px solid ${alpha(color, 0.1)}`, '& .MuiTablePagination-toolbar': { minHeight: '44px', padding: '0 16px' }, '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': { fontSize: '0.8rem', color: PALETTE.TEXT } }}
        />
    );
});
Pagination.displayName = 'Pagination';

// ─── Main Component ────────────────────────────────────────────────────────
const TimeTracking = () => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const queryClient = useQueryClient();
    const { showSnackbar } = useGlobalSnackbar();
    
    const [expandedRow, setExpandedRow] = useState(null);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [isRecycleBinOpen, setIsRecycleBinOpen] = useState(false);
    const [selected, setSelected] = useState(new Set());
    const [search, setSearch] = useState('');
    const [softDeleteModal, setSoftDeleteModal] = useState({ open: false, id: null, isBulk: false });
    const [isSoftDeleting, setIsSoftDeleting] = useState(false);
    const [isRestoring, setIsRestoring] = useState(false);
    const [isPermanentlyDeleting, setIsPermanentlyDeleting] = useState(false);

    const { data: scraperStatus } = useQuery({
        queryKey: ['scraper-status'],
        queryFn: () => rmeApi.getScraperStatus(),
        refetchInterval: 5000,
    });
    
    const parseDuration = (durStr) => {
        if (!durStr) return 0;
        const hrsMatch = durStr.match(/(\d+)\s*hrs/);
        const minsMatch = durStr.match(/(\d+)\s*$/) || durStr.match(/(\d+)\s*min/);
        
        let total = 0;
        if (hrsMatch) total += parseInt(hrsMatch[1]) * 60;
        if (minsMatch) total += parseInt(minsMatch[1]);
        return total || parseInt(durStr) || 0;
    };

    const { data: timeEntries = [], isLoading, refetch } = useQuery({
        queryKey: ['time-tracking'],
        queryFn: async () => {
            const response = await timeTrackingApi.getTimeTracking({ is_deleted: false });
            const rawData = response.data.results || response.data;
            
            const mappedData = rawData.map(entry => {
                const feData = entry.fieldedge_data || [];
                const fmData = entry.fleetmatics_data || [];
                
                const workingEntries = feData.filter(e => e.status === 'Working');
                const markedMin = workingEntries.reduce((acc, curr) => acc + parseDuration(curr.duration), 0);
                
                const travelingEntries = feData.filter(e => e.status === 'Traveling');
                const markedTravelMin = travelingEntries.reduce((acc, curr) => acc + parseDuration(curr.duration), 0);
                
                const fmStops = fmData.filter(a => !a.category?.toLowerCase().includes('idle') && !a.category?.toLowerCase().includes('moving'));
                const fmMoving = fmData.filter(a => a.category?.toLowerCase().includes('moving'));
                
                const actualMin = fmStops.reduce((acc, curr) => acc + (curr.duration || 0), 0);
                const actualTravelMin = fmMoving.reduce((acc, curr) => acc + (curr.duration || 0), 0);
                
                const proficiency = (markedMin > 0 && actualMin > 0) 
                    ? Math.round((Math.min(markedMin, actualMin) / Math.max(markedMin, actualMin)) * 100) 
                    : 0;

                const travelProficiency = (markedTravelMin > 0 && actualTravelMin > 0)
                    ? Math.round((Math.min(markedTravelMin, actualTravelMin) / Math.max(markedTravelMin, actualTravelMin)) * 100)
                    : 0;

                const firstWorking = workingEntries[0] || {};
                const lastWorking = workingEntries[workingEntries.length - 1] || firstWorking;
                
                const firstTravel = travelingEntries[0] || {};
                const lastTravel = travelingEntries[travelingEntries.length - 1] || firstTravel;

                const firstFmStop = fmStops[0] || {};
                const lastFmStop = fmStops[fmStops.length - 1] || firstFmStop;
                const firstFmTravel = fmMoving[0] || {};
                const lastFmTravel = fmMoving[fmMoving.length - 1] || firstFmTravel;

                return {
                    id: entry.id,
                    employeeName: entry.technician_name || 'Unknown',
                    date: entry.date,
                    is_deleted: entry.is_deleted,
                    travel: {
                        marked: { 
                            start: firstTravel.startTime || 'N/A', 
                            end: lastTravel.endTime || 'N/A', 
                            minutes: markedTravelMin 
                        },
                        actual: { 
                            start: firstFmTravel.arrival_time || 'N/A', 
                            end: lastFmTravel.departure_time || 'N/A', 
                            minutes: actualTravelMin 
                        },
                        proficiency: travelProficiency,
                    },
                    workingTime: {
                        marked: { 
                            start: firstWorking.startTime || 'N/A', 
                            end: lastWorking.endTime || 'N/A', 
                            minutes: markedMin 
                        },
                        actual: { 
                            start: firstFmStop.arrival_time || 'N/A', 
                            end: lastFmStop.departure_time || 'N/A', 
                            minutes: actualMin 
                        },
                        proficiency: proficiency,
                    },
                    billing: {
                        variant: { minutes: entry.billed_time || 0 },
                        actual: { minutes: actualMin },
                        proficiency: proficiency,
                    },
                    workOrder: entry.wo_number,
                    location: entry.full_address,
                    is_seen: entry.is_seen,
                    fieldedgeEntries: feData,
                    fleetmaticsEntries: fmData,
                };
            });
            
            return mappedData.sort((a, b) => new Date(b.date) - new Date(a.date));
        }
    });

    const { data: deletedEntries, isLoading: isDeletedLoading, refetch: refetchDeleted } = useQuery({
        queryKey: ['time-tracking-deleted'],
        queryFn: async () => {
            const response = await timeTrackingApi.getDeletedTimeTracking();
            const raw = response.data.results || response.data;
            return raw.filter(i => i.is_deleted);
        },
        refetchInterval: 30000 // Refresh deleted list every 30s for accurate badge
    });

    const filteredEntries = useMemo(() => {
        if (!search) return timeEntries;
        const q = search.toLowerCase();
        return timeEntries.filter(entry => 
            (entry.employeeName || '').toLowerCase().includes(q) ||
            (entry.workOrder || '').toLowerCase().includes(q)
        );
    }, [timeEntries, search]);

    const isRunning = scraperStatus?.data?.is_running;

    const markAsSeenMutation = useMutation({
        mutationFn: (id) => timeTrackingApi.markAsSeen(id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['time-tracking'] })
    });

    const handleRowToggle = (id) => {
        const entry = timeEntries.find(e => e.id === id);
        if (entry && !entry.is_seen) {
            markAsSeenMutation.mutate(id);
        }
        setExpandedRow(expandedRow === id ? null : id);
    };

    const handleDelete = async (id) => {
        setSoftDeleteModal({ open: true, id, isBulk: false });
    };

    const handleRestore = async (id) => {
        setIsRestoring(true);
        try {
            await timeTrackingApi.restoreTimeTracking(id);
            refetch();
            refetchDeleted();
            showSnackbar('Time record restored successfully', 'success');
        } catch (err) {
            showSnackbar(err.response?.data?.message || 'Failed to restore record', 'error');
        } finally {
            setIsRestoring(false);
        }
    };

    const handleDeletePermanently = async (id) => {
        setIsPermanentlyDeleting(true);
        try {
            await timeTrackingApi.deleteTimeTracking(id);
            refetchDeleted();
            showSnackbar('Time record permanently deleted', 'success');
        } catch (err) {
            showSnackbar(err.response?.data?.message || 'Failed to delete record', 'error');
        } finally {
            setIsPermanentlyDeleting(false);
        }
    };

    const handleBulkRestore = async (ids) => {
        setIsRestoring(true);
        try {
            await timeTrackingApi.bulkRestoreTimeTracking(ids);
            refetch();
            refetchDeleted();
            showSnackbar(`${ids.length} record(s) restored successfully`, 'success');
        } catch (err) {
            showSnackbar(err.response?.data?.message || 'Failed to restore records', 'error');
        } finally {
            setIsRestoring(false);
        }
    };

    const handleBulkDeletePermanently = async (ids) => {
        setIsPermanentlyDeleting(true);
        try {
            await timeTrackingApi.bulkDeleteTimeTracking(ids);
            refetchDeleted();
            showSnackbar(`${ids.length} record(s) permanently deleted`, 'success');
        } catch (err) {
            showSnackbar(err.response?.data?.message || 'Failed to delete records', 'error');
        } finally {
            setIsPermanentlyDeleting(false);
        }
    };

    const toggleSel = useCallback((id) => {
        setSelected(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    }, []);

    const toggleAll = useCallback((pgItems) => {
        const allSelected = pgItems.every(i => selected.has(i.id));
        setSelected(prev => {
            const next = new Set(prev);
            pgItems.forEach(i => allSelected ? next.delete(i.id) : next.add(i.id));
            return next;
        });
    }, [selected]);

    const handleBulkSoftDelete = async () => {
        setSoftDeleteModal({ open: true, id: null, isBulk: true });
    };

    const executeSoftDelete = async () => {
        setIsSoftDeleting(true);
        try {
            if (softDeleteModal.isBulk) {
                await timeTrackingApi.bulkSoftDeleteTimeTracking(Array.from(selected));
                setSelected(new Set());
                showSnackbar(`${selected.size} record(s) moved to recycle bin`, 'success');
            } else {
                await timeTrackingApi.softDeleteTimeTracking(softDeleteModal.id);
                showSnackbar('Record moved to recycle bin', 'success');
            }
            refetch();
            refetchDeleted();
            setSoftDeleteModal({ open: false, id: null, isBulk: false });
        } catch (err) {
            showSnackbar(err.response?.data?.message || 'Failed to move record to recycle bin', 'error');
        } finally {
            setIsSoftDeleting(false);
        }
    };

    // Reset page when search changes
    React.useEffect(() => setPage(0), [search]);

    const paginatedEntries = filteredEntries.slice(page * rowsPerPage, (page + 1) * rowsPerPage);
    const allOnPage = paginatedEntries.length > 0 && paginatedEntries.every(i => selected.has(i.id));
    const someOnPage = paginatedEntries.length > 0 && paginatedEntries.some(i => selected.has(i.id)) && !allOnPage;

    if (isLoading && timeEntries.length === 0) {
        return <DashboardLoader />;
    }

    return (
        <Box>
            <Helmet>
                <title>Time Tracking | Sterling Septic & Plumbing LLC</title>
                <meta name="description" content="Monitor and manage employee time tracking data" />
            </Helmet>

            {/* Page Header - matching CustomerCenter */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
                <Box>
                    <Typography sx={{ fontWeight: 600, mb: 0.5, fontSize: '1rem', color: PALETTE.TEXT, letterSpacing: '-0.01em' }}>
                        Time Tracking
                    </Typography>
                    <Typography variant="body2" sx={{ color: PALETTE.GRAY, fontSize: '0.8rem' }}>
                        Monitor and manage employee time tracking data
                    </Typography>
                </Box>
                <Stack direction="row" spacing={1.5} alignItems="center">
                    {isRunning && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1.5, py: 0.5, bgcolor: alpha(PALETTE.BLUE, 0.08), borderRadius: '20px', border: `1px solid ${alpha(PALETTE.BLUE, 0.2)}` }}>
                            <Box className="animate-pulse" sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: PALETTE.BLUE }} />
                            <Typography sx={{ fontSize: '0.72rem', fontWeight: 600, color: PALETTE.BLUE }}>
                                Scraper Running... ({Math.max(0.1, scraperStatus?.data?.elapsed_minutes || 0)}m)
                            </Typography>
                        </Box>
                    )}
                    <RefreshButton onRefresh={timeTrackingApi.startTimeTrackingCombinedScraping} />
                    <OutlineButton 
                        startIcon={<History size={15} />} 
                        onClick={() => setIsRecycleBinOpen(true)}
                        sx={{ height: '34px', px: 1.75, color: PALETTE.PURPLE, borderColor: alpha(PALETTE.PURPLE, 0.35), borderRadius: '6px', '&:hover': { borderColor: PALETTE.PURPLE, bgcolor: alpha(PALETTE.PURPLE, 0.05) } }}
                    >
                        Recycle Bin ({deletedEntries?.length || 0})
                    </OutlineButton>
                </Stack>
            </Box>

            {/* Time Tracking Section - using Section wrapper matching CustomerCenter */}
            <Section 
                title="Time Entries" 
                color={PALETTE.BLUE} 
                count={timeEntries.length} 
                filteredCount={filteredEntries.length} 
                selectedCount={selected.size}
                onDelete={handleBulkSoftDelete} 
                items={filteredEntries}
                tableSearch={search} 
                onTableSearch={setSearch} 
                tableSearchPlaceholder="Search technicians or work orders..."
            >
                <TableContainer>
                    <Table size="small">
                        <THead 
                            color={PALETTE.BLUE} 
                            allOnPage={allOnPage} 
                            someOnPage={someOnPage} 
                            onToggleAll={() => toggleAll(paginatedEntries)}
                            extraCols={[{ label: 'Actions', width: 100 }]} 
                        />
                        <TableBody>
                            {paginatedEntries.length === 0 ? (
                                <EmptyRow colSpan={8} isFiltered={filteredEntries.length === 0 && search !== ''} />
                            ) : (
                                paginatedEntries.map(entry => (
                                    <TimeEntryRow
                                        key={entry.id}
                                        entry={entry}
                                        expanded={expandedRow === entry.id}
                                        onToggle={() => handleRowToggle(entry.id)}
                                        onDelete={handleDelete}
                                        onRestore={handleRestore}
                                        isSelected={selected.has(entry.id)}
                                        onSelect={() => toggleSel(entry.id)}
                                    />
                                ))
                            )}
                        </TableBody>
                    </Table>
                    <Pagination 
                        color={PALETTE.BLUE} 
                        count={filteredEntries.length} 
                        rowsPerPage={rowsPerPage} 
                        page={page} 
                        onPageChange={(_, p) => setPage(p)} 
                        onRowsPerPageChange={e => { setRowsPerPage(+e.target.value); setPage(0); }} 
                    />
                </TableContainer>
            </Section>

            {/* Recycle Bin Modal */}
            <RecycleBinModal
                open={isRecycleBinOpen}
                onClose={() => setIsRecycleBinOpen(false)}
                items={deletedEntries || []}
                isLoading={isDeletedLoading}
                isRestoring={isRestoring}
                isDeleting={isPermanentlyDeleting}
                onRestore={handleRestore}
                onDeletePermanently={handleDeletePermanently}
                onBulkRestore={handleBulkRestore}
                onBulkDelete={handleBulkDeletePermanently}
            />

            {/* Soft Delete Confirmation Dialog - matching CustomerCenter */}
            <CommonDialog
                open={softDeleteModal.open}
                onClose={() => setSoftDeleteModal({ open: false, id: null, isBulk: false })}
                onConfirm={executeSoftDelete}
                isLoading={isSoftDeleting}
                title="Move to Recycle Bin"
                variant="warning"
                confirmText="Move to Bin"
                icon={<Trash2 size={18} />}
            >
                <Typography variant="body2" sx={{ color: PALETTE.TEXT, fontSize: '0.85rem', lineHeight: 1.6, mb: 2 }}>
                    {softDeleteModal.isBulk ? (
                        <>Are you sure you want to move <Box component="strong" sx={{ color: PALETTE.ORANGE }}>{selected.size} record(s)</Box> to the Recycle Bin?</>
                    ) : (
                        <>Are you sure you want to move this time tracking record to the Recycle Bin?</>
                    )}
                </Typography>
                <Box sx={{ p: 1.5, borderRadius: '8px', bgcolor: alpha(PALETTE.ORANGE, 0.05), border: `1px solid ${alpha(PALETTE.ORANGE, 0.12)}`, display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                    <AlertCircle size={15} color={PALETTE.ORANGE} style={{ flexShrink: 0, marginTop: 1 }} />
                    <Typography variant="caption" sx={{ color: PALETTE.ORANGE, fontSize: '0.78rem', fontWeight: 500 }}>
                        Items moved to Recycle Bin can be restored later.
                    </Typography>
                </Box>
            </CommonDialog>
        </Box>
    );
};

export default TimeTracking;