import React, { useState, useEffect, useCallback, memo } from 'react';
import {
    Box,
    Typography,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    IconButton,
    Collapse,
    Tooltip,
    Chip,
    Alert,
    CircularProgress,
    TablePagination
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
    ChevronDown,
    ChevronUp,
    Copy,
    Phone as PhoneIcon,
    Info,
    CheckCircle2,
    XCircle
} from 'lucide-react';
import { callrailApi } from '../../../../api/services/callrailApi';
import { Helmet } from 'react-helmet-async';
import { useGlobalSnackbar } from '../../../../context/GlobalSnackbarContext';

/* ── Palette (consistent with Customer Center) ───────────────────────────── */
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

/* ── Date formatter ──────────────────────────────────────────────────────── */
const formatDateTime = (dateString) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    return isNaN(date) ? '—' : date.toLocaleString();
};

/* ── Status Chip Component ───────────────────────────────────────────────── */
const StatusChip = memo(({ answered }) => {
    const config = answered 
        ? { label: 'Answered', color: PALETTE.GREEN, icon: <CheckCircle2 size={12} /> }
        : { label: 'Missed', color: PALETTE.RED, icon: <XCircle size={12} /> };
    
    return (
        <Chip
            size="small"
            label={config.label}
            icon={config.icon}
            sx={{
                bgcolor: alpha(config.color, 0.1),
                color: config.color,
                fontWeight: 600,
                fontSize: '0.75rem',
                height: '26px',
                '& .MuiChip-label': { px: 1, py: 0 },
                '& .MuiChip-icon': { fontSize: '14px', ml: 0.8 }
            }}
        />
    );
});
StatusChip.displayName = 'StatusChip';

/* ── Expandable Row Component ────────────────────────────────────────────── */
const ExpandableRow = memo(({ log }) => {
    const [open, setOpen] = useState(false);
    const { showSnackbar } = useGlobalSnackbar();

    const handleCopyJson = useCallback(async () => {
        try {
            await navigator.clipboard.writeText(JSON.stringify(log.payload, null, 2));
            showSnackbar('JSON copied to clipboard', 'success');
        } catch (err) {
            showSnackbar('Failed to copy JSON', 'error');
        }
    }, [log.payload, showSnackbar]);

    return (
        <React.Fragment>
            <TableRow sx={{ '& > *': { borderBottom: 'unset' }, '&:hover': { bgcolor: alpha(PALETTE.TEAL, 0.02) } }}>
                <TableCell padding="checkbox" sx={{ pl: 2.5, py: 1.5 }}>
                    <IconButton 
                        size="small" 
                        onClick={() => setOpen(!open)}
                        sx={{ color: PALETTE.GRAY, '&:hover': { color: PALETTE.TEAL, bgcolor: alpha(PALETTE.TEAL, 0.08) } }}
                    >
                        {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </IconButton>
                </TableCell>
                <TableCell sx={{ py: 1.5 }}>
                    <Typography variant="body2" sx={{ fontSize: '0.82rem', color: PALETTE.TEXT }}>
                        {formatDateTime(log.created_at)}
                    </Typography>
                </TableCell>
                <TableCell sx={{ py: 1.5 }}>
                    <Typography variant="body2" sx={{ fontSize: '0.82rem', fontWeight: 500, color: PALETTE.TEXT }}>
                        {log.payload?.customer_phone_number || '—'}
                    </Typography>
                </TableCell>
                <TableCell sx={{ py: 1.5 }}>
                    <Typography variant="body2" sx={{ fontSize: '0.82rem', fontFamily: 'monospace', color: PALETTE.TEXT }}>
                        {log.payload?.tracking_number || '—'}
                    </Typography>
                </TableCell>
                <TableCell sx={{ py: 1.5 }}>
                    <StatusChip answered={log.payload?.answered} />
                </TableCell>
            </TableRow>
            <TableRow>
                <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={5}>
                    <Collapse in={open} timeout="auto" unmountOnExit>
                        <Box sx={{ m: 2, p: 2, bgcolor: alpha(PALETTE.TEAL, 0.03), borderRadius: '8px', border: `1px solid ${alpha(PALETTE.TEAL, 0.12)}` }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Info size={16} color={PALETTE.TEAL} />
                                    <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.85rem', color: PALETTE.TEXT }}>
                                        Full JSON Payload
                                    </Typography>
                                </Box>
                                <Tooltip title="Copy JSON">
                                    <IconButton 
                                        size="small" 
                                        onClick={handleCopyJson}
                                        sx={{ color: PALETTE.TEAL, '&:hover': { bgcolor: alpha(PALETTE.TEAL, 0.1) } }}
                                    >
                                        <Copy size={14} />
                                    </IconButton>
                                </Tooltip>
                            </Box>
                            <Paper 
                                variant="outlined" 
                                sx={{ 
                                    p: 1.5, 
                                    bgcolor: alpha(PALETTE.TEXT, 0.02), 
                                    maxHeight: '300px', 
                                    overflow: 'auto',
                                    borderColor: alpha(PALETTE.TEAL, 0.15)
                                }}
                            >
                                <pre style={{ margin: 0, fontSize: '11px', fontFamily: 'monospace', color: PALETTE.TEXT }}>
                                    {JSON.stringify(log.payload, null, 2)}
                                </pre>
                            </Paper>
                        </Box>
                    </Collapse>
                </TableCell>
            </TableRow>
        </React.Fragment>
    );
});
ExpandableRow.displayName = 'ExpandableRow';

/* ── Empty State Component ───────────────────────────────────────────────── */
const EmptyState = memo(() => (
    <TableRow>
        <TableCell colSpan={5} align="center" sx={{ py: 8 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5 }}>
                <PhoneIcon size={48} color={alpha(PALETTE.TEXT, 0.2)} />
                <Typography variant="body2" sx={{ color: PALETTE.TEXT, opacity: 0.5, fontSize: '0.85rem', fontWeight: 500 }}>
                    No events captured yet
                </Typography>
                <Typography variant="caption" sx={{ color: PALETTE.GRAY, fontSize: '0.78rem' }}>
                    Make a test call to see data here
                </Typography>
            </Box>
        </TableCell>
    </TableRow>
));
EmptyState.displayName = 'EmptyState';

/* ── Loading Skeleton ────────────────────────────────────────────────────── */
const LoadingSkeleton = memo(() => (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 12 }}>
        <CircularProgress size={32} sx={{ color: PALETTE.TEAL }} />
    </Box>
));
LoadingSkeleton.displayName = 'LoadingSkeleton';

/* ── Main Component ──────────────────────────────────────────────────────── */
export default function Callrail() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const { showSnackbar } = useGlobalSnackbar();

    const webhookUrl = `${import.meta.env.VITE_API_URL}/callrail/webhook/`;

    const fetchLogs = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await callrailApi.getLogs();
            setLogs(Array.isArray(data) ? data : []);
        } catch (err) {
            setError(err.message || 'Failed to fetch call logs');
            showSnackbar('Failed to fetch call logs', 'error');
        } finally {
            setLoading(false);
        }
    }, [showSnackbar]);

    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    const copyWebhookUrl = useCallback(async () => {
        try {
            await navigator.clipboard.writeText(webhookUrl);
            showSnackbar('Webhook URL copied to clipboard', 'success');
        } catch (err) {
            showSnackbar('Failed to copy URL', 'error');
        }
    }, [webhookUrl, showSnackbar]);

    const handlePageChange = (_, newPage) => setPage(newPage);
    const handleRowsPerPageChange = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    // Paginate logs
    const paginatedLogs = logs.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

    if (loading && logs.length === 0) {
        return <LoadingSkeleton />;
    }

    return (
        <Box>
            <Helmet>
                <title>CallRail Webhook Inspector | Sterling Septic & Plumbing LLC</title>
                <meta name="description" content="Capture and analyze CallRail post-call events" />
            </Helmet>

            {/* ── Page Header ─────────────────────────────────────────────── */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
                <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
                        <Typography sx={{ fontWeight: 600, fontSize: '1rem', color: PALETTE.TEXT, letterSpacing: '-0.01em' }}>
                            CallRail Webhook Inspector
                        </Typography>
                    </Box>
                    <Typography variant="body2" sx={{ color: PALETTE.GRAY, fontSize: '0.8rem' }}>
                        Capture and analyze post-call events to verify payload information
                    </Typography>
                </Box>
            </Box>

            {/* ── Webhook Configuration Card ───────────────────────────────── */}
            <Paper 
                elevation={0} 
                sx={{ 
                    mb: 4, 
                    borderRadius: '6px', 
                    overflow: 'hidden',
                    border: `1px solid ${alpha(PALETTE.TEAL, 0.15)}`,
                    bgcolor: 'white'
                }}
            >
                <Box sx={{ 
                    p: 1.5, 
                    bgcolor: alpha(PALETTE.TEAL, 0.04), 
                    borderBottom: `1px solid ${alpha(PALETTE.TEAL, 0.1)}`,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1
                }}>
                    <Box sx={{ 
                        width: 28, 
                        height: 28, 
                        borderRadius: '6px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        bgcolor: alpha(PALETTE.TEAL, 0.1)
                    }}>
                        <Info size={14} color={PALETTE.TEAL} />
                    </Box>
                    <Typography sx={{ fontSize: '0.85rem', fontWeight: 600, color: PALETTE.TEXT }}>
                        Webhook Configuration
                    </Typography>
                </Box>
                <Box sx={{ p: 1.5 }}>
                    <Typography variant="body2" sx={{ fontSize: '0.78rem', color: PALETTE.GRAY, mb: 1.5 }}>
                        Use this URL in your CallRail settings (<strong>Settings → Integrations → Webhooks</strong>) for the <strong>Post-Call</strong> event.
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                        <Paper 
                            variant="outlined" 
                            sx={{ 
                                p: 1, 
                                flexGrow: 1, 
                                bgcolor: alpha(PALETTE.TEXT, 0.02),
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                borderRadius: '6px',
                                borderColor: alpha(PALETTE.TEAL, 0.2)
                            }}
                        >
                            <Typography variant="body2" sx={{ fontSize: '0.78rem', fontFamily: 'monospace', color: PALETTE.TEXT, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {webhookUrl}
                            </Typography>
                            <Tooltip title="Copy webhook URL">
                                <IconButton 
                                    size="small" 
                                    onClick={copyWebhookUrl}
                                    sx={{ color: PALETTE.TEAL, '&:hover': { bgcolor: alpha(PALETTE.TEAL, 0.08) } }}
                                >
                                    <Copy size={14} />
                                </IconButton>
                            </Tooltip>
                        </Paper>
                    </Box>
                </Box>
            </Paper>

            {/* ── Error Alert ───────────────────────────────────────────────── */}
            {error && (
                <Alert 
                    severity="error" 
                    sx={{ 
                        mb: 4, 
                        borderRadius: '6px',
                        '& .MuiAlert-message': { fontSize: '0.82rem' }
                    }}
                    onClose={() => setError(null)}
                >
                    {error}
                </Alert>
            )}

            {/* ── Captured Events Section ───────────────────────────────────── */}
            <Paper elevation={0} sx={{ borderRadius: '6px', overflow: 'hidden', border: `1px solid ${alpha(PALETTE.TEAL, 0.15)}` }}>
                <Box sx={{ 
                    p: 1.5, 
                    bgcolor: 'white', 
                    borderBottom: `1px solid ${alpha(PALETTE.TEAL, 0.1)}`,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography sx={{ fontSize: '0.85rem', fontWeight: 600, color: PALETTE.TEXT }}>
                            Captured Events
                        </Typography>
                        <Chip 
                            size="small" 
                            label={logs.length}
                            sx={{ 
                                bgcolor: alpha(PALETTE.TEAL, 0.08), 
                                color: PALETTE.TEXT, 
                                fontSize: '0.7rem', 
                                fontWeight: 500, 
                                height: '22px',
                                '& .MuiChip-label': { px: 1 }
                            }} 
                        />
                        {loading && <CircularProgress size={14} sx={{ color: PALETTE.TEAL, ml: 1 }} />}
                    </Box>
                </Box>

                <TableContainer sx={{ overflowX: 'auto' }}>
                    <Table size="small">
                        <TableHead>
                            <TableRow sx={{ bgcolor: alpha(PALETTE.TEAL, 0.04) }}>
                                <TableCell padding="checkbox" sx={{ width: 48, pl: 2.5 }} />
                                <TableCell sx={{ color: PALETTE.TEXT, fontSize: '0.78rem', fontWeight: 600, py: 1.5, whiteSpace: 'nowrap' }}>
                                    Timestamp
                                </TableCell>
                                <TableCell sx={{ color: PALETTE.TEXT, fontSize: '0.78rem', fontWeight: 600, py: 1.5, whiteSpace: 'nowrap' }}>
                                    Customer Number
                                </TableCell>
                                <TableCell sx={{ color: PALETTE.TEXT, fontSize: '0.78rem', fontWeight: 600, py: 1.5, whiteSpace: 'nowrap' }}>
                                    Tracking Number
                                </TableCell>
                                <TableCell sx={{ color: PALETTE.TEXT, fontSize: '0.78rem', fontWeight: 600, py: 1.5, whiteSpace: 'nowrap' }}>
                                    Status
                                </TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {logs.length === 0 ? (
                                <EmptyState />
                            ) : (
                                paginatedLogs.map((log) => (
                                    <ExpandableRow key={log.id} log={log} />
                                ))
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>

                {logs.length > 0 && (
                    <TablePagination
                        rowsPerPageOptions={[5, 10, 25, 50]}
                        component="div"
                        count={logs.length}
                        rowsPerPage={rowsPerPage}
                        page={page}
                        onPageChange={handlePageChange}
                        onRowsPerPageChange={handleRowsPerPageChange}
                        SelectProps={{ MenuProps: { disableScrollLock: true } }}
                        sx={{ 
                            borderTop: `1px solid ${alpha(PALETTE.TEAL, 0.1)}`,
                            '& .MuiTablePagination-toolbar': { minHeight: '44px' },
                            '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': { fontSize: '0.78rem', color: PALETTE.GRAY }
                        }}
                    />
                )}
            </Paper>
        </Box>
    );
}