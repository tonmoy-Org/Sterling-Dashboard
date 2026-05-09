import React, { useState, useMemo, useCallback } from 'react';
import OutlineButton from '../../../../components/ui/OutlineButton';
import { format } from 'date-fns';
import {
    Box, Typography, Paper, Grid, MenuItem, Select, FormControl,
    InputLabel, TextField, Chip, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, Collapse, IconButton,
    Divider, Tooltip, Badge, Alert, Checkbox,
    TablePagination, Button, Modal, Stack, useMediaQuery, useTheme
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { Helmet } from 'react-helmet-async';
import {
    FileText, ChevronDown, ChevronUp, TrendingUp, TrendingDown,
    AlertTriangle, CheckCircle, XCircle, Calendar, Clock, DollarSign,
    Users, BarChart2, Zap, RefreshCw, Trash2, History, RotateCcw,
    Search, Check, MoreHorizontal, AlertCircle, Eye, MousePointer2, X
} from 'lucide-react';
import { rmeApi } from '../../../../api/services/rmeApi';
import RefreshButton from '../../../../components/ui/RefreshButton';
import CommonDialog from '../../../../components/ui/CommonDialog';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useGlobalSnackbar } from '../../../../context/GlobalSnackbarContext';
import { useAuth } from '../../../../auth/AuthProvider';
import DashboardLoader from '../../../../components/Loader/DashboardLoader';
import PriorityBadge from '../../../../components/ui/PriorityBadge';
import { priorityConfig } from '../../../../utils/priorityStyles';
// ─── PALETTE ─────────────────────────────────────────────────────────────────
const P = {
    BG: '#F7F8FA',
    SURFACE: '#FFFFFF',
    BORDER: '#E4E7EC',
    TEXT: '#0F1115',
    MUTED: '#6b7280',
    BLUE: '#1976d2',
    BLUE_SOFT: '#EFF8FF',
    BLUE_BORDER: '#B2DDFF',
    GREEN: '#10b981',
    GREEN_SOFT: '#ECFDF3',
    GREEN_BORDER: '#ABEFC6',
    RED: '#ef4444',
    RED_SOFT: '#FEF3F2',
    RED_BORDER: '#FECDCA',
    ORANGE: '#ed6c02',
    ORANGE_SOFT: '#FFFAEB',
    ORANGE_BORDER: '#FEF0C7',
    PURPLE: '#8b5cf6',
    PURPLE_SOFT: '#F9F5FF',
    PURPLE_BORDER: '#E9D7FE',
    AMBER: '#f59e0b',
    TEAL: '#0891b2',
};

// --- Removed local priorityConfig and helpers (now using shared PriorityBadge) ---

// ─── SHARED SCROLLBAR STYLES ──────────────────────────────────────────────────
const thinScrollbar = (thumbColor = P.MUTED) => ({
    '&::-webkit-scrollbar': { width: '4px', height: '4px' },
    '&::-webkit-scrollbar-track': { background: 'transparent' },
    '&::-webkit-scrollbar-thumb': {
        background: alpha(thumbColor, 0.3),
        borderRadius: '4px',
    },
    '&::-webkit-scrollbar-thumb:hover': {
        background: alpha(thumbColor, 0.5),
    },
    scrollbarWidth: 'thin',
    scrollbarColor: `${alpha(thumbColor, 0.3)} transparent`,
});

// ─── DATE HELPERS ─────────────────────────────────────────────────────────────
const today = new Date();
const toDateStr = (d) => d.toISOString().split('T')[0];

const formatDate = (dateString) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    return isNaN(date) ? '—' : format(date, 'MM/dd/yy');
};

const formatDateTimeWithTZ = (dateString) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    return isNaN(date) ? '—' : format(date, 'MM/dd/yy hh:mm a');
};

const quickRanges = {
    'Last Week': () => {
        const d = new Date(today);
        d.setDate(d.getDate() - 7);
        return { from: toDateStr(d), to: toDateStr(today) };
    },
    'Last Month': () => {
        const d = new Date(today);
        d.setMonth(d.getMonth() - 1);
        return { from: toDateStr(d), to: toDateStr(today) };
    },
    'Last Quarter': () => {
        const d = new Date(today);
        d.setMonth(d.getMonth() - 3);
        return { from: toDateStr(d), to: toDateStr(today) };
    },
    'Last Year': () => {
        const d = new Date(today);
        d.setFullYear(d.getFullYear() - 1);
        return { from: toDateStr(d), to: toDateStr(today) };
    },
    'All Time': () => ({ from: '', to: '' }),
};

const getExcavationStatus = (wo) => {
    const priority = wo.priority?.toUpperCase() || '';
    const task = wo.task?.toUpperCase() || '';
    if (!priority.includes('[3]') || !task.includes('DRAIN') || !task.includes('FIELD')) return null;

    const hasPassItem = wo.lineItems?.some(item => {
        const num = item.itemNumber?.toUpperCase() || '';
        return num.includes('6SP1DRA') && (num.includes('4HR') || num.includes('𝟒𝐇𝐑'));
    });
    return hasPassItem ? 'PASS' : 'FAIL';
};

// Proficiency color
const profColor = (val) => {
    if (val === null || val === undefined) return P.MUTED;
    if (val >= 1.5) return P.GREEN;
    if (val >= 0.9) return P.BLUE;
    return P.RED;
};

const profBg = (val) => {
    if (val === null || val === undefined) return '#F2F4F7';
    if (val >= 1.5) return P.GREEN_SOFT;
    if (val >= 0.9) return P.BLUE_SOFT;
    return P.RED_SOFT;
};

const profLabel = (val) => {
    if (val === null || val === undefined) return '—';
    return `${(val * 100).toFixed(0)}%`;
};

// ─── TABLE SEARCH BAR ───────────────────────────────────────────────────────
const TableSearchBar = ({ value, onChange, color, placeholder = 'Search…' }) => (
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
                outline: 'none', background: 'white', color: P.TEXT,
                boxSizing: 'border-box', transition: 'border-color 0.15s, box-shadow 0.15s',
            }}
            onFocus={e => { e.target.style.borderColor = color; e.target.style.boxShadow = `0 0 0 3px ${alpha(color, 0.1)}`; }}
            onBlur={e => { e.target.style.borderColor = alpha(color, 0.2); e.target.style.boxShadow = 'none'; }}
        />
        {value && (
            <IconButton size="small" onClick={() => onChange('')} sx={{ position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)', padding: '2px', color: P.MUTED, '&:hover': { color } }}>
                <X size={12} />
            </IconButton>
        )}
    </Box>
);

// ─── STAT CARD ──────────────────────────────────────────────────────────────
const StatCard = ({ icon: Icon, label, value, sub, accent = P.BLUE, accentBg = P.BLUE_SOFT }) => (
    <Paper elevation={0} sx={{ p: { xs: 2, sm: 2.5 }, border: `1px solid ${P.BORDER}`, borderRadius: '10px', bgcolor: P.SURFACE, height: '100%' }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1.5 }}>
            <Box sx={{ p: 1, borderRadius: '8px', bgcolor: accentBg }}>
                <Icon size={18} color={accent} />
            </Box>
        </Box>
        <Typography sx={{ fontSize: '1.6rem', fontWeight: 700, color: P.TEXT, lineHeight: 1, mb: 0.5 }}>
            {value}
        </Typography>
        <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: P.MUTED, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {label}
        </Typography>
        {sub && <Typography sx={{ fontSize: '0.68rem', color: P.MUTED, mt: 0.5 }}>{sub}</Typography>}
    </Paper>
);

// ─── PROFICIENCY BADGE ─────────────────────────────────────────────────────────
const ProfBadge = ({ value }) => (
    <Chip
        label={profLabel(value)}
        size="small"
        sx={{
            fontSize: '0.7rem', fontWeight: 600, height: 22,
            bgcolor: profBg(value),
            color: profColor(value),
            border: `1px solid ${alpha(profColor(value), 0.2)}`,
            '& .MuiChip-label': { px: 1, py: 0 }
        }}
    />
);

// ─── SECTION DIVIDER ────────────────────────────────────────────────────────
const SectionLabel = ({ children, color = P.BLUE }) => (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
        <Box sx={{ width: 3, height: 14, borderRadius: 2, bgcolor: color }} />
        <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: P.MUTED }}>
            {children}
        </Typography>
    </Box>
);

// ─── CATEGORY TABLE ───────────────────────────────────────────────────────────
const CategoryTable = ({ title, rows, color = P.BLUE }) => {
    const [page, setPage] = useState(0);
    const rowsPerPage = 5;

    const paginatedRows = rows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

    return (
        <Box>
            <SectionLabel color={color}>{title}</SectionLabel>
            <TableContainer sx={{ overflowX: 'auto', ...thinScrollbar(color) }}>
                <Table size="small" stickyHeader>
                    <TableHead>
                        <TableRow sx={{ bgcolor: alpha(color, 0.04), '& th': { borderBottom: `2px solid ${alpha(color, 0.1)}`, fontWeight: 600, fontSize: '0.75rem', color: P.TEXT, py: 1.5, whiteSpace: 'nowrap' } }}>
                            {['Priority', 'Task', 'Count', 'Avg Prof', 'Avg $'].map(h => (
                                <TableCell key={h} sx={{ fontSize: '0.75rem', fontWeight: 600 }}>{h}</TableCell>
                            ))}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {paginatedRows.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} sx={{ textAlign: 'center', py: 4 }}>
                                    <Typography sx={{ fontSize: '0.78rem', color: P.MUTED }}>No data available</Typography>
                                </TableCell>
                            </TableRow>
                        ) : (
                            paginatedRows.map((row, i) => (
                                <TableRow key={i} hover sx={{ '&:last-child td': { borderBottom: 'none' } }}>
                                    <TableCell sx={{ fontSize: '0.75rem', py: 0.75 }}>
                                        <PriorityBadge priority={row.priority} />
                                    </TableCell>
                                    <TableCell sx={{ fontSize: '0.75rem', color: P.TEXT, py: 0.75 }}>{row.task}</TableCell>
                                    <TableCell sx={{ fontSize: '0.75rem', fontWeight: 600, color: P.TEXT, py: 0.75 }}>{row.invCount ?? 0}</TableCell>
                                    <TableCell sx={{ py: 0.75 }}><ProfBadge value={row.avgProficiency} /></TableCell>
                                    <TableCell sx={{ fontSize: '0.75rem', fontWeight: 600, color: P.TEXT, py: 0.75 }}>
                                        {row.avgDollar !== undefined && row.avgDollar !== null ? `$${Number(row.avgDollar).toFixed(0)}` : '—'}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
            {rows.length > rowsPerPage && (
                <TablePagination
                    component="div"
                    count={rows.length}
                    page={page}
                    rowsPerPage={rowsPerPage}
                    onPageChange={(e, newPage) => setPage(newPage)}
                    rowsPerPageOptions={[]}
                    SelectProps={{ MenuProps: { disableScrollLock: true } }}
                    sx={{
                        borderTop: `1px solid ${alpha(color, 0.08)}`,
                        '& .MuiTablePagination-toolbar': { minHeight: '36px', px: 1 },
                        '& .MuiTablePagination-displayedRows': { fontSize: '0.7rem', color: P.MUTED },
                        '& .MuiTablePagination-actions': { ml: 0.5 }
                    }}
                />
            )}
        </Box>
    );
};

// ─── DRAIN FIELD CARD ─────────────────────────────────────────────────────────
const DrainFieldCard = ({ pass, fail }) => {
    const total = (pass || 0) + (fail || 0);
    const passRate = total > 0 ? ((pass / total) * 100).toFixed(0) : '—';
    const failRate = total > 0 ? ((fail / total) * 100).toFixed(0) : '—';
    return (
        <Paper elevation={0} sx={{ p: 2.5, border: `1px solid ${P.BORDER}`, borderRadius: '10px', bgcolor: P.SURFACE, height: '100%', display: 'flex', flexDirection: 'column' }}>
            <SectionLabel color={P.PURPLE}>Drain Field Report</SectionLabel>
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <Box sx={{ display: 'flex', gap: 2, mb: 1 }}>
                    <Box sx={{ flex: 1, p: 2, borderRadius: '8px', bgcolor: P.GREEN_SOFT, border: `1px solid ${P.GREEN_BORDER}`, textAlign: 'center' }}>
                        <CheckCircle size={18} color={P.GREEN} style={{ marginBottom: '8px' }} />
                        <Typography sx={{ fontSize: '1.4rem', fontWeight: 800, color: P.GREEN, lineHeight: 1 }}>{passRate}{total > 0 ? '%' : ''}</Typography>
                        <Typography sx={{ fontSize: '0.7rem', color: P.MUTED, fontWeight: 700, mt: 0.5, letterSpacing: '0.05em' }}>PASS ({pass ?? 0})</Typography>
                    </Box>
                    <Box sx={{ flex: 1, p: 2, borderRadius: '8px', bgcolor: P.RED_SOFT, border: `1px solid ${P.RED_BORDER}`, textAlign: 'center' }}>
                        <XCircle size={18} color={P.RED} style={{ marginBottom: '8px' }} />
                        <Typography sx={{ fontSize: '1.4rem', fontWeight: 800, color: P.RED, lineHeight: 1 }}>{failRate}{total > 0 ? '%' : ''}</Typography>
                        <Typography sx={{ fontSize: '0.7rem', color: P.MUTED, fontWeight: 700, mt: 0.5, letterSpacing: '0.05em' }}>FAIL ({fail ?? 0})</Typography>
                    </Box>
                </Box>
                <Typography sx={{ fontSize: '0.65rem', color: P.MUTED, textAlign: 'center', mt: 1 }}>
                    Based on task "4 - DRAIN FIELD" and priority "[3] EXCAVATOR (EXCAVATION)"
                </Typography>
            </Box>
        </Paper>
    );
};

// ─── ERROR REPORT PANEL ───────────────────────────────────────────────────────
const ErrorReportPanel = ({ errors }) => {
    if (!errors?.length) return null;
    return (
        <Paper elevation={0} sx={{ p: 1.5, border: `1px solid ${P.RED_BORDER}`, borderRadius: '10px', bgcolor: P.RED_SOFT, mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <AlertTriangle size={14} color={P.RED} />
                <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: P.RED }}>
                    {errors.length} Mismatch{errors.length > 1 ? 'es' : ''} Detected
                </Typography>
            </Box>
            {errors.slice(0, 3).map((e, i) => (
                <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.25 }}>
                    <Box sx={{ width: 3, height: 3, borderRadius: '50%', bgcolor: P.RED }} />
                    <Typography sx={{ fontSize: '0.75rem', color: P.TEXT }}>
                        {e.workOrderNumber} — {e.dateDiff} days apart
                    </Typography>
                </Box>
            ))}
            {errors.length > 3 && (
                <Typography sx={{ fontSize: '0.75rem', color: P.MUTED, mt: 0.5 }}>+{errors.length - 3} more</Typography>
            )}
        </Paper>
    );
};

// ─── WORK ORDER ROW (WITH TASK IN EXPANDABLE VIEW ONLY) ────────────────────────
const WorkOrderRow = ({ wo, isSelected, onToggle, onDelete, showTech }) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const [open, setOpen] = useState(false);
    const hasError = wo.dateError;

    if (isMobile) {
        return (
            <>
                <Paper
                    elevation={0}
                    sx={{
                        mb: 1.5,
                        p: 1.5,
                        borderRadius: '10px',
                        border: `1px solid ${P.BORDER}`,
                        bgcolor: isSelected ? alpha(P.BLUE, 0.07) : (hasError ? alpha(P.RED, 0.05) : P.SURFACE),
                    }}
                >
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
                            <Checkbox size="small" checked={isSelected} onChange={onToggle} sx={{ p: 0, color: P.MUTED }} />
                            <Typography sx={{ fontSize: '0.83rem', fontWeight: 600, color: P.BLUE }}>
                                {wo.workOrderNumber}
                            </Typography>
                            {hasError && <AlertTriangle size={12} color={P.RED} />}
                        </Box>
                        <IconButton size="small" onClick={() => setOpen(!open)} sx={{ p: 0.5 }}>
                            {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </IconButton>
                    </Box>

                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, mb: 1 }}>
                        <Box>
                            <Typography sx={{ fontSize: '0.62rem', color: P.MUTED, textTransform: 'uppercase', fontWeight: 600 }}>Customer</Typography>
                            <Typography sx={{ fontSize: '0.78rem', fontWeight: 500, color: P.TEXT, wordBreak: 'break-word' }}>{wo.customerName}</Typography>
                        </Box>
                        {showTech && (
                            <Box>
                                <Typography sx={{ fontSize: '0.62rem', color: P.MUTED, textTransform: 'uppercase', fontWeight: 600 }}>Technician</Typography>
                                <Typography sx={{ fontSize: '0.78rem', fontWeight: 500, color: P.TEXT }}>{wo.technician}</Typography>
                            </Box>
                        )}
                        <Box>
                            <Typography sx={{ fontSize: '0.62rem', color: P.MUTED, textTransform: 'uppercase', fontWeight: 600 }}>Priority</Typography>
                            <PriorityBadge priority={wo.priority} />
                        </Box>
                        <Box>
                            <Typography sx={{ fontSize: '0.62rem', color: P.MUTED, textTransform: 'uppercase', fontWeight: 600 }}>Date</Typography>
                            <Typography sx={{ fontSize: '0.78rem', color: P.TEXT }}>{formatDate(wo.completedDate)}</Typography>
                        </Box>
                        <Box>
                            <Typography sx={{ fontSize: '0.62rem', color: P.MUTED, textTransform: 'uppercase', fontWeight: 600 }}>Worked / Worth</Typography>
                            <Typography sx={{ fontSize: '0.78rem', fontWeight: 600, color: P.TEXT }}>
                                {wo.hoursWorked ? `${Math.round(wo.hoursWorked * 60)}min` : '—'} / {wo.worthHours ? `${Math.round(wo.worthHours * 60)}min` : '—'}
                            </Typography>
                        </Box>
                        <Box>
                            <Typography sx={{ fontSize: '0.62rem', color: P.MUTED, textTransform: 'uppercase', fontWeight: 600 }}>Invoice</Typography>
                            <Typography sx={{ fontSize: '0.78rem', fontWeight: 600, color: P.GREEN }}>
                                {wo.invoiceTotal !== undefined ? `$${wo.invoiceTotal.toFixed(2)}` : '—'}
                            </Typography>
                        </Box>
                        <Box>
                            <Typography sx={{ fontSize: '0.62rem', color: P.MUTED, textTransform: 'uppercase', fontWeight: 600 }}>Proficiency</Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <ProfBadge value={wo.proficiency} />
                                {getExcavationStatus(wo) && (
                                    <Chip
                                        label={getExcavationStatus(wo)}
                                        size="small"
                                        sx={{
                                            height: 22, fontSize: '0.65rem', fontWeight: 800,
                                            bgcolor: getExcavationStatus(wo) === 'PASS' ? P.GREEN_SOFT : P.RED_SOFT,
                                            color: getExcavationStatus(wo) === 'PASS' ? P.GREEN : P.RED,
                                            border: `1px solid ${alpha(getExcavationStatus(wo) === 'PASS' ? P.GREEN : P.RED, 0.2)}`
                                        }}
                                    />
                                )}
                            </Box>
                        </Box>
                    </Box>

                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 0.5 }}>
                        <IconButton size="small" onClick={(e) => { e.stopPropagation(); onDelete(wo.id); }} sx={{ color: P.RED, opacity: 0.7 }}>
                            <Trash2 size={14} />
                        </IconButton>
                    </Box>

                    <Collapse in={open} timeout="auto" unmountOnExit>
                        <Box sx={{ mt: 1.5, pt: 1.5, borderTop: `1px solid ${P.BORDER}` }}>
                            {hasError && (
                                <Alert severity="error" sx={{ mb: 1.5, fontSize: '0.72rem', py: 0.5, borderRadius: '6px' }}>
                                    Date mismatch: {formatDate(wo.completedDate)} vs {formatDate(wo.invoiceDate)} ({wo.dateDiff} days apart)
                                </Alert>
                            )}
                            <Typography sx={{ fontSize: '0.68rem', fontWeight: 600, color: P.MUTED, mb: 1 }}>Task</Typography>
                            <Typography sx={{ fontSize: '0.75rem', color: P.TEXT, mb: 1.5 }}>{wo.task}</Typography>

                            <Typography sx={{ fontSize: '0.68rem', fontWeight: 600, color: P.AMBER, mb: 1 }}>Work Order Summary</Typography>
                            <Typography sx={{ fontSize: '0.75rem', color: P.TEXT, mb: 1.5, whiteSpace: 'pre-wrap' }}>
                                {wo.summary || 'No summary provided.'}
                            </Typography>

                            <Typography sx={{ fontSize: '0.68rem', fontWeight: 600, color: P.MUTED, mb: 1 }}>Line Items</Typography>
                            {wo.lineItems?.length > 0 ? (
                                <Box sx={{ maxHeight: 200, overflow: 'auto', ...thinScrollbar() }}>
                                    {wo.lineItems.map((item, i) => (
                                        <Box key={i} sx={{ py: 1, borderBottom: `1px solid ${alpha(P.BORDER, 0.5)}` }}>
                                            <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, fontFamily: 'monospace', color: P.BLUE }}>{item.itemNumber}</Typography>
                                            <Box sx={{ display: 'flex', gap: 2 }}>
                                                <Typography sx={{ fontSize: '0.68rem', color: P.MUTED }}>Qty: {item.qty}</Typography>
                                                <Typography sx={{ fontSize: '0.68rem', color: P.MUTED }}>
                                                    Rate: {typeof item.rate === 'number' ? `$${item.rate.toFixed(2)}` : item.rate}
                                                </Typography>
                                                <Typography sx={{ fontSize: '0.68rem', color: P.MUTED }}>Worth: {item.worth ? `${Math.round(item.worth * 60)}min` : '—'}</Typography>
                                            </Box>
                                        </Box>
                                    ))}
                                </Box>
                            ) : (
                                <Typography sx={{ fontSize: '0.72rem', color: P.MUTED, fontStyle: 'italic' }}>No line items</Typography>
                            )}
                        </Box>
                    </Collapse>
                </Paper>
            </>
        );
    }

    // Desktop view - Task removed from columns, only in expanded section
    return (
        <>
            <TableRow
                hover
                onClick={() => setOpen(!open)}
                sx={{
                    cursor: 'pointer',
                    bgcolor: isSelected ? alpha(P.BLUE, 0.07) : (hasError ? alpha(P.RED, 0.05) : 'white'),
                    '&:hover': { bgcolor: isSelected ? alpha(P.BLUE, 0.1) : (hasError ? alpha(P.RED, 0.08) : alpha(P.BLUE, 0.03)) },
                    '&:last-child td': { borderBottom: 'none' },
                    height: 52,
                }}
            >
                <TableCell padding="checkbox" sx={{ pl: 2, py: 0.5, width: 40 }} onClick={(e) => e.stopPropagation()}>
                    <Checkbox size="small" checked={isSelected} onChange={onToggle} sx={{ color: P.TEXT, padding: '4px' }} />
                </TableCell>
                <TableCell sx={{ py: 0.5, width: 36, pl: 0 }}>
                    <IconButton size="small" sx={{ p: 0.5 }}>
                        {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    </IconButton>
                </TableCell>
                <TableCell sx={{ py: 0.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                        <Typography sx={{ fontSize: '0.82rem', fontWeight: 600, color: P.BLUE }}>
                            {wo.workOrderNumber}
                        </Typography>
                        {hasError && (
                            <Tooltip title={`Date mismatch: WO completed ${formatDate(wo.completedDate)}, Invoice dated ${formatDate(wo.invoiceDate)} (>${wo.dateDiff}d apart)`}>
                                <AlertTriangle size={10} color={P.RED} />
                            </Tooltip>
                        )}
                    </Box>
                    <Typography sx={{ fontSize: '0.7rem', color: P.MUTED, lineHeight: 1.2 }}>{wo.customerName}</Typography>
                </TableCell>
                {showTech && (
                    <TableCell sx={{ py: 0.5 }}>
                        <Typography sx={{ fontSize: '0.82rem', fontWeight: 500, color: P.TEXT }}>{wo.technician}</Typography>
                    </TableCell>
                )}
                <TableCell sx={{ py: 0.5 }}>
                    <PriorityBadge priority={wo.priority} />
                </TableCell>
                <TableCell sx={{ py: 0.5 }}>
                    <Typography sx={{ fontSize: '0.78rem', color: P.MUTED }}>{formatDate(wo.completedDate)}</Typography>
                </TableCell>
                <TableCell sx={{ py: 0.5 }}>
                    <Typography sx={{ fontSize: '0.82rem', fontWeight: 600, color: P.TEXT }}>{wo.hoursWorked ? `${Math.round(wo.hoursWorked * 60)}min` : '—'}</Typography>
                </TableCell>
                <TableCell sx={{ py: 0.5 }}>
                    <Typography sx={{ fontSize: '0.82rem', fontWeight: 600, color: P.TEXT }}>{wo.worthHours ? `${Math.round(wo.worthHours * 60)}min` : '—'}</Typography>
                </TableCell>
                <TableCell sx={{ py: 0.5 }}>
                    <Typography sx={{ fontSize: '0.82rem', fontWeight: 600, color: P.GREEN }}>
                        {wo.invoiceTotal !== undefined ? `$${wo.invoiceTotal.toFixed(2)}` : '—'}
                    </Typography>
                </TableCell>
                <TableCell sx={{ py: 0.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <ProfBadge value={wo.proficiency} />
                        {getExcavationStatus(wo) && (
                            <Tooltip title={`Excavation Status: ${getExcavationStatus(wo)}`}>
                                <Chip
                                    label={getExcavationStatus(wo)}
                                    size="small"
                                    sx={{
                                        height: 22, fontSize: '0.65rem', fontWeight: 800,
                                        bgcolor: getExcavationStatus(wo) === 'PASS' ? P.GREEN_SOFT : P.RED_SOFT,
                                        color: getExcavationStatus(wo) === 'PASS' ? P.GREEN : P.RED,
                                        border: `1px solid ${alpha(getExcavationStatus(wo) === 'PASS' ? P.GREEN : P.RED, 0.2)}`
                                    }}
                                />
                            </Tooltip>
                        )}
                    </Box>
                </TableCell>
                <TableCell sx={{ py: 0.5, textAlign: 'right', pr: 2 }}>
                    <Tooltip title="Move to Recycle Bin">
                        <IconButton
                            size="small"
                            onClick={(e) => { e.stopPropagation(); onDelete(wo.id); }}
                            sx={{ color: P.RED, opacity: 0.6, '&:hover': { opacity: 1, bgcolor: alpha(P.RED, 0.08) } }}
                        >
                            <Trash2 size={15} />
                        </IconButton>
                    </Tooltip>
                </TableCell>
            </TableRow>

            {/* Expanded detail row - Task appears here */}
            <TableRow>
                <TableCell colSpan={showTech ? 11 : 10} sx={{ py: 0, border: 0, bgcolor: '#FAFAFB' }}>
                    <Collapse in={open} timeout="auto" unmountOnExit>
                        <Box sx={{ p: 1.5, borderBottom: `1px solid ${P.BORDER}` }}>
                            {hasError && (
                                <Alert severity="error" sx={{ mb: 1.5, fontSize: '0.72rem', py: 0.5, borderRadius: '6px' }}>
                                    Date mismatch: Work order completed on {formatDate(wo.completedDate)} but invoice dated {formatDate(wo.invoiceDate)} ({wo.dateDiff} days apart — exceeds 5-day threshold).
                                </Alert>
                            )}
                            <Grid container spacing={3}>
                                <Grid size={{ xs: 12, md: 7 }}>
                                    <SectionLabel>Work Order Details</SectionLabel>
                                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2.5 }}>
                                        {[
                                            ['Work Order #', wo.workOrderNumber],
                                            ['Customer', wo.customerName],
                                            ['Task', wo.task],
                                            ['Completed', formatDate(wo.completedDate)],
                                            ['Invoice Date', formatDate(wo.invoiceDate)],
                                            ['Worked Time', wo.hoursWorked ? `${Math.round(wo.hoursWorked * 60)}min` : '—'],
                                            ['Worth Time', wo.worthHours ? `${Math.round(wo.worthHours * 60)}min` : '—'],
                                        ].map(([k, v]) => (
                                            <Box key={k}>
                                                <Typography sx={{ fontSize: '0.68rem', color: P.MUTED, textTransform: 'uppercase', mb: 0.5, fontWeight: 600, letterSpacing: '0.02em' }}>{k}</Typography>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                    <Typography sx={{ fontSize: '0.82rem', fontWeight: 500, color: P.TEXT }}>{v || '—'}</Typography>
                                                    {k === 'Task' && getExcavationStatus(wo) && (
                                                        <Chip
                                                            label={getExcavationStatus(wo)}
                                                            size="small"
                                                            sx={{
                                                                height: 20, fontSize: '0.65rem', fontWeight: 800,
                                                                bgcolor: getExcavationStatus(wo) === 'PASS' ? P.GREEN_SOFT : P.RED_SOFT,
                                                                color: getExcavationStatus(wo) === 'PASS' ? P.GREEN : P.RED,
                                                                border: `1px solid ${alpha(getExcavationStatus(wo) === 'PASS' ? P.GREEN : P.RED, 0.2)}`
                                                            }}
                                                        />
                                                    )}
                                                </Box>
                                            </Box>
                                        ))}
                                    </Box>
                                </Grid>

                                <Grid size={{ xs: 12, md: 5 }}>
                                    <SectionLabel color={P.AMBER}>Work Order Summary</SectionLabel>
                                    <Paper elevation={0} sx={{
                                        p: 2,
                                        bgcolor: alpha(P.AMBER, 0.03),
                                        border: `1px dashed ${alpha(P.AMBER, 0.3)}`,
                                        borderRadius: '8px',
                                        height: 'calc(100% - 30px)',
                                        minHeight: '120px',
                                        overflow: 'auto',
                                        ...thinScrollbar(P.AMBER)
                                    }}>
                                        {wo.summary ? (
                                            <Typography sx={{ fontSize: '0.82rem', color: P.TEXT, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                                                {wo.summary}
                                            </Typography>
                                        ) : (
                                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', py: 2, opacity: 0.5 }}>
                                                <FileText size={24} color={P.MUTED} />
                                                <Typography sx={{ fontSize: '0.75rem', color: P.MUTED, mt: 1, fontStyle: 'italic' }}>
                                                    No summary provided.
                                                </Typography>
                                            </Box>
                                        )}
                                    </Paper>
                                </Grid>

                                <Divider sx={{ my: 1, width: '100%', borderColor: alpha(P.BORDER, 0.5) }} />
                                <Grid size={{ xs: 12 }}>
                                    <SectionLabel color={P.GREEN}>Invoice Line Items</SectionLabel>
                                    {wo.lineItems?.length > 0 ? (
                                        <Table size="small">
                                            <TableHead>
                                                <TableRow>
                                                    {['Item #', 'Qty', 'Rate', 'Worth'].map(h => (
                                                        <TableCell key={h} sx={{ fontSize: '0.68rem', color: P.MUTED, fontWeight: 700, py: 0.5, px: 0.5 }}>{h}</TableCell>
                                                    ))}
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {wo.lineItems.map((item, i) => (
                                                    <TableRow key={i}>
                                                        <TableCell sx={{ fontSize: '0.72rem', py: 0.5, px: 0.5, fontFamily: 'monospace', color: P.BLUE }}>{item.itemNumber}</TableCell>
                                                        <TableCell sx={{ fontSize: '0.72rem', py: 0.5, px: 0.5, color: P.TEXT }}>{item.qty}</TableCell>
                                                        <TableCell sx={{ fontSize: '0.72rem', py: 0.5, px: 0.5, color: P.TEXT }}>{item.rate ? `$${item.rate}` : '—'}</TableCell>
                                                        <TableCell sx={{ fontSize: '0.72rem', py: 0.5, px: 0.5, color: P.TEXT }}>
                                                            {item.breakdown ? (
                                                                <Typography component="span" sx={{ fontSize: '0.72rem', fontWeight: 600, color: P.PURPLE }}>
                                                                    {item.breakdown.replace(/\.0+min/g, 'min').replace(/\.0+hr/g, 'hr').replace(/min x/g, 'hr x')}
                                                                </Typography>
                                                            ) : (
                                                                item.worth ? `${Math.round(item.worth * 60)}min` : '—'
                                                            )}
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    ) : (
                                        <Typography sx={{ fontSize: '0.72rem', color: P.MUTED, fontStyle: 'italic' }}>No line items available.</Typography>
                                    )}
                                    <Box sx={{ mt: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', pt: 1, borderTop: `1px solid ${P.BORDER}` }}>
                                        <Typography sx={{ fontSize: '0.78rem', fontWeight: 600, color: P.TEXT }}>Invoice Total</Typography>
                                        <Typography sx={{ fontSize: '0.88rem', fontWeight: 700, color: P.GREEN }}>
                                            {wo.invoiceTotal !== undefined ? `$${wo.invoiceTotal.toFixed(2)}` : '—'}
                                        </Typography>
                                    </Box>
                                </Grid>
                            </Grid>
                        </Box>
                    </Collapse>
                </TableCell>
            </TableRow>
        </>
    );
};

// ─── RECYCLE BIN MODAL ─────────────────────────────────────────────────────────
const RecycleBinModal = ({ open, onClose, items, onRestore, onPermanentDelete, onBulkRestore, onBulkPermanentDelete }) => {
    const [search, setSearch] = useState('');
    const [selected, setSelected] = useState(new Set());
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    const filtered = useMemo(() => {
        if (!search) return items;
        const low = search.toLowerCase();
        return items.filter(i =>
            i.workOrderNumber?.toLowerCase().includes(low) ||
            i.customerName?.toLowerCase().includes(low) ||
            i.technician?.toLowerCase().includes(low)
        );
    }, [items, search]);

    const pageItems = useMemo(() => filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage), [filtered, page, rowsPerPage]);

    const allSelected = pageItems.length > 0 && pageItems.every(i => selected.has(i.id));
    const someSelected = pageItems.length > 0 && pageItems.some(i => selected.has(i.id)) && !allSelected;

    return (
        <Modal open={open} onClose={onClose} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Box sx={{ width: '95%', maxWidth: 1400, maxHeight: '90vh', bgcolor: 'white', borderRadius: '8px', boxShadow: '0 25px 60px rgba(0,0,0,0.15)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <Box sx={{ p: 2, borderBottom: `1px solid ${alpha(P.PURPLE, 0.12)}`, background: `linear-gradient(135deg, ${alpha(P.PURPLE, 0.06)} 0%, ${alpha(P.PURPLE, 0.02)} 100%)`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Box sx={{ width: 42, height: 42, borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: alpha(P.PURPLE, 0.1), color: P.PURPLE }}>
                            <History size={20} />
                        </Box>
                        <Box>
                            <Typography sx={{ fontSize: '1rem', fontWeight: 700, color: P.TEXT }}>Recycle Bin</Typography>
                            <Typography sx={{ fontSize: '0.78rem', color: P.MUTED }}>{items.length} deleted record(s)</Typography>
                        </Box>
                    </Box>
                    <IconButton size="small" onClick={onClose} sx={{ color: P.MUTED }}>
                        <X size={18} />
                    </IconButton>
                </Box>

                <Box sx={{ px: 2, py: 1.25, borderBottom: `1px solid ${alpha(P.PURPLE, 0.08)}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, bgcolor: '#fafbfc' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Checkbox size="small" checked={allSelected} indeterminate={someSelected} onChange={() => {
                            if (allSelected) pageItems.forEach(i => selected.delete(i.id));
                            else pageItems.forEach(i => selected.add(i.id));
                            setSelected(new Set(selected));
                        }} sx={{ padding: '4px', color: alpha(P.PURPLE, 0.4), '&.Mui-checked': { color: P.PURPLE } }} />
                        {selected.size === 0 && (
                            <TableSearchBar value={search} onChange={v => { setSearch(v); setPage(0); }} color={P.PURPLE} placeholder="Search deleted items…" />
                        )}
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button variant="outlined" size="small" startIcon={<RotateCcw size={12} />} onClick={() => { onBulkRestore([...selected]); setSelected(new Set()); }} disabled={selected.size === 0}
                            sx={{ textTransform: 'none', fontSize: '0.7rem', fontWeight: 500, color: P.GREEN, borderColor: alpha(P.GREEN, 0.35), borderRadius: '6px', px: 1.5, py: 0.5 }}>
                            Restore ({selected.size})
                        </Button>
                        <Button variant="outlined" size="small" startIcon={<Trash2 size={12} />} onClick={() => { onBulkPermanentDelete([...selected]); setSelected(new Set()); }} disabled={selected.size === 0}
                            sx={{ textTransform: 'none', fontSize: '0.7rem', fontWeight: 500, color: P.RED, borderColor: alpha(P.RED, 0.35), borderRadius: '6px', px: 1.5, py: 0.5 }}>
                            Delete ({selected.size})
                        </Button>
                    </Box>
                </Box>

                <Box sx={{ flex: 1, overflow: 'auto', ...thinScrollbar(P.PURPLE) }}>
                    <Table stickyHeader size="small">
                        <TableHead>
                            <TableRow sx={{ bgcolor: alpha(P.PURPLE, 0.03), '& th': { borderBottom: `2px solid ${alpha(P.PURPLE, 0.1)}`, fontWeight: 600, fontSize: '0.75rem', color: P.TEXT, py: 1.5, px: 1.5 } }}>
                                <TableCell padding="checkbox" width={40} />
                                <TableCell>Work Order</TableCell>
                                <TableCell>Customer</TableCell>
                                <TableCell>Technician</TableCell>
                                <TableCell>Deleted By</TableCell>
                                <TableCell>Deleted At</TableCell>
                                <TableCell align="right" width={100}>Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {pageItems.length === 0 ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={7}
                                        sx={{
                                            py: 6,
                                            textAlign: 'center'
                                        }}
                                    >
                                        <Box
                                            sx={{
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                            }}
                                        >
                                            <Box>
                                                <History
                                                    size={32}
                                                    color={alpha(P.MUTED, 0.3)}
                                                    style={{ marginBottom: 8 }}
                                                />
                                            </Box>
                                            <Typography
                                                variant="body2"
                                                sx={{ color: P.MUTED, fontSize: '0.85rem' }}
                                            >
                                                {search ? 'No matching deleted items' : 'No deleted items'}
                                            </Typography>
                                        </Box>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                pageItems.map(item => (
                                    <TableRow key={item.id} hover sx={{ bgcolor: selected.has(item.id) ? alpha(P.PURPLE, 0.07) : 'white' }}>
                                        <TableCell padding="checkbox" sx={{ pl: 1.5, py: 1 }}>
                                            <Checkbox size="small" checked={selected.has(item.id)} onChange={() => {
                                                if (selected.has(item.id)) selected.delete(item.id);
                                                else selected.add(item.id);
                                                setSelected(new Set(selected));
                                            }} sx={{ padding: '4px', color: alpha(P.PURPLE, 0.4), '&.Mui-checked': { color: P.PURPLE } }} />
                                        </TableCell>
                                        <TableCell sx={{ py: 1 }}>
                                            <Typography sx={{ fontSize: '0.78rem', fontWeight: 600, color: P.PURPLE }}>{item.workOrderNumber}</Typography>
                                        </TableCell>
                                        <TableCell sx={{ py: 1 }}>
                                            <Typography sx={{ fontSize: '0.78rem', color: P.TEXT }}>{item.customerName}</Typography>
                                        </TableCell>
                                        <TableCell sx={{ py: 1 }}>
                                            <Typography sx={{ fontSize: '0.78rem', color: P.TEXT }}>{item.technician}</Typography>
                                        </TableCell>
                                        <TableCell sx={{ py: 1 }}>
                                            <Typography sx={{ fontSize: '0.78rem', color: P.TEXT }}>{item.deleted_by || 'Unknown'}</Typography>
                                        </TableCell>
                                        <TableCell sx={{ py: 1 }}>
                                            <Typography sx={{ fontSize: '0.78rem', color: P.TEXT }}>{formatDateTimeWithTZ(item.deleted_date)}</Typography>
                                        </TableCell>
                                        <TableCell align="right" sx={{ py: 1, pr: 1.5 }}>
                                            <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                                                <Tooltip title="Restore"><IconButton size="small" onClick={() => onRestore(item.id)} sx={{ color: P.GREEN, p: 0.5 }}><RotateCcw size={14} /></IconButton></Tooltip>
                                                <Tooltip title="Delete Permanently"><IconButton size="small" onClick={() => onPermanentDelete(item.id)} sx={{ color: P.RED, p: 0.5 }}><Trash2 size={14} /></IconButton></Tooltip>
                                            </Stack>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </Box>

                <TablePagination
                    rowsPerPageOptions={[5, 10, 25]}
                    component="div"
                    count={filtered.length}
                    rowsPerPage={rowsPerPage}
                    page={page}
                    onPageChange={(e, p) => setPage(p)}
                    onRowsPerPageChange={e => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
                    SelectProps={{ MenuProps: { disableScrollLock: true } }}
                    sx={{ borderTop: `1px solid ${alpha(P.PURPLE, 0.08)}`, bgcolor: '#fafbfc', '& .MuiTablePagination-toolbar': { minHeight: '44px' }, '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': { fontSize: '0.78rem', color: P.MUTED } }}
                />
            </Box>
        </Modal>
    );
};

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────
export const InvoiceProficiency = () => {
    const queryClient = useQueryClient();
    const { showSnackbar } = useGlobalSnackbar();
    const { user } = useAuth();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    // Pagination state for main table - set to 10 rows per page by default
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    const [selectedTech, setSelectedTech] = useState('');
    const [quickRange, setQuickRange] = useState('Last Week');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [selectedJobType, setSelectedJobType] = useState('All');
    const [search, setSearch] = useState('');
    const [selected, setSelected] = useState(new Set());
    const [trashOpen, setTrashOpen] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState({ open: false, id: null, bulk: false });
    const [confirmRestore, setConfirmRestore] = useState({ open: false, id: null, bulk: false, restoreIds: [] });
    const [confirmPermanent, setConfirmPermanent] = useState({ open: false, id: null, bulk: false, deleteIds: [] });

    const { data: scraperStatus } = useQuery({
        queryKey: ['scraper-status'],
        queryFn: () => rmeApi.getScraperStatus(),
        refetchInterval: 5000,
    });
    const isRunning = scraperStatus?.data?.is_running;

    const { data: rawData, isLoading, isError } = useQuery({
        queryKey: ['invoice-proficiency'],
        queryFn: () => rmeApi.getInvoiceProficiencyData(),
    });
    // console.log('rawData', rawData)

    const { data: trashedData } = useQuery({
        queryKey: ['invoice-proficiency-trashed'],
        queryFn: () => rmeApi.getTrashedInvoiceProficiency(),
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => rmeApi.deleteInvoiceProficiency(id, { deleted_by: user?.name, deleted_by_email: user?.email }),
        onSuccess: () => {
            queryClient.invalidateQueries(['invoice-proficiency']);
            queryClient.invalidateQueries(['invoice-proficiency-trashed']);
            showSnackbar('Record moved to recycle bin', 'success');
        }
    });

    const bulkDeleteMutation = useMutation({
        mutationFn: (ids) => rmeApi.bulkDeleteInvoiceProficiency(ids, { deleted_by: user?.name, deleted_by_email: user?.email }),
        onSuccess: () => {
            queryClient.invalidateQueries(['invoice-proficiency']);
            queryClient.invalidateQueries(['invoice-proficiency-trashed']);
            setSelected(new Set());
            showSnackbar('Records moved to recycle bin', 'success');
        }
    });

    const restoreMutation = useMutation({
        mutationFn: (id) => rmeApi.restoreInvoiceProficiency(id),
        onSuccess: () => {
            queryClient.invalidateQueries(['invoice-proficiency']);
            queryClient.invalidateQueries(['invoice-proficiency-trashed']);
            showSnackbar('Record restored successfully', 'success');
        }
    });

    const bulkRestoreMutation = useMutation({
        mutationFn: (ids) => rmeApi.bulkRestoreInvoiceProficiency(ids),
        onSuccess: () => {
            queryClient.invalidateQueries(['invoice-proficiency']);
            queryClient.invalidateQueries(['invoice-proficiency-trashed']);
            showSnackbar('Records restored successfully', 'success');
        }
    });

    const permanentDeleteMutation = useMutation({
        mutationFn: (id) => rmeApi.permanentDeleteInvoiceProficiency(id),
        onSuccess: () => {
            queryClient.invalidateQueries(['invoice-proficiency-trashed']);
            showSnackbar('Record deleted permanently', 'info');
        }
    });

    const bulkPermanentDeleteMutation = useMutation({
        mutationFn: (ids) => rmeApi.bulkPermanentDeleteInvoiceProficiency(ids),
        onSuccess: () => {
            queryClient.invalidateQueries(['invoice-proficiency-trashed']);
            showSnackbar('Records deleted permanently', 'info');
        }
    });

    const trashedRecords = useMemo(() => trashedData?.data || [], [trashedData]);
    const resolvedRange = useMemo(() => {
        if (quickRange === 'Manual Entry') return { from: dateFrom, to: dateTo };
        return quickRanges[quickRange]?.() ?? { from: '', to: '' };
    }, [quickRange, dateFrom, dateTo]);

    const technicians = useMemo(() => {
        if (!rawData?.data) return [];
        const techs = [...new Set(rawData.data.map(wo => wo.technician))].sort();
        return ['All Technicians', ...techs];
    }, [rawData]);

    React.useEffect(() => {
        if (technicians.length && !selectedTech) setSelectedTech('All Technicians');
    }, [technicians]);

    // Job type config – pulls colors from priorityConfig to stay in sync
    const JOB_TYPES = [
        { label: 'All', value: 'All', color: P.BLUE, prefix: null },
        { label: '[1] Pumping', value: '[1]', color: priorityConfig['[1] ROUTINE (PUMPING)']?.color || '#B4FE73', prefix: '[1]' },
        { label: '[2] Service', value: '[2]', color: priorityConfig['[2] ROUTINE (SERVICE)']?.color || '#E7A3D3', prefix: '[2]' },
        { label: '[3] Excavation', value: '[3]', color: priorityConfig['[3] EXCAVATOR (EXCAVATION)']?.color || '#80604d', prefix: '[3]' },
    ];
    const activeJobType = JOB_TYPES.find(jt => jt.value === selectedJobType) || JOB_TYPES[0];

    const { validWOs, errorWOs, allForTech } = useMemo(() => {
        if (!rawData?.data) return { validWOs: [], errorWOs: [], allForTech: [] };

        const fromDate = resolvedRange.from ? new Date(resolvedRange.from) : null;
        const toDate = resolvedRange.to ? new Date(resolvedRange.to) : null;

        const forTech = rawData.data.filter(wo => {
            if (selectedTech !== 'All Technicians' && wo.technician !== selectedTech) return false;
            if (!wo.hasInvoice) return false;
            if (!wo.assignmentComplete) return false;
            if (fromDate && new Date(wo.completedDate) < fromDate) return false;
            if (toDate && new Date(wo.completedDate) > toDate) return false;
            // Job type filter
            if (selectedJobType !== 'All' && !wo.priority?.includes(selectedJobType)) return false;
            return true;
        });

        const valid = [], errors = [], all = [];
        forTech.forEach(wo => {
            const compDate = new Date(wo.completedDate);
            const invDate = new Date(wo.invoiceDate);
            const diffDays = Math.abs((compDate - invDate) / (1000 * 60 * 60 * 24));
            
            // Calculate proficiency locally to ensure it always matches worked/worth hours
            const calculatedProf = wo.hoursWorked > 0 ? (wo.worthHours / wo.hoursWorked) : 0;
            
            const enhancedWO = { 
                ...wo, 
                proficiency: calculatedProf,
                dateDiff: diffDays.toFixed(0), 
                dateError: diffDays > 5 
            };
            
            if (enhancedWO.dateError) errors.push(enhancedWO);
            else valid.push(enhancedWO);
            all.push(enhancedWO);
        });
        return { validWOs: valid, errorWOs: errors, allForTech: all };
    }, [rawData, selectedTech, resolvedRange, selectedJobType]);

    // Search filtering
    const searchedWOs = useMemo(() => {
        if (!search) return allForTech;
        const low = search.toLowerCase();
        return allForTech.filter(wo =>
            wo.workOrderNumber?.toLowerCase().includes(low) ||
            wo.customerName?.toLowerCase().includes(low) ||
            wo.task?.toLowerCase().includes(low) ||
            wo.technician?.toLowerCase().includes(low)
        );
    }, [allForTech, search]);

    // Reset page when search or filters change
    React.useEffect(() => {
        setPage(0);
    }, [search, selectedTech, quickRange, dateFrom, dateTo, selectedJobType]);

    // Paginated data - fixed to show exactly rowsPerPage (10 by default) items
    const paginatedWOs = useMemo(() => {
        const start = page * rowsPerPage;
        return searchedWOs.slice(start, start + rowsPerPage);
    }, [searchedWOs, page, rowsPerPage]);

    const stats = useMemo(() => {
        const totalWOs = validWOs.length;
        const proficiencies = validWOs.map(w => w.proficiency).filter(p => p !== null && p !== undefined);
        const avgProf = proficiencies.length ? proficiencies.reduce((a, b) => a + b, 0) / proficiencies.length : null;
        const totals = validWOs.map(w => w.invoiceTotal).filter(t => t !== null && t !== undefined);
        const avgDollar = totals.length ? totals.reduce((a, b) => a + b, 0) / totals.length : null;
        const totalWorthMinutes = validWOs.reduce((a, b) => a + ((b.worthHours ?? 0) * 60), 0);
        const totalWorkedMinutes = validWOs.reduce((a, b) => a + ((b.hoursWorked ?? 0) * 60), 0);
        return { totalWOs, avgProf, avgDollar, totalWorthMinutes, totalWorkedMinutes };
    }, [validWOs]);

    const categoryRows = useMemo(() => {
        const groups = {};
        validWOs.forEach(wo => {
            const key = `${wo.priority}||${wo.task}`;
            if (!groups[key]) groups[key] = { priority: wo.priority, task: wo.task, invoices: [] };
            groups[key].invoices.push(wo);
        });
        return Object.values(groups).map(g => {
            const invCount = g.invoices.length;
            const totalWorth = g.invoices.reduce((a, b) => a + (b.worthHours ?? 0), 0);
            const totalWorked = g.invoices.reduce((a, b) => a + (b.hoursWorked ?? 0), 0);
            const avgProficiency = totalWorked > 0 ? (totalWorth / totalWorked) : 0;
            
            return {
                priority: g.priority,
                task: g.task,
                invCount,
                avgProficiency,
                avgDollar: invCount ? g.invoices.reduce((a, b) => a + (b.invoiceTotal ?? 0), 0) / invCount : null,
            };
        }).sort((a, b) => a.priority?.localeCompare(b.priority));
    }, [validWOs]);

    const pumpingRows = categoryRows.filter(r => r.priority?.includes('[1]'));
    const serviceRows = categoryRows.filter(r => r.priority?.includes('[2]'));
    const excavationRows = categoryRows.filter(r => r.priority?.includes('[3]'));

    const drainFieldStats = useMemo(() => {
        const drainJobs = validWOs.filter(wo => {
            const p = wo.priority?.toUpperCase() || '';
            const t = wo.task?.toUpperCase() || '';
            return p.includes('[3]') && t.includes('DRAIN') && t.includes('FIELD');
        });
        const pass = drainJobs.filter(wo =>
            wo.lineItems?.some(item => {
                const num = item.itemNumber?.toUpperCase() || '';
                return num.includes('6SP1DRA') && (num.includes('4HR') || num.includes('𝟒𝐇𝐑'));
            })
        ).length;
        const fail = drainJobs.length - pass;
        return { pass, fail };
    }, [validWOs]);

    const toggleSelect = (id) => {
        const next = new Set(selected);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelected(next);
    };

    const toggleAll = () => {
        if (selected.size === paginatedWOs.length) setSelected(new Set());
        else setSelected(new Set(paginatedWOs.map(w => w.id)));
    };

    const handleDeleteClick = (id) => setConfirmDelete({ open: true, id, bulk: false });
    const handleBulkDeleteClick = () => setConfirmDelete({ open: true, id: null, bulk: true });
    const handleRestoreClick = (id) => setConfirmRestore({ open: true, id, bulk: false, restoreIds: [id] });
    const handleBulkRestoreClick = (ids) => setConfirmRestore({ open: true, id: null, bulk: true, restoreIds: ids });
    const handlePermanentClick = (id) => setConfirmPermanent({ open: true, id, bulk: false, deleteIds: [id] });
    const handleBulkPermanentClick = (ids) => setConfirmPermanent({ open: true, id: null, bulk: true, deleteIds: ids });

    const confirmDeleteAction = () => {
        if (confirmDelete.bulk) bulkDeleteMutation.mutate([...selected]);
        else deleteMutation.mutate(confirmDelete.id);
        setConfirmDelete({ open: false, id: null, bulk: false });
    };

    const confirmRestoreAction = () => {
        if (confirmRestore.bulk) bulkRestoreMutation.mutate(confirmRestore.restoreIds);
        else restoreMutation.mutate(confirmRestore.id);
        setConfirmRestore({ open: false, id: null, bulk: false, restoreIds: [] });
    };

    const confirmPermanentAction = () => {
        if (confirmPermanent.bulk) bulkPermanentDeleteMutation.mutate(confirmPermanent.deleteIds);
        else permanentDeleteMutation.mutate(confirmPermanent.id);
        setConfirmPermanent({ open: false, id: null, bulk: false, deleteIds: [] });
    };

    if (isLoading) return <DashboardLoader />;

    // Table column count based on whether technician column is shown
    const colSpan = selectedTech === 'All Technicians' ? 11 : 10;

    return (
        <Box>
            <Helmet>
                <title>Invoice Proficiency | Sterling Septic & Plumbing LLC</title>
            </Helmet>

            {/* HEADER */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, mb: { xs: 2, sm: 3 }, flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
                <Box>
                    <Typography sx={{ fontWeight: 600, mb: 0.5, fontSize: '1rem', color: P.TEXT, letterSpacing: '-0.01em' }}>
                        Invoice Proficiency
                    </Typography>
                    <Typography variant="body2" sx={{ color: P.MUTED, fontSize: '0.8rem' }}>
                        Track technician performance and invoice metrics
                    </Typography>
                </Box>
                <Stack direction="row" spacing={1.5} alignItems="center">
                    {isRunning && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1.5, py: 0.5, bgcolor: alpha(P.BLUE, 0.08), borderRadius: '20px', border: `1px solid ${alpha(P.BLUE, 0.2)}` }}>
                            <Box className="animate-pulse" sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: P.BLUE }} />
                            <Typography sx={{ fontSize: '0.72rem', fontWeight: 600, color: P.BLUE }}>
                                Scraper Running... ({scraperStatus?.data?.elapsed_minutes}m)
                            </Typography>
                        </Box>
                    )}
                    <RefreshButton onRefresh={rmeApi.startInvoiceProficiencyScraping} />
                    <OutlineButton startIcon={<History size={16} />} onClick={() => setTrashOpen(true)}
                        sx={{ height: '34px', px: 1.75, color: P.PURPLE, borderColor: alpha(P.PURPLE, 0.35), borderRadius: '6px', '&:hover': { borderColor: P.PURPLE, bgcolor: alpha(P.PURPLE, 0.05) } }}>
                        Recycle Bin ({trashedRecords.length})
                    </OutlineButton>
                </Stack>
            </Box>

            {/* FILTERS */}
            <Paper elevation={0} sx={{ p: { xs: 1.5, sm: 2 }, mb: { xs: 2, sm: 3 }, border: `1px solid ${P.BORDER}`, borderRadius: '10px', bgcolor: P.SURFACE }}>
                <Grid container spacing={1.5} alignItems="center">
                    <Grid size={{ xs: 12, sm: 4, md: 3 }}>
                        <FormControl fullWidth size="small">
                            <InputLabel sx={{ fontSize: '0.78rem' }}>Technician</InputLabel>
                            <Select
                                value={selectedTech}
                                label="Technician"
                                onChange={e => setSelectedTech(e.target.value)}
                                sx={{ fontSize: '0.78rem', borderRadius: '6px' }}
                                startAdornment={<Users size={14} color={P.MUTED} style={{ marginRight: 6 }} />}
                                MenuProps={{ disableScrollLock: true }}
                            >
                                {technicians.map(t => <MenuItem key={t} value={t} sx={{ fontSize: '0.78rem' }}>{t}</MenuItem>)}
                            </Select>
                        </FormControl>
                    </Grid>

                    <Grid size={{ xs: 12, sm: 4, md: 3 }}>
                        <FormControl fullWidth size="small">
                            <InputLabel sx={{ fontSize: '0.78rem', color: selectedJobType !== 'All' ? activeJobType.color : 'inherit' }}>Job Type</InputLabel>
                            <Select
                                value={selectedJobType}
                                label="Job Type"
                                onChange={e => setSelectedJobType(e.target.value)}
                                sx={{
                                    fontSize: '0.78rem',
                                    borderRadius: '6px',
                                    color: selectedJobType !== 'All' ? activeJobType.color : P.TEXT,
                                    fontWeight: selectedJobType !== 'All' ? 700 : 500,
                                    '& .MuiOutlinedInput-notchedOutline': {
                                        borderColor: selectedJobType !== 'All' ? alpha(activeJobType.color, 0.4) : P.BORDER,
                                        borderWidth: selectedJobType !== 'All' ? '1.5px' : '1px'
                                    },
                                    '&:hover .MuiOutlinedInput-notchedOutline': {
                                        borderColor: selectedJobType !== 'All' ? activeJobType.color : P.BLUE
                                    },
                                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                        borderColor: activeJobType.color
                                    }
                                }}
                                startAdornment={<FileText size={14} color={activeJobType.color} style={{ marginRight: 6 }} />}
                                renderValue={(selected) => {
                                    const jt = JOB_TYPES.find(j => j.value === selected);
                                    return (
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: jt?.color || P.BLUE }} />
                                            {jt?.label || selected}
                                        </Box>
                                    );
                                }}
                                MenuProps={{ disableScrollLock: true }}
                            >
                                {JOB_TYPES.map(jt => (
                                    <MenuItem key={jt.value} value={jt.value} sx={{ fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: jt.color }} />
                                        {jt.label}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>

                    <Grid size={{ xs: 12, sm: 4, md: 3 }}>
                        <FormControl fullWidth size="small">
                            <InputLabel sx={{ fontSize: '0.78rem' }}>Quick Range</InputLabel>
                            <Select
                                value={quickRange}
                                label="Quick Range"
                                onChange={e => setQuickRange(e.target.value)}
                                sx={{ fontSize: '0.78rem', borderRadius: '6px' }}
                                startAdornment={<Calendar size={14} color={P.MUTED} style={{ marginRight: 6 }} />}
                                MenuProps={{ disableScrollLock: true }}
                            >
                                {['Manual Entry', 'All Time', 'Last Week', 'Last Month', 'Last Quarter', 'Last Year'].map(r => <MenuItem key={r} value={r} sx={{ fontSize: '0.78rem' }}>{r}</MenuItem>)}
                            </Select>
                        </FormControl>
                    </Grid>



                    {quickRange === 'Manual Entry' && (
                        <>
                            <Grid size={{ xs: 6, sm: 2, md: 2 }}>
                                <TextField size="small" label="From" type="date" fullWidth InputLabelProps={{ shrink: true }} value={dateFrom} onChange={e => setDateFrom(e.target.value)} sx={{ '& .MuiInputBase-root': { borderRadius: '6px', fontSize: '0.78rem' } }} />
                            </Grid>
                            <Grid size={{ xs: 6, sm: 2, md: 2 }}>
                                <TextField size="small" label="To" type="date" fullWidth InputLabelProps={{ shrink: true }} value={dateTo} onChange={e => setDateTo(e.target.value)} sx={{ '& .MuiInputBase-root': { borderRadius: '6px', fontSize: '0.78rem' } }} />
                            </Grid>
                        </>
                    )}
                </Grid>
            </Paper>

            {isError ? (
                <Alert severity="error" variant="outlined" sx={{ borderRadius: '10px' }}>Failed to load invoice proficiency data. Please try again.</Alert>
            ) : (
                <>
                    {/* STAT CARDS */}
                    <Grid container spacing={1.5} sx={{ mb: { xs: 2, sm: 3 } }}>
                        <Grid size={{ xs: 6, sm: 4, md: 3 }}>
                            <StatCard icon={BarChart2} label="Total WOs" value={stats.totalWOs} sub={`${stats.totalWorthMinutes.toFixed(0)}min Worth`} accent={P.BLUE} accentBg={P.BLUE_SOFT} />
                        </Grid>
                        <Grid size={{ xs: 6, sm: 4, md: 3 }}>
                            <StatCard icon={Zap} label="Avg Proficiency" value={stats.avgProf !== null ? profLabel(stats.avgProf) : '—'} sub={`${stats.totalWorkedMinutes.toFixed(1)}min Worked`} accent={stats.avgProf !== null ? profColor(stats.avgProf) : P.MUTED} accentBg={stats.avgProf !== null ? profBg(stats.avgProf) : '#F2F4F7'} />
                        </Grid>
                        <Grid size={{ xs: 6, sm: 4, md: 3 }}>
                            <StatCard icon={DollarSign} label="Avg Invoice" value={stats.avgDollar !== null ? `$${stats.avgDollar.toFixed(0)}` : '—'} sub="Average amount" accent={P.GREEN} accentBg={P.GREEN_SOFT} />
                        </Grid>
                        <Grid size={{ xs: 6, sm: 4, md: 3 }}>
                            <StatCard icon={Clock} label="Worked Minutes" value={`${stats.totalWorkedMinutes.toFixed(1)}min`} sub="Cumulative time" accent={P.AMBER} accentBg={alpha(P.AMBER, 0.1)} />
                        </Grid>
                    </Grid>

                    {/* ERROR REPORT */}
                    <ErrorReportPanel errors={errorWOs} />

                    {/* CATEGORY TABLES – filtered by selected job type */}
                    <Grid container spacing={1.5} sx={{ mb: { xs: 2, sm: 3 } }}>
                        {/* ── PUMPING ── */}
                        {(selectedJobType === 'All' || selectedJobType === '[1]') && (
                            <Grid size={{ xs: 12, md: 12 }}>
                                <Paper
                                    elevation={0}
                                    sx={{
                                        p: 1.5,
                                        border: `1px solid ${selectedJobType === '[1]' ? alpha(JOB_TYPES[1].color, 0.45) : P.BORDER}`,
                                        borderRadius: '10px',
                                        bgcolor: selectedJobType === '[1]' ? alpha(JOB_TYPES[1].color, 0.03) : P.SURFACE,
                                        transition: 'border-color 0.2s, background-color 0.2s',
                                    }}
                                >
                                    <CategoryTable title="[1] Pumping" rows={pumpingRows} color={JOB_TYPES[1].color} />
                                </Paper>
                            </Grid>
                        )}

                        {/* ── SERVICE ── */}
                        {(selectedJobType === 'All' || selectedJobType === '[2]') && (
                            <Grid size={{ xs: 12, md: 12 }}>
                                <Paper
                                    elevation={0}
                                    sx={{
                                        p: 1.5,
                                        border: `1px solid ${selectedJobType === '[2]' ? alpha(JOB_TYPES[2].color, 0.45) : P.BORDER}`,
                                        borderRadius: '10px',
                                        bgcolor: selectedJobType === '[2]' ? alpha(JOB_TYPES[2].color, 0.03) : P.SURFACE,
                                        transition: 'border-color 0.2s, background-color 0.2s',
                                    }}
                                >
                                    <CategoryTable title="[2] Service" rows={serviceRows} color={JOB_TYPES[2].color} />
                                </Paper>
                            </Grid>
                        )}

                        {/* ── EXCAVATION + DRAIN FIELD ── */}
                        {(selectedJobType === 'All' || selectedJobType === '[3]') && (
                            <Grid size={{ xs: 12 }}>
                                <Grid container spacing={1.5}>
                                    <Grid size={{ xs: 12, md: 8 }}>
                                        <Paper
                                            elevation={0}
                                            sx={{
                                                p: 1.5,
                                                border: `1px solid ${selectedJobType === '[3]' ? alpha(JOB_TYPES[3].color, 0.45) : P.BORDER}`,
                                                borderRadius: '10px',
                                                bgcolor: selectedJobType === '[3]' ? alpha(JOB_TYPES[3].color, 0.03) : P.SURFACE,
                                                height: '100%',
                                                transition: 'border-color 0.2s, background-color 0.2s',
                                            }}
                                        >
                                            <CategoryTable title="[3] Excavation" rows={excavationRows} color={JOB_TYPES[3].color} />
                                        </Paper>
                                    </Grid>
                                    <Grid size={{ xs: 12, md: 4 }}>
                                        <DrainFieldCard pass={drainFieldStats.pass} fail={drainFieldStats.fail} />
                                    </Grid>
                                </Grid>
                            </Grid>
                        )}
                    </Grid>

                    {/* WORK ORDERS TABLE */}
                    <Paper
                        elevation={0}
                        sx={{
                            border: `1px solid ${selectedJobType !== 'All' ? alpha(activeJobType.color, 0.4) : P.BORDER}`,
                            borderRadius: '10px',
                            bgcolor: P.SURFACE,
                            overflow: 'hidden',
                            transition: 'border-color 0.2s',
                        }}
                    >
                        <Box sx={{ p: { xs: 1, sm: 1.5 }, borderBottom: `1px solid ${P.BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: selectedJobType !== 'All' ? alpha(activeJobType.color, 0.03) : alpha(P.BLUE, 0.01), flexWrap: 'nowrap', gap: 1, transition: 'background-color 0.2s' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography sx={{ fontSize: '0.9rem', fontWeight: 600, color: P.TEXT }}>Work Orders</Typography>
                                {selectedJobType !== 'All' && (
                                    <Chip
                                        label={activeJobType.label}
                                        size="small"
                                        sx={{
                                            height: 20, fontSize: '0.68rem', fontWeight: 700,
                                            bgcolor: alpha(activeJobType.color, 0.12),
                                            color: activeJobType.color,
                                            border: `1px solid ${alpha(activeJobType.color, 0.3)}`,
                                            '& .MuiChip-label': { px: 1 },
                                        }}
                                    />
                                )}
                                <Chip label={searchedWOs.length} size="small" sx={{ height: 20, fontSize: '0.7rem', bgcolor: P.BLUE_SOFT, color: P.BLUE, fontWeight: 600 }} />
                            </Box>

                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                {selected.size > 0 ? (
                                    <OutlineButton
                                        color="error"
                                        size="small"
                                        onClick={handleBulkDeleteClick}
                                        startIcon={<Trash2 size={14} />}
                                        sx={{ height: '32px', px: 2, borderRadius: '6px' }}
                                    >
                                        Trash Selected ({selected.size})
                                    </OutlineButton>
                                ) : (
                                    <TableSearchBar value={search} onChange={setSearch} color={P.BLUE} placeholder="Search records…" />
                                )}
                            </Box>
                        </Box>

                        {/* Fixed height table container showing exactly rowsPerPage (10) items */}
                        <TableContainer sx={{ overflowX: 'auto', ...thinScrollbar(P.BLUE) }}>
                            <Table stickyHeader size="small">
                                <TableHead>
                                    <TableRow sx={{ bgcolor: alpha(P.BLUE, 0.04), '& th': { borderBottom: `2px solid ${alpha(P.BLUE, 0.1)}`, fontWeight: 600, fontSize: '0.75rem', color: P.TEXT, py: 1.5, whiteSpace: 'nowrap' } }}>
                                        <TableCell padding="checkbox" sx={{ pl: 2, width: 40 }}>
                                            <Checkbox
                                                size="small"
                                                checked={paginatedWOs.length > 0 && selected.size === paginatedWOs.length}
                                                indeterminate={selected.size > 0 && selected.size < paginatedWOs.length}
                                                onChange={toggleAll}
                                                sx={{ color: P.TEXT, padding: '4px' }}
                                            />
                                        </TableCell>
                                        <TableCell sx={{ width: 36 }} />
                                        <TableCell>Work Order</TableCell>
                                        {selectedTech === 'All Technicians' && <TableCell>Technician</TableCell>}
                                        <TableCell>Priority</TableCell>
                                        <TableCell>Date</TableCell>
                                        <TableCell>Worked (min)</TableCell>
                                        <TableCell>Worth (min)</TableCell>
                                        <TableCell>Invoice</TableCell>
                                        <TableCell>Prof</TableCell>
                                        <TableCell align="right" sx={{ pr: 2 }} />
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {paginatedWOs.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={colSpan} sx={{ textAlign: 'center', py: 6 }}>
                                                <Search size={24} color={alpha(P.TEXT, 0.2)} />
                                                <Typography sx={{ fontSize: '0.85rem', color: P.MUTED, mt: 1 }}>No matching records found.</Typography>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        paginatedWOs.map(wo => (
                                            <WorkOrderRow
                                                key={wo.id}
                                                wo={wo}
                                                isSelected={selected.has(wo.id)}
                                                onToggle={() => toggleSelect(wo.id)}
                                                onDelete={handleDeleteClick}
                                                showTech={selectedTech === 'All Technicians'}
                                            />
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>

                        {/* Pagination - shows 10 rows per page by default */}
                        {searchedWOs.length > 0 && (
                            <TablePagination
                                rowsPerPageOptions={[5, 10, 25, 50]}
                                component="div"
                                count={searchedWOs.length}
                                rowsPerPage={rowsPerPage}
                                page={page}
                                onPageChange={(e, p) => setPage(p)}
                                onRowsPerPageChange={e => {
                                    setRowsPerPage(parseInt(e.target.value, 10));
                                    setPage(0);
                                }}
                                SelectProps={{ MenuProps: { disableScrollLock: true } }}
                                sx={{
                                    borderTop: `1px solid ${alpha(P.BLUE, 0.08)}`,
                                    bgcolor: '#fafbfc',
                                    '& .MuiTablePagination-toolbar': { minHeight: '44px' },
                                    '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': { fontSize: '0.78rem', color: P.MUTED }
                                }}
                            />
                        )}
                    </Paper>
                </>
            )}

            <RecycleBinModal
                open={trashOpen}
                onClose={() => setTrashOpen(false)}
                items={trashedData?.data || []}
                onRestore={handleRestoreClick}
                onPermanentDelete={handlePermanentClick}
                onBulkRestore={handleBulkRestoreClick}
                onBulkPermanentDelete={handleBulkPermanentClick}
            />

            <CommonDialog
                open={confirmDelete.open}
                onClose={() => setConfirmDelete({ open: false, id: null, bulk: false })}
                onConfirm={confirmDeleteAction}
                title="Move to Recycle Bin"
                variant="danger"
                confirmText="Move to Trash"
                icon={<Trash2 size={16} />}
            >
                <Typography sx={{ fontSize: '0.85rem', color: P.TEXT }}>
                    Move {confirmDelete.bulk ? `${selected.size} items` : 'this record'} to recycle bin?
                </Typography>
            </CommonDialog>

            <CommonDialog
                open={confirmRestore.open}
                onClose={() => setConfirmRestore({ open: false, id: null, bulk: false, restoreIds: [] })}
                onConfirm={confirmRestoreAction}
                title="Restore Records"
                variant="success"
                confirmText="Restore"
                icon={<RotateCcw size={16} />}
            >
                <Typography sx={{ fontSize: '0.85rem', color: P.TEXT }}>
                    Restore {confirmRestore.bulk ? `${confirmRestore.restoreIds.length} items` : 'this record'} back to the main dashboard?
                </Typography>
            </CommonDialog>

            <CommonDialog
                open={confirmPermanent.open}
                onClose={() => setConfirmPermanent({ open: false, id: null, bulk: false, deleteIds: [] })}
                onConfirm={confirmPermanentAction}
                title="Permanent Delete"
                variant="danger"
                confirmText="Delete Forever"
                icon={<AlertCircle size={16} />}
            >
                <Typography sx={{ fontSize: '0.85rem', color: P.TEXT }}>
                    Are you sure you want to permanently delete {confirmPermanent.bulk ? `${confirmPermanent.deleteIds.length} items` : 'this record'}?
                    This action <strong style={{ color: P.RED }}>cannot</strong> be undone.
                </Typography>
            </CommonDialog>
        </Box>
    );
};