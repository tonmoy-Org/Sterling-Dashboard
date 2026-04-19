import React, { useMemo, useState, useCallback, memo } from 'react';
import { format } from 'date-fns';
import {
    Box,
    Typography,
    Paper,
    Grid,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Chip,
    TablePagination,
    Button,
    IconButton,
    Tooltip,
    Modal,
    Checkbox,
    Stack,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
    Users,
    History,
    Trash2,
    RotateCcw,
    AlertCircle,
    X,
    Search,
    PhoneCall,
    TrendingUp,
} from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { useAuth } from '../../../../auth/AuthProvider';
import { dispatchKpiApi } from '../../../../api/services/dispatchKpi';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import DashboardLoader from '../../../../components/Loader/DashboardLoader';
import RefreshButton from '../../../../components/ui/RefreshButton';
import CommonDialog from '../../../../components/ui/CommonDialog';
import { rmeApi } from '../../../../api/services/rmeApi';

// ─── Replace local snack state with the global snackbar hook ───────────────────
import { useGlobalSnackbar } from '../../../../context/GlobalSnackbarContext';

// ─── Colour tokens ─────────────────────────────────────────────────────────────
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

// ─── Static dispatcher list ────────────────────────────────────────────────────
const dispatchers = [
    { id: 'cameron', name: 'Cameron', role: 'Dispatcher' },
    { id: 'eric',    name: 'Eric',    role: 'Dispatcher' },
];

// ─── Helpers ───────────────────────────────────────────────────────────────────
const formatDateTimeWithTZ = (dateString) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    return isNaN(date) ? '—' : format(date, 'MM/dd/yyyy hh:mm a');
};

const transformRecord = (raw) => ({
    id:              raw.id,
    date:            raw.date ? formatDateTimeWithTZ(raw.date) : '—',
    cameronBooked:   raw.cameron_booked    ?? 0,
    cameronTotal:    raw.cameron_total     ?? 0,
    ericBooked:      raw.eric_booked       ?? 0,
    ericTotal:       raw.eric_total        ?? 0,
    totalJobsBooked: raw.total_jobs_booked ?? 0,
    all_leads:       raw.all_leads         ?? 0,
    isDeleted:       raw.is_deleted        ?? false,
    deletedBy:       raw.deleted_by        ?? null,
    deletedByEmail:  raw.deleted_by_email  ?? null,
    deletedDate:     raw.deleted_date      ?? null,
});

// ─── React-Query cache helpers ─────────────────────────────────────────────────
const updateCacheItem = (queryClient, id, updates) => {
    queryClient.setQueryData(['dispatcher-booked'], (old = []) =>
        old.map(item => item.id === id ? { ...item, ...updates } : item)
    );
};

const removeCacheItem = (queryClient, id) => {
    queryClient.setQueryData(['dispatcher-booked'], (old = []) =>
        old.filter(item => item.id !== id)
    );
};

const removeCacheItems = (queryClient, ids) => {
    queryClient.setQueryData(['dispatcher-booked'], (old = []) =>
        old.filter(item => !ids.includes(item.id))
    );
};

// ─── Shared search bar ─────────────────────────────────────────────────────────
const TableSearchBar = memo(({ value, onChange, color, placeholder = 'Search…' }) => (
    <Box sx={{ position: 'relative', minWidth: 220 }}>
        <Box sx={{
            position: 'absolute', left: 10, top: '50%',
            transform: 'translateY(-50%)', display: 'flex',
            alignItems: 'center', pointerEvents: 'none', zIndex: 1,
        }}>
            <Search size={13} color={alpha(color, 0.55)} />
        </Box>
        <input
            type="text"
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder={placeholder}
            style={{
                width: '100%',
                padding: '5px 30px',
                borderRadius: '6px',
                border: `1.5px solid ${alpha(color, 0.2)}`,
                fontSize: '0.78rem',
                outline: 'none',
                background: 'white',
                color: PALETTE.TEXT,
                boxSizing: 'border-box',
                transition: 'border-color 0.15s, box-shadow 0.15s',
            }}
            onFocus={e => {
                e.target.style.borderColor = color;
                e.target.style.boxShadow = `0 0 0 3px ${alpha(color, 0.1)}`;
            }}
            onBlur={e => {
                e.target.style.borderColor = alpha(color, 0.2);
                e.target.style.boxShadow = 'none';
            }}
        />
        {value && (
            <IconButton
                size="small"
                onClick={() => onChange('')}
                sx={{
                    position: 'absolute', right: 4, top: '50%',
                    transform: 'translateY(-50%)', padding: '2px',
                    color: PALETTE.GRAY, '&:hover': { color },
                }}
            >
                <X size={12} />
            </IconButton>
        )}
    </Box>
));
TableSearchBar.displayName = 'TableSearchBar';

// ─── Permanent-delete confirmation dialog ──────────────────────────────────────
const PermanentDeleteDialog = memo(({ open, onClose, onConfirm, isBulk, item, count }) => {
    const [loading, setLoading] = useState(false);

    const handleConfirm = useCallback(async () => {
        setLoading(true);
        await onConfirm();
        setLoading(false);
        onClose();
    }, [onConfirm, onClose]);

    return (
        <CommonDialog
            open={open} onClose={onClose} onConfirm={handleConfirm}
            title="Delete Permanently" variant="danger" confirmText="Delete Permanently"
            isLoading={loading} icon={<Trash2 size={18} />}
        >
            <Typography variant="body2" sx={{ color: PALETTE.TEXT, fontSize: '0.85rem', lineHeight: 1.6, mb: 2 }}>
                {isBulk ? (
                    <>Are you sure you want to permanently delete <Box component="strong" sx={{ color: PALETTE.RED }}>{count} item(s)</Box> from the recycle bin?</>
                ) : (
                    <>Are you sure you want to permanently delete the dispatch record for <Box component="strong">{item?.date || 'N/A'}</Box>?</>
                )}
            </Typography>
            <Box sx={{ p: 1.5, borderRadius: '8px', backgroundColor: alpha(PALETTE.RED, 0.05), border: `1px solid ${alpha(PALETTE.RED, 0.12)}`, display: 'flex', alignItems: 'flex-start', gap: 1.25 }}>
                <AlertCircle size={17} color={PALETTE.RED} style={{ flexShrink: 0, marginTop: 1 }} />
                <Box>
                    <Typography variant="body2" sx={{ color: PALETTE.RED, fontSize: '0.82rem', fontWeight: 600, mb: 0.25 }}>Warning — cannot be undone</Typography>
                    <Typography variant="caption" sx={{ color: PALETTE.TEXT, fontSize: '0.78rem', opacity: 0.75 }}>This data will be permanently erased and cannot be recovered.</Typography>
                </Box>
            </Box>
        </CommonDialog>
    );
});
PermanentDeleteDialog.displayName = 'PermanentDeleteDialog';

// ─── Move-to-bin confirmation dialog ──────────────────────────────────────────
const MoveToBinDialog = memo(({ open, onClose, onConfirm, isBulk, item, count }) => (
    <CommonDialog
        open={open} onClose={onClose} onConfirm={onConfirm}
        title="Move to Recycle Bin" variant="warning" confirmText="Move to Bin"
        icon={<Trash2 size={18} />}
    >
        <Typography variant="body2" sx={{ color: PALETTE.TEXT, fontSize: '0.85rem', lineHeight: 1.6, mb: 2 }}>
            {isBulk ? (
                <>Are you sure you want to move <Box component="strong" sx={{ color: PALETTE.ORANGE }}>{count} item(s)</Box> to the Recycle Bin?</>
            ) : (
                <>Are you sure you want to move the dispatch record for <Box component="strong">{item?.date}</Box> to the Recycle Bin?</>
            )}
        </Typography>
        <Box sx={{ p: 1.5, borderRadius: '8px', bgcolor: alpha(PALETTE.ORANGE, 0.05), border: `1px solid ${alpha(PALETTE.ORANGE, 0.12)}`, display: 'flex', alignItems: 'flex-start', gap: 1 }}>
            <AlertCircle size={15} color={PALETTE.ORANGE} style={{ flexShrink: 0, marginTop: 1 }} />
            <Typography variant="caption" sx={{ color: PALETTE.ORANGE, fontSize: '0.78rem', fontWeight: 500 }}>
                Items moved to Recycle Bin can be restored later.
            </Typography>
        </Box>
    </CommonDialog>
));
MoveToBinDialog.displayName = 'MoveToBinDialog';

// ─── Recycle-bin modal ─────────────────────────────────────────────────────────
const RecycleBinModal = memo(({
    open, onClose, items,
    onRestore, onBulkRestore,
    onPermanentDelete, onBulkPermanentDelete,
}) => {
    const [search,          setSearch]          = useState('');
    const [page,            setPage]            = useState(0);
    const [rowsPerPage,     setRowsPerPage]     = useState(10);
    const [selectedIds,     setSelectedIds]     = useState(new Set());
    const [permDeleteModal, setPermDeleteModal] = useState({ open: false, item: null, isBulk: false });

    const filteredItems = useMemo(() => {
        if (!search.trim()) return items;
        const lq = search.toLowerCase();
        return items.filter(item =>
            item.date.toLowerCase().includes(lq) ||
            item.deletedBy?.toLowerCase().includes(lq) ||
            item.deletedByEmail?.toLowerCase().includes(lq)
        );
    }, [items, search]);

    const pageItems = useMemo(() => {
        const start = page * rowsPerPage;
        return filteredItems.slice(start, start + rowsPerPage);
    }, [filteredItems, page, rowsPerPage]);

    const allOnPage  = pageItems.length > 0 && pageItems.every(i => selectedIds.has(i.id));
    const someOnPage = pageItems.length > 0 && pageItems.some(i => selectedIds.has(i.id)) && !allOnPage;

    const toggleOne = (id) => setSelectedIds(prev => {
        const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s;
    });
    const toggleAll = () => {
        if (allOnPage) {
            setSelectedIds(prev => { const s = new Set(prev); pageItems.forEach(i => s.delete(i.id)); return s; });
        } else {
            setSelectedIds(prev => { const s = new Set(prev); pageItems.forEach(i => s.add(i.id)); return s; });
        }
    };

    const handleSingleRestore = (item) => {
        onRestore(item);
        setSelectedIds(prev => { const s = new Set(prev); s.delete(item.id); return s; });
    };
    const handleBulkRestore = () => {
        const toRestore = items.filter(i => selectedIds.has(i.id));
        if (toRestore.length > 0) { onBulkRestore(toRestore); setSelectedIds(new Set()); }
    };

    // Reset to first page whenever the search query changes
    React.useEffect(() => { setPage(0); }, [search]);

    return (
        <>
            <Modal open={open} onClose={onClose} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Box sx={{
                    width: '95%', maxWidth: 1400, maxHeight: '90vh',
                    bgcolor: 'white', borderRadius: '8px',
                    boxShadow: '0 25px 60px rgba(0,0,0,0.15)',
                    overflow: 'hidden', display: 'flex', flexDirection: 'column',
                }}>
                    {/* ── Header ─────────────────────────────────────────────── */}
                    <Box sx={{
                        p: 2,
                        borderBottom: `1px solid ${alpha(PALETTE.PURPLE, 0.12)}`,
                        background: `linear-gradient(135deg, ${alpha(PALETTE.PURPLE, 0.06)} 0%, ${alpha(PALETTE.PURPLE, 0.02)} 100%)`,
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Box sx={{
                                width: 42, height: 42, borderRadius: '10px',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                background: `linear-gradient(135deg, ${alpha(PALETTE.PURPLE, 0.15)} 0%, ${alpha(PALETTE.PURPLE, 0.08)} 100%)`,
                                color: PALETTE.PURPLE,
                                border: `1px solid ${alpha(PALETTE.PURPLE, 0.15)}`,
                            }}>
                                <History size={20} />
                            </Box>
                            <Box>
                                <Typography sx={{ fontSize: '1rem', fontWeight: 700, color: PALETTE.TEXT, letterSpacing: '-0.01em' }}>
                                    Recycle Bin
                                </Typography>
                                <Typography variant="body2" sx={{ fontSize: '0.78rem', color: PALETTE.GRAY }}>
                                    {items.length} deleted item(s) · Restore or permanently delete
                                </Typography>
                            </Box>
                        </Box>
                        <IconButton size="small" onClick={onClose} sx={{ color: PALETTE.GRAY, borderRadius: '8px', '&:hover': { bgcolor: alpha(PALETTE.GRAY, 0.1), color: PALETTE.TEXT } }}>
                            <X size={18} />
                        </IconButton>
                    </Box>

                    {/* ── Toolbar (select-all + search + bulk actions) ─────── */}
                    <Box sx={{
                        px: 2, py: 1.25,
                        borderBottom: `1px solid ${alpha(PALETTE.PURPLE, 0.08)}`,
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        gap: 2, bgcolor: '#fafbfc',
                    }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Checkbox
                                size="small"
                                checked={allOnPage}
                                indeterminate={someOnPage}
                                onChange={toggleAll}
                                sx={{
                                    padding: '4px',
                                    color: alpha(PALETTE.PURPLE, 0.4),
                                    '&.Mui-checked': { color: PALETTE.PURPLE },
                                    '&.MuiCheckbox-indeterminate': { color: PALETTE.PURPLE },
                                }}
                            />
                            <TableSearchBar value={search} onChange={setSearch} color={PALETTE.PURPLE} placeholder="Search deleted items…" />
                        </Box>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                            <Button
                                variant="outlined" size="small"
                                startIcon={<RotateCcw size={13} />}
                                onClick={handleBulkRestore}
                                disabled={selectedIds.size === 0}
                                sx={{
                                    textTransform: 'none', fontSize: '0.78rem', fontWeight: 500,
                                    color: PALETTE.GREEN, borderColor: alpha(PALETTE.GREEN, 0.35),
                                    borderRadius: '6px', px: 1.5,
                                    '&:hover': { borderColor: PALETTE.GREEN, bgcolor: alpha(PALETTE.GREEN, 0.06) },
                                    '&.Mui-disabled': { opacity: 0.45 },
                                }}
                            >
                                Restore ({selectedIds.size})
                            </Button>
                            <Button
                                variant="outlined" size="small"
                                startIcon={<Trash2 size={13} />}
                                onClick={() => setPermDeleteModal({ open: true, item: null, isBulk: true })}
                                disabled={selectedIds.size === 0}
                                sx={{
                                    textTransform: 'none', fontSize: '0.78rem', fontWeight: 500,
                                    color: PALETTE.RED, borderColor: alpha(PALETTE.RED, 0.35),
                                    borderRadius: '6px', px: 1.5,
                                    '&:hover': { borderColor: PALETTE.RED, bgcolor: alpha(PALETTE.RED, 0.06) },
                                    '&.Mui-disabled': { opacity: 0.45 },
                                }}
                            >
                                Delete ({selectedIds.size})
                            </Button>
                        </Box>
                    </Box>

                    {/* ── Table body ──────────────────────────────────────────── */}
                    <Box sx={{
                        flex: 1, overflowY: 'auto', overflowX: 'hidden',
                        scrollbarWidth: 'thin',
                        '&::-webkit-scrollbar': { width: '4px' },
                        '&::-webkit-scrollbar-thumb': { background: alpha(PALETTE.PURPLE, 0.2), borderRadius: '4px' },
                    }}>
                        {items.length === 0 ? (
                            <Box sx={{ textAlign: 'center', py: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                                <History size={48} color={alpha(PALETTE.GRAY, 0.3)} />
                                <Typography variant="body2" sx={{ mt: 2, color: PALETTE.GRAY, fontSize: '0.9rem' }}>
                                    {search ? 'No matching deleted items found' : 'No deleted items in recycle bin'}
                                </Typography>
                                <Typography variant="caption" sx={{ color: PALETTE.GRAY, fontSize: '0.8rem' }}>
                                    {search ? 'Try a different search term' : 'Deleted items will appear here'}
                                </Typography>
                            </Box>
                        ) : (
                            <TableContainer sx={{
                                overflowX: 'auto',
                                '&::-webkit-scrollbar': { height: '4px' },
                                '&::-webkit-scrollbar-thumb': { background: alpha(PALETTE.PURPLE, 0.2), borderRadius: '4px' },
                            }}>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow sx={{
                                            bgcolor: alpha(PALETTE.PURPLE, 0.03),
                                            '& th': {
                                                borderBottom: `2px solid ${alpha(PALETTE.PURPLE, 0.1)}`,
                                                fontWeight: 600, fontSize: '0.78rem',
                                                color: PALETTE.TEXT, py: 1.5, px: 1.5, whiteSpace: 'nowrap',
                                            },
                                        }}>
                                            <TableCell padding="checkbox" width={50} />
                                            <TableCell sx={{ minWidth: 175 }}>Date</TableCell>
                                            <TableCell align="center" sx={{ minWidth: 130 }}>Cameron Booked</TableCell>
                                            <TableCell align="center" sx={{ minWidth: 120 }}>Cameron Total</TableCell>
                                            <TableCell align="center" sx={{ minWidth: 105 }}>Cameron %</TableCell>
                                            <TableCell align="center" sx={{ minWidth: 100 }}>Eric Booked</TableCell>
                                            <TableCell align="center" sx={{ minWidth: 90  }}>Eric Total</TableCell>
                                            <TableCell align="center" sx={{ minWidth: 80  }}>Eric %</TableCell>
                                            <TableCell sx={{ minWidth: 140 }}>Deleted By</TableCell>
                                            <TableCell sx={{ minWidth: 175 }}>Deleted At</TableCell>
                                            <TableCell width={120} sx={{ minWidth: 110 }}>Actions</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {pageItems.map(item => {
                                            const isSelected = selectedIds.has(item.id);
                                            const camRatio   = item.cameronTotal
                                                ? ((item.cameronBooked / item.cameronTotal) * 100).toFixed(2) : '0.00';
                                            const ericRatio  = item.ericTotal
                                                ? ((item.ericBooked / item.ericTotal) * 100).toFixed(2) : '0.00';

                                            return (
                                                <TableRow
                                                    key={item.id}
                                                    hover
                                                    sx={{
                                                        bgcolor: isSelected ? alpha(PALETTE.PURPLE, 0.07) : 'white',
                                                        transition: 'background-color 0.15s',
                                                        '&:hover': { backgroundColor: isSelected ? alpha(PALETTE.PURPLE, 0.1) : alpha(PALETTE.PURPLE, 0.03) },
                                                        '&:last-child td': { borderBottom: 'none' },
                                                    }}
                                                >
                                                    <TableCell padding="checkbox">
                                                        <Checkbox size="small" checked={isSelected} onChange={() => toggleOne(item.id)} sx={{ padding: '4px', color: alpha(PALETTE.PURPLE, 0.4), '&.Mui-checked': { color: PALETTE.PURPLE } }} />
                                                    </TableCell>
                                                    <TableCell>
                                                        <Typography variant="body2" sx={{ fontSize: '0.82rem', color: PALETTE.TEXT, fontWeight: 500 }}>
                                                            {item.date}
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell align="center"><Typography variant="body2" sx={{ fontSize: '0.82rem', fontWeight: 500 }}>{item.cameronBooked}</Typography></TableCell>
                                                    <TableCell align="center"><Typography variant="body2" sx={{ fontSize: '0.82rem', fontWeight: 500 }}>{item.cameronTotal}</Typography></TableCell>
                                                    <TableCell align="center">
                                                        <Chip label={`${camRatio}%`} size="small" sx={{ fontSize: '0.75rem', height: '22px', bgcolor: alpha(PALETTE.BLUE, 0.08), color: PALETTE.BLUE, border: `1px solid ${alpha(PALETTE.BLUE, 0.2)}`, '& .MuiChip-label': { px: 1 } }} />
                                                    </TableCell>
                                                    <TableCell align="center"><Typography variant="body2" sx={{ fontSize: '0.82rem', fontWeight: 500 }}>{item.ericBooked}</Typography></TableCell>
                                                    <TableCell align="center"><Typography variant="body2" sx={{ fontSize: '0.82rem', fontWeight: 500 }}>{item.ericTotal}</Typography></TableCell>
                                                    <TableCell align="center">
                                                        <Chip label={`${ericRatio}%`} size="small" sx={{ fontSize: '0.75rem', height: '22px', bgcolor: alpha(PALETTE.GREEN, 0.08), color: PALETTE.GREEN, border: `1px solid ${alpha(PALETTE.GREEN, 0.2)}`, '& .MuiChip-label': { px: 1 } }} />
                                                    </TableCell>
                                                    <TableCell>
                                                        <Typography variant="body2" sx={{ fontSize: '0.82rem', color: PALETTE.TEXT }}>
                                                            {item.deletedBy || 'Unknown'}
                                                        </Typography>
                                                        {item.deletedByEmail && (
                                                            <Typography variant="caption" sx={{ fontSize: '0.75rem', color: PALETTE.GRAY }}>
                                                                {item.deletedByEmail}
                                                            </Typography>
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Typography variant="body2" sx={{ fontSize: '0.82rem', color: PALETTE.TEXT }}>
                                                            {formatDateTimeWithTZ(item.deletedDate)}
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Stack direction="row" spacing={0.25}>
                                                            <Tooltip title="Restore" arrow>
                                                                <IconButton size="small" onClick={() => handleSingleRestore(item)} sx={{ color: PALETTE.GREEN, borderRadius: '6px', p: 0.75, '&:hover': { bgcolor: alpha(PALETTE.GREEN, 0.1) } }}>
                                                                    <RotateCcw size={15} />
                                                                </IconButton>
                                                            </Tooltip>
                                                            <Tooltip title="Delete Permanently" arrow>
                                                                <IconButton size="small" onClick={() => setPermDeleteModal({ open: true, item, isBulk: false })} sx={{ color: PALETTE.RED, borderRadius: '6px', p: 0.75, '&:hover': { bgcolor: alpha(PALETTE.RED, 0.1) } }}>
                                                                    <Trash2 size={15} />
                                                                </IconButton>
                                                            </Tooltip>
                                                        </Stack>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        )}
                    </Box>

                    {/* ── Pagination ──────────────────────────────────────────── */}
                    {items.length > 0 && (
                        <Box sx={{ borderTop: `1px solid ${alpha(PALETTE.PURPLE, 0.08)}`, bgcolor: '#fafbfc' }}>
                            <TablePagination
                                rowsPerPageOptions={[5, 10, 25]}
                                component="div"
                                count={filteredItems.length}
                                rowsPerPage={rowsPerPage}
                                page={Math.min(page, Math.max(0, Math.ceil(filteredItems.length / rowsPerPage) - 1))}
                                onPageChange={(_, p) => setPage(p)}
                                onRowsPerPageChange={e => { setRowsPerPage(+e.target.value); setPage(0); }}
                                SelectProps={{ MenuProps: { disableScrollLock: true } }}
                                sx={{
                                    '& .MuiTablePagination-toolbar': { minHeight: '44px' },
                                    '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': { fontSize: '0.78rem', color: PALETTE.GRAY },
                                }}
                            />
                        </Box>
                    )}
                </Box>
            </Modal>

            {/* Permanent-delete dialog lives outside the scrollable Modal */}
            <PermanentDeleteDialog
                open={permDeleteModal.open}
                onClose={() => setPermDeleteModal(p => ({ ...p, open: false }))}
                onConfirm={async () => {
                    if (permDeleteModal.isBulk) await onBulkPermanentDelete(items.filter(i => selectedIds.has(i.id)));
                    else await onPermanentDelete(permDeleteModal.item);
                    setSelectedIds(new Set());
                }}
                isBulk={permDeleteModal.isBulk}
                item={permDeleteModal.item}
                count={selectedIds.size}
            />
        </>
    );
});
RecycleBinModal.displayName = 'RecycleBinModal';

// ─── Main page component ───────────────────────────────────────────────────────
export default function DispatchKpi() {
    const { user }       = useAuth();
    const queryClient    = useQueryClient();

    // ── Use the global snackbar instead of managing local state ──────────────
    const { showSnackbar } = useGlobalSnackbar();

    const [page,            setPage]            = useState(0);
    const [rowsPerPage,     setRowsPerPage]     = useState(10);
    const [binOpen,         setBinOpen]         = useState(false);
    const [tableSearch,     setTableSearch]     = useState('');
    const [selectedIds,     setSelectedIds]     = useState(new Set());
    const [moveToBinDialog, setMoveToBinDialog] = useState({ open: false, item: null, isBulk: false });

    // ── Data fetching ─────────────────────────────────────────────────────────
    const { data: serverData = [], isLoading } = useQuery({
        queryKey: ['dispatcher-booked'],
        queryFn: async () => {
            const response = await dispatchKpiApi.getAll();
            const raw = Array.isArray(response.data)
                ? response.data
                : response.data?.results ?? response.data?.data ?? [];
            return raw.map(transformRecord);
        },
        refetchInterval: 10000,
        refetchIntervalInBackground: false,
        refetchOnWindowFocus: true,
        refetchOnMount: true,
        refetchOnReconnect: true,
        staleTime: 0,
    });

    // ── Bulk soft-delete (move to bin) ────────────────────────────────────────
    const bulkSoftDeleteMutation = useMutation({
        mutationFn: async (ids) => {
            await Promise.all(
                ids.map(id =>
                    dispatchKpiApi.patch(id, {
                        is_deleted:       true,
                        deleted_by:       user?.name  || 'Unknown',
                        deleted_by_email: user?.email || '',
                        deleted_date:     new Date().toISOString().split('T')[0],
                    })
                )
            );
            return ids;
        },
        onMutate: async (ids) => {
            await queryClient.cancelQueries({ queryKey: ['dispatcher-booked'] });
            const previous = queryClient.getQueryData(['dispatcher-booked']);
            const meta = {
                isDeleted:      true,
                deletedBy:      user?.name  || 'Unknown',
                deletedByEmail: user?.email || '',
                deletedDate:    new Date().toISOString().split('T')[0],
            };
            ids.forEach(id => updateCacheItem(queryClient, id, meta));
            return { previous };
        },
        onSuccess: (ids) => {
            showSnackbar(`${ids.length} record(s) moved to recycle bin`, 'success');
            setSelectedIds(new Set());
        },
        onError: (err, _, ctx) => {
            if (ctx?.previous) queryClient.setQueryData(['dispatcher-booked'], ctx.previous);
            showSnackbar(err.response?.data?.message || 'Failed to move records to recycle bin', 'error');
        },
        onSettled: () => queryClient.invalidateQueries({ queryKey: ['dispatcher-booked'] }),
    });

    // ── Restore single record ─────────────────────────────────────────────────
    const restoreMutation = useMutation({
        mutationFn: async (id) => {
            const response = await dispatchKpiApi.patch(id, {
                is_deleted:       false,
                deleted_by:       null,
                deleted_by_email: null,
                deleted_date:     null,
            });
            return transformRecord(response.data);
        },
        onMutate: async (id) => {
            await queryClient.cancelQueries({ queryKey: ['dispatcher-booked'] });
            const previous = queryClient.getQueryData(['dispatcher-booked']);
            updateCacheItem(queryClient, id, { isDeleted: false, deletedBy: null, deletedByEmail: null, deletedDate: null });
            return { previous };
        },
        onSuccess: () => showSnackbar('Record restored successfully', 'success'),
        onError: (err, _, ctx) => {
            if (ctx?.previous) queryClient.setQueryData(['dispatcher-booked'], ctx.previous);
            showSnackbar(err.response?.data?.message || 'Failed to restore record', 'error');
        },
        onSettled: () => queryClient.invalidateQueries({ queryKey: ['dispatcher-booked'] }),
    });

    // ── Bulk restore ──────────────────────────────────────────────────────────
    const bulkRestoreMutation = useMutation({
        mutationFn: async (ids) => {
            await Promise.all(
                ids.map(id =>
                    dispatchKpiApi.patch(id, {
                        is_deleted:       false,
                        deleted_by:       null,
                        deleted_by_email: null,
                        deleted_date:     null,
                    })
                )
            );
            return ids;
        },
        onMutate: async (ids) => {
            await queryClient.cancelQueries({ queryKey: ['dispatcher-booked'] });
            const previous = queryClient.getQueryData(['dispatcher-booked']);
            ids.forEach(id =>
                updateCacheItem(queryClient, id, { isDeleted: false, deletedBy: null, deletedByEmail: null, deletedDate: null })
            );
            return { previous };
        },
        onSuccess: (ids) => showSnackbar(`${ids.length} record(s) restored`, 'success'),
        onError: (err, _, ctx) => {
            if (ctx?.previous) queryClient.setQueryData(['dispatcher-booked'], ctx.previous);
            showSnackbar(err.response?.data?.message || 'Failed to restore records', 'error');
        },
        onSettled: () => queryClient.invalidateQueries({ queryKey: ['dispatcher-booked'] }),
    });

    // ── Permanent delete single ───────────────────────────────────────────────
    const permanentDeleteMutation = useMutation({
        mutationFn: async (id) => {
            await dispatchKpiApi.delete(id);
            return id;
        },
        onMutate: async (id) => {
            await queryClient.cancelQueries({ queryKey: ['dispatcher-booked'] });
            const previous = queryClient.getQueryData(['dispatcher-booked']);
            removeCacheItem(queryClient, id);
            return { previous };
        },
        onSuccess: () => showSnackbar('Record permanently deleted', 'success'),
        onError: (err, _, ctx) => {
            if (ctx?.previous) queryClient.setQueryData(['dispatcher-booked'], ctx.previous);
            showSnackbar(err.response?.data?.message || 'Failed to permanently delete record', 'error');
        },
        onSettled: () => queryClient.invalidateQueries({ queryKey: ['dispatcher-booked'] }),
    });

    // ── Bulk permanent delete ─────────────────────────────────────────────────
    const bulkPermanentDeleteMutation = useMutation({
        mutationFn: async (ids) => {
            await Promise.all(ids.map(id => dispatchKpiApi.delete(id)));
            return ids;
        },
        onMutate: async (ids) => {
            await queryClient.cancelQueries({ queryKey: ['dispatcher-booked'] });
            const previous = queryClient.getQueryData(['dispatcher-booked']);
            removeCacheItems(queryClient, ids);
            return { previous };
        },
        onSuccess: (ids) => showSnackbar(`${ids.length} record(s) permanently deleted`, 'success'),
        onError: (err, _, ctx) => {
            if (ctx?.previous) queryClient.setQueryData(['dispatcher-booked'], ctx.previous);
            showSnackbar(err.response?.data?.message || 'Failed to permanently delete records', 'error');
        },
        onSettled: () => queryClient.invalidateQueries({ queryKey: ['dispatcher-booked'] }),
    });

    // ── Derived data ──────────────────────────────────────────────────────────
    const activeData  = useMemo(() => serverData.filter(i => !i.isDeleted), [serverData]);
    const deletedData = useMemo(() => serverData.filter(i =>  i.isDeleted), [serverData]);

    const filteredActive = useMemo(() => {
        if (!tableSearch.trim()) return activeData;
        const lq = tableSearch.toLowerCase();
        return activeData.filter(i => i.date.toLowerCase().includes(lq));
    }, [activeData, tableSearch]);

    const paginatedData = useMemo(() => {
        const start = page * rowsPerPage;
        return filteredActive.slice(start, start + rowsPerPage);
    }, [filteredActive, page, rowsPerPage]);

    // ── Aggregate KPI calculations ────────────────────────────────────────────
    const kpiData = useMemo(() => {
        const totalAllLeads   = activeData.reduce((s, r) => s + (r.all_leads       ?? 0), 0);
        const totalJobsBooked = activeData.reduce((s, r) => s + (r.totalJobsBooked ?? 0), 0);
        const remainingLeads  = totalAllLeads - totalJobsBooked;
        const callPickupRatio = totalAllLeads > 0
            ? ((totalJobsBooked / totalAllLeads) * 100).toFixed(2)
            : '0.00';

        const calc = (dispId) => {
            const totalBooked = activeData.reduce((s, r) =>
                s + (dispId === 'cameron' ? r.cameronBooked : r.ericBooked), 0);
            const total = activeData.reduce((s, r) =>
                s + (dispId === 'cameron' ? r.cameronTotal  : r.ericTotal),  0);
            const bookingRatio = total > 0
                ? ((totalBooked / total) * 100).toFixed(2)
                : '0.00';
            return { totalBooked, total, bookingRatio };
        };

        return {
            cameron: calc('cameron'),
            eric:    calc('eric'),
            totalAllLeads,
            totalJobsBooked,
            remainingLeads,
            callPickupRatio,
        };
    }, [activeData]);

    // ── Table selection helpers ───────────────────────────────────────────────
    const pgIds      = useMemo(() => new Set(paginatedData.map(i => i.id)), [paginatedData]);
    const allOnPage  = paginatedData.length > 0 && paginatedData.every(i => selectedIds.has(i.id));
    const someOnPage = paginatedData.length > 0 && paginatedData.some(i => selectedIds.has(i.id)) && !allOnPage;

    const toggleOne = useCallback((id) => {
        setSelectedIds(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
    }, []);

    const toggleAll = useCallback(() => {
        if (allOnPage) {
            setSelectedIds(prev => { const s = new Set(prev); pgIds.forEach(id => s.delete(id)); return s; });
        } else {
            setSelectedIds(prev => { const s = new Set(prev); pgIds.forEach(id => s.add(id)); return s; });
        }
    }, [allOnPage, pgIds]);

    // ── Action handlers ───────────────────────────────────────────────────────
    const handleSingleMoveToBin = useCallback((item) => setMoveToBinDialog({ open: true, item, isBulk: false }), []);
    const handleBulkMoveToBin   = useCallback(()       => setMoveToBinDialog({ open: true, item: null, isBulk: true }), []);

    const confirmMoveToBin = useCallback(() => {
        if (moveToBinDialog.isBulk) {
            bulkSoftDeleteMutation.mutate([...selectedIds]);
        } else {
            bulkSoftDeleteMutation.mutate([moveToBinDialog.item.id]);
        }
        setMoveToBinDialog(p => ({ ...p, open: false }));
    }, [moveToBinDialog, selectedIds, bulkSoftDeleteMutation]);

    const handleRestore             = useCallback((item)  => restoreMutation.mutate(item.id),                   [restoreMutation]);
    const handleBulkRestore         = useCallback((items) => bulkRestoreMutation.mutate(items.map(i => i.id)),   [bulkRestoreMutation]);
    const handlePermanentDelete     = useCallback((item)  => permanentDeleteMutation.mutate(item.id),            [permanentDeleteMutation]);
    const handleBulkPermanentDelete = useCallback((items) => bulkPermanentDeleteMutation.mutate(items.map(i => i.id)), [bulkPermanentDeleteMutation]);

    // Reset table to first page when search changes
    React.useEffect(() => { setPage(0); }, [tableSearch]);

    if (isLoading) return <DashboardLoader />;

    return (
        <Box>
            <Helmet>
                <title>Dispatch KPI | Sterling Septic & Plumbing LLC</title>
                <meta name="description" content="Track dispatcher performance metrics including booking ratios and call pickup rates" />
            </Helmet>

            {/* ── Page header ─────────────────────────────────────────────── */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
                <Box>
                    <Typography sx={{ fontWeight: 600, mb: 0.5, fontSize: '1rem', color: PALETTE.TEXT, letterSpacing: '-0.01em' }}>
                        Dispatch KPI Dashboard
                    </Typography>
                    <Typography variant="body2" sx={{ color: PALETTE.GRAY, fontSize: '0.8rem' }}>
                        Performance tracking for Dispatchers · Cameron & Eric
                    </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <RefreshButton onRefresh={rmeApi.startDispatcherBookedScraping} />
                    <Button
                        variant="outlined" size="small"
                        startIcon={<History size={15} />}
                        onClick={() => setBinOpen(true)}
                        sx={{
                            textTransform: 'none', fontSize: '0.8rem', fontWeight: 500,
                            height: '34px', px: 1.75,
                            color: PALETTE.PURPLE, borderColor: alpha(PALETTE.PURPLE, 0.35),
                            borderRadius: '6px',
                            '&:hover': { borderColor: PALETTE.PURPLE, bgcolor: alpha(PALETTE.PURPLE, 0.05) },
                        }}
                    >
                        Recycle Bin ({deletedData.length})
                    </Button>
                </Box>
            </Box>

            {/* ── Per-dispatcher KPI cards ─────────────────────────────────── */}
            <Grid container spacing={3} sx={{ mb: 3 }}>
                {(['cameron', 'eric']).map(dispId => {
                    const disp  = dispatchers.find(d => d.id === dispId);
                    const stats = kpiData[dispId];
                    return (
                        <Grid size={{ xs: 12, md: 6 }} key={dispId}>
                            <Paper elevation={0} sx={{
                                border: `1px solid ${alpha(PALETTE.BLUE, 0.12)}`,
                                borderRadius: '6px', overflow: 'hidden', height: '100%',
                                transition: 'box-shadow 0.2s',
                                '&:hover': { boxShadow: `0 4px 16px ${alpha(PALETTE.BLUE, 0.08)}` },
                            }}>
                                <Box sx={{ p: 3 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                                        <Box sx={{ width: 40, height: 40, borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: alpha(PALETTE.BLUE, 0.08) }}>
                                            <Users size={20} color={PALETTE.BLUE} />
                                        </Box>
                                        <Box>
                                            <Typography sx={{ fontSize: '1rem', fontWeight: 600, color: PALETTE.TEXT }}>
                                                {disp?.name}
                                            </Typography>
                                            <Typography variant="body2" sx={{ color: PALETTE.GRAY, fontSize: '0.75rem' }}>
                                                {disp?.role}
                                            </Typography>
                                        </Box>
                                    </Box>

                                    <Grid container spacing={2}>
                                        {[
                                            { label: 'Booking Ratio',      value: `${stats.bookingRatio}%`, color: PALETTE.GREEN, hint: `${stats.totalBooked} Booked ÷ ${stats.total} Total × 100` },
                                            { label: 'Total Booked',       value: stats.totalBooked,        color: PALETTE.TEXT,  hint: 'Jobs booked this period' },
                                            { label: 'Total (B + Non-B)',  value: stats.total,              color: PALETTE.TEXT,  hint: 'Booked + Non-Booked' },
                                        ].map(({ label, value, color, hint }) => (
                                            <Grid size={{ xs: 12, sm: 4 }} key={label}>
                                                <Tooltip title={hint} placement="top" arrow>
                                                    <Box sx={{
                                                        p: 1.5, borderRadius: '8px',
                                                        border: `1px solid ${alpha(PALETTE.BLUE, 0.08)}`,
                                                        bgcolor: alpha(PALETTE.BLUE, 0.02),
                                                        cursor: 'default',
                                                    }}>
                                                        <Typography variant="caption" sx={{ color: PALETTE.GRAY, fontSize: '0.72rem', display: 'block', mb: 0.5 }}>
                                                            {label}
                                                        </Typography>
                                                        <Typography sx={{ fontWeight: 700, color, fontSize: '1.6rem', lineHeight: 1.1 }}>
                                                            {value}
                                                        </Typography>
                                                    </Box>
                                                </Tooltip>
                                            </Grid>
                                        ))}
                                    </Grid>

                                    <Box sx={{ mt: 2, px: 1.5, py: 1, borderRadius: '6px', bgcolor: alpha(PALETTE.GREEN, 0.04), border: `1px dashed ${alpha(PALETTE.GREEN, 0.2)}` }}>
                                        <Typography variant="caption" sx={{ color: PALETTE.GRAY, fontSize: '0.73rem' }}>
                                            <Box component="span" sx={{ fontWeight: 600, color: PALETTE.GREEN }}>Booking Ratio: </Box>
                                            {stats.totalBooked} (Booked) ÷ {stats.total} (Total) × 100 = {stats.bookingRatio}%
                                        </Typography>
                                    </Box>
                                </Box>
                            </Paper>
                        </Grid>
                    );
                })}
            </Grid>

            {/* ── Total calls / pickup ratio summary card ──────────────────── */}
            <Paper elevation={0} sx={{
                mb: 3, borderRadius: '6px', overflow: 'hidden',
                border: `1px solid ${alpha(PALETTE.TEAL, 0.18)}`, bgcolor: 'white',
                transition: 'box-shadow 0.2s',
                '&:hover': { boxShadow: `0 4px 16px ${alpha(PALETTE.TEAL, 0.08)}` },
            }}>
                <Box sx={{
                    px: 2.5, py: 1.75,
                    borderBottom: `1px solid ${alpha(PALETTE.TEAL, 0.12)}`,
                    background: `linear-gradient(135deg, ${alpha(PALETTE.TEAL, 0.05)} 0%, transparent 100%)`,
                    display: 'flex', alignItems: 'center', gap: 1.5,
                }}>
                    <Box sx={{
                        width: 36, height: 36, borderRadius: '8px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: `linear-gradient(135deg, ${alpha(PALETTE.TEAL, 0.15)} 0%, ${alpha(PALETTE.TEAL, 0.06)} 100%)`,
                        color: PALETTE.TEAL,
                        border: `1px solid ${alpha(PALETTE.TEAL, 0.18)}`,
                    }}>
                        <PhoneCall size={17} />
                    </Box>
                    <Box>
                        <Typography sx={{ fontSize: '0.95rem', fontWeight: 700, color: PALETTE.TEXT, letterSpacing: '-0.01em', lineHeight: 1.2 }}>
                            Total Calls Picked Up
                        </Typography>
                        <Typography variant="caption" sx={{ color: PALETTE.GRAY, fontSize: '0.75rem' }}>
                            All active records · Pickup Ratio = Total Jobs Booked ÷ All Leads × 100
                        </Typography>
                    </Box>
                </Box>

                <Box sx={{ p: 2.5 }}>
                    <Grid container spacing={2} alignItems="stretch">
                        {/* All Leads */}
                        <Grid size={{ xs: 6, sm: 3 }}>
                            <Box sx={{ p: 2, borderRadius: '8px', border: `1px solid ${alpha(PALETTE.TEAL, 0.12)}`, bgcolor: alpha(PALETTE.TEAL, 0.03), height: '100%' }}>
                                <Typography variant="caption" sx={{ color: PALETTE.GRAY, fontSize: '0.73rem', display: 'block', mb: 0.5, fontWeight: 500 }}>All Leads</Typography>
                                <Typography sx={{ fontWeight: 700, color: PALETTE.TEXT, fontSize: '2rem', lineHeight: 1.1, mb: 0.5 }}>{kpiData.totalAllLeads}</Typography>
                                <Typography variant="caption" sx={{ color: PALETTE.GRAY, fontSize: '0.72rem' }}>Total inbound leads</Typography>
                            </Box>
                        </Grid>

                        {/* Total Jobs Booked */}
                        <Grid size={{ xs: 6, sm: 3 }}>
                            <Box sx={{ p: 2, borderRadius: '8px', border: `1px solid ${alpha(PALETTE.GREEN, 0.15)}`, bgcolor: alpha(PALETTE.GREEN, 0.03), height: '100%' }}>
                                <Typography variant="caption" sx={{ color: PALETTE.GRAY, fontSize: '0.73rem', display: 'block', mb: 0.5, fontWeight: 500 }}>Total Jobs Booked</Typography>
                                <Typography sx={{ fontWeight: 700, color: PALETTE.GREEN, fontSize: '2rem', lineHeight: 1.1, mb: 0.5 }}>{kpiData.totalJobsBooked}</Typography>
                                <Typography variant="caption" sx={{ color: PALETTE.GRAY, fontSize: '0.72rem' }}>Successfully converted</Typography>
                            </Box>
                        </Grid>

                        {/* Remaining Leads */}
                        <Grid size={{ xs: 6, sm: 3 }}>
                            <Box sx={{ p: 2, borderRadius: '8px', border: `1px solid ${alpha(PALETTE.AMBER, 0.18)}`, bgcolor: alpha(PALETTE.AMBER, 0.03), height: '100%' }}>
                                <Typography variant="caption" sx={{ color: PALETTE.GRAY, fontSize: '0.73rem', display: 'block', mb: 0.5, fontWeight: 500 }}>Remaining Leads</Typography>
                                <Typography sx={{ fontWeight: 700, color: PALETTE.AMBER, fontSize: '2rem', lineHeight: 1.1, mb: 0.5 }}>{kpiData.remainingLeads}</Typography>
                                <Typography variant="caption" sx={{ color: PALETTE.GRAY, fontSize: '0.72rem' }}>{kpiData.totalAllLeads} − {kpiData.totalJobsBooked}</Typography>
                            </Box>
                        </Grid>

                        {/* Call Pickup Ratio */}
                        <Grid size={{ xs: 6, sm: 3 }}>
                            <Box sx={{
                                p: 2, borderRadius: '8px',
                                border: `1px solid ${alpha(PALETTE.TEAL, 0.2)}`,
                                background: `linear-gradient(135deg, ${alpha(PALETTE.TEAL, 0.07)} 0%, ${alpha(PALETTE.TEAL, 0.02)} 100%)`,
                                height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                            }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                                    <Typography variant="caption" sx={{ color: PALETTE.GRAY, fontSize: '0.73rem', fontWeight: 500 }}>Call Pickup Ratio</Typography>
                                    <TrendingUp size={14} color={PALETTE.TEAL} />
                                </Box>
                                <Typography sx={{ fontWeight: 800, color: PALETTE.TEAL, fontSize: '2rem', lineHeight: 1.1, mb: 0.5 }}>
                                    {kpiData.callPickupRatio}%
                                </Typography>
                                <Box>
                                    <Typography variant="caption" sx={{ color: PALETTE.GRAY, fontSize: '0.72rem' }}>
                                        {kpiData.totalJobsBooked} ÷ {kpiData.totalAllLeads}
                                    </Typography>
                                    {/* Progress bar */}
                                    <Box sx={{ mt: 1, height: 4, borderRadius: '2px', bgcolor: alpha(PALETTE.TEAL, 0.15), overflow: 'hidden' }}>
                                        <Box sx={{
                                            height: '100%',
                                            width: `${Math.min(parseFloat(kpiData.callPickupRatio), 100)}%`,
                                            borderRadius: '2px', bgcolor: PALETTE.TEAL,
                                            transition: 'width 0.6s ease',
                                        }} />
                                    </Box>
                                </Box>
                            </Box>
                        </Grid>
                    </Grid>

                    {/* Formula hint */}
                    <Box sx={{
                        mt: 2, px: 2, py: 1.25, borderRadius: '7px',
                        bgcolor: alpha(PALETTE.TEAL, 0.04),
                        border: `1px dashed ${alpha(PALETTE.TEAL, 0.2)}`,
                        display: 'flex', alignItems: 'center', gap: 1,
                    }}>
                        <AlertCircle size={13} color={alpha(PALETTE.TEAL, 0.7)} style={{ flexShrink: 0 }} />
                        <Typography variant="caption" sx={{ color: PALETTE.GRAY, fontSize: '0.75rem' }}>
                            <Box component="span" sx={{ fontWeight: 600, color: PALETTE.TEAL }}>Formula: </Box>
                            {kpiData.totalAllLeads} (All Leads) − {kpiData.totalJobsBooked} (Booked) = {kpiData.remainingLeads} (Remaining)
                            &nbsp;·&nbsp;
                            {kpiData.totalJobsBooked} ÷ {kpiData.totalAllLeads} = {kpiData.callPickupRatio}% Call Pickup Ratio
                        </Typography>
                    </Box>
                </Box>
            </Paper>

            {/* ── Daily performance table ──────────────────────────────────── */}
            <Paper elevation={0} sx={{
                mb: 0, borderRadius: '6px', overflow: 'hidden',
                border: `1px solid ${alpha(PALETTE.BLUE, 0.15)}`, bgcolor: 'white',
            }}>
                {/* Table toolbar */}
                <Box sx={{
                    p: 1.5, bgcolor: 'white',
                    borderBottom: `1px solid ${alpha(PALETTE.BLUE, 0.1)}`,
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1,
                }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography sx={{ fontSize: '1rem', color: PALETTE.TEXT, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 0.75 }}>
                            Daily Performance Breakdown
                            <Chip
                                size="small"
                                label={tableSearch ? `${filteredActive.length}/${activeData.length}` : activeData.length}
                                sx={{ bgcolor: alpha(PALETTE.BLUE, 0.08), color: PALETTE.TEXT, fontSize: '0.75rem', fontWeight: 500, height: '24px', '& .MuiChip-label': { px: 1.2, py: 0 } }}
                            />
                        </Typography>
                    </Box>
                    <Stack direction="row" spacing={1} alignItems="center">
                        <TableSearchBar value={tableSearch} onChange={setTableSearch} color={PALETTE.BLUE} placeholder="Search by date…" />
                        {selectedIds.size > 0 && (
                            <Button
                                variant="outlined" color="error" size="small"
                                onClick={handleBulkMoveToBin}
                                startIcon={<Trash2 size={14} />}
                                sx={{ textTransform: 'none', fontSize: '0.75rem', height: '32px', px: 1.5 }}
                            >
                                Delete ({selectedIds.size})
                            </Button>
                        )}
                    </Stack>
                </Box>

                {/* Table */}
                <TableContainer>
                    <Table size="small">
                        <TableHead>
                            <TableRow sx={{ bgcolor: alpha(PALETTE.BLUE, 0.04), '& th': { borderBottom: `2px solid ${alpha(PALETTE.BLUE, 0.1)}` } }}>
                                <TableCell padding="checkbox" sx={{ pl: 2.5, py: 1.5 }}>
                                    <Checkbox
                                        size="small"
                                        checked={allOnPage}
                                        indeterminate={someOnPage && !allOnPage}
                                        onChange={toggleAll}
                                        sx={{ color: PALETTE.TEXT, padding: '4px' }}
                                    />
                                </TableCell>
                                {[
                                    { label: 'Date',              width: 175 },
                                    { label: 'Cameron Booked',    align: 'center', width: 135 },
                                    { label: 'Cameron Total',     align: 'center', width: 125 },
                                    { label: 'Cameron %',         align: 'center', width: 105 },
                                    { label: 'Eric Booked',       align: 'center', width: 105 },
                                    { label: 'Eric Total',        align: 'center', width: 95  },
                                    { label: 'Eric %',            align: 'center', width: 85  },
                                    { label: 'Total Jobs Booked', align: 'center', width: 145 },
                                    { label: 'All Leads',         align: 'center', width: 100 },
                                    { label: 'Pickup Ratio',      align: 'center', width: 110 },
                                    { label: 'Actions',           align: 'center', width: 90  },
                                ].map(col => (
                                    <TableCell
                                        key={col.label}
                                        align={col.align || 'left'}
                                        sx={{ color: PALETTE.TEXT, fontSize: '0.8rem', fontWeight: 600, py: 1.5, width: col.width, whiteSpace: 'nowrap' }}
                                    >
                                        {col.label}
                                    </TableCell>
                                ))}
                            </TableRow>
                        </TableHead>

                        <TableBody>
                            {paginatedData.length === 0 ? (
                                /* Empty state */
                                <TableRow>
                                    <TableCell colSpan={11} align="center" sx={{ py: 6 }}>
                                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                                            <Search size={32} color={alpha(PALETTE.TEXT, 0.2)} />
                                            <Typography variant="body2" sx={{ color: PALETTE.TEXT, opacity: 0.5, fontSize: '0.85rem', fontWeight: 500 }}>
                                                {tableSearch ? 'No matching records' : 'No records'}
                                            </Typography>
                                            {tableSearch && (
                                                <Typography variant="caption" sx={{ color: PALETTE.GRAY, fontSize: '0.78rem' }}>
                                                    Try adjusting your search
                                                </Typography>
                                            )}
                                        </Box>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                paginatedData.map(row => {
                                    const isSelected  = selectedIds.has(row.id);
                                    const camRatio    = row.cameronTotal  ? ((row.cameronBooked  / row.cameronTotal)  * 100).toFixed(2) : '0.00';
                                    const ericRatio   = row.ericTotal     ? ((row.ericBooked     / row.ericTotal)     * 100).toFixed(2) : '0.00';
                                    const pickupRatio = row.all_leads     ? ((row.totalJobsBooked / row.all_leads)    * 100).toFixed(2) : '0.00';

                                    return (
                                        <TableRow
                                            key={row.id}
                                            hover
                                            sx={{
                                                bgcolor: isSelected ? alpha(PALETTE.BLUE, 0.07) : 'white',
                                                '&:hover': { backgroundColor: alpha(PALETTE.BLUE, 0.04) },
                                                '&:last-child td': { borderBottom: 'none' },
                                            }}
                                        >
                                            <TableCell padding="checkbox" sx={{ pl: 2.5, py: 1.5 }}>
                                                <Checkbox checked={isSelected} onChange={() => toggleOne(row.id)} size="small" sx={{ color: PALETTE.TEXT, padding: '4px' }} />
                                            </TableCell>
                                            <TableCell sx={{ py: 1.5 }}>
                                                <Typography variant="body2" sx={{ fontSize: '0.85rem', fontWeight: 500, color: PALETTE.TEXT }}>{row.date}</Typography>
                                            </TableCell>
                                            <TableCell align="center" sx={{ py: 1.5 }}>
                                                <Typography variant="body2" sx={{ fontSize: '0.82rem', fontWeight: 500 }}>{row.cameronBooked}</Typography>
                                            </TableCell>
                                            <TableCell align="center" sx={{ py: 1.5 }}>
                                                <Typography variant="body2" sx={{ fontSize: '0.82rem', fontWeight: 500 }}>{row.cameronTotal}</Typography>
                                            </TableCell>
                                            <TableCell align="center" sx={{ py: 1.5 }}>
                                                <Chip label={`${camRatio}%`} size="small" sx={{ fontSize: '0.75rem', height: '22px', bgcolor: alpha(PALETTE.BLUE, 0.08), color: PALETTE.BLUE, border: `1px solid ${alpha(PALETTE.BLUE, 0.2)}`, '& .MuiChip-label': { px: 1 } }} />
                                            </TableCell>
                                            <TableCell align="center" sx={{ py: 1.5 }}>
                                                <Typography variant="body2" sx={{ fontSize: '0.82rem', fontWeight: 500 }}>{row.ericBooked}</Typography>
                                            </TableCell>
                                            <TableCell align="center" sx={{ py: 1.5 }}>
                                                <Typography variant="body2" sx={{ fontSize: '0.82rem', fontWeight: 500 }}>{row.ericTotal}</Typography>
                                            </TableCell>
                                            <TableCell align="center" sx={{ py: 1.5 }}>
                                                <Chip label={`${ericRatio}%`} size="small" sx={{ fontSize: '0.75rem', height: '22px', bgcolor: alpha(PALETTE.GREEN, 0.08), color: PALETTE.GREEN, border: `1px solid ${alpha(PALETTE.GREEN, 0.2)}`, '& .MuiChip-label': { px: 1 } }} />
                                            </TableCell>
                                            <TableCell align="center" sx={{ py: 1.5 }}>
                                                <Typography variant="body2" sx={{ fontSize: '0.82rem', fontWeight: 500 }}>{row.totalJobsBooked}</Typography>
                                            </TableCell>
                                            <TableCell align="center" sx={{ py: 1.5 }}>
                                                <Typography variant="body2" sx={{ fontSize: '0.82rem', fontWeight: 500 }}>{row.all_leads}</Typography>
                                            </TableCell>
                                            <TableCell align="center" sx={{ py: 1.5 }}>
                                                <Chip label={`${pickupRatio}%`} size="small" sx={{ fontSize: '0.75rem', height: '22px', bgcolor: alpha(PALETTE.TEAL, 0.08), color: PALETTE.TEAL, border: `1px solid ${alpha(PALETTE.TEAL, 0.2)}`, '& .MuiChip-label': { px: 1 } }} />
                                            </TableCell>
                                            <TableCell align="center" sx={{ py: 1.5 }}>
                                                <Tooltip title="Move to Recycle Bin">
                                                    <IconButton size="small" onClick={() => handleSingleMoveToBin(row)} sx={{ color: PALETTE.RED, p: '6px', '&:hover': { bgcolor: alpha(PALETTE.RED, 0.08) } }}>
                                                        <Trash2 size={15} />
                                                    </IconButton>
                                                </Tooltip>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>

                {/* Pagination */}
                <TablePagination
                    rowsPerPageOptions={[5, 10, 25]}
                    component="div"
                    count={filteredActive.length}
                    rowsPerPage={rowsPerPage}
                    page={page}
                    onPageChange={(_, p) => setPage(p)}
                    onRowsPerPageChange={e => { setRowsPerPage(+e.target.value); setPage(0); }}
                    SelectProps={{ MenuProps: { disableScrollLock: true } }}
                    sx={{
                        borderTop: `1px solid ${alpha(PALETTE.BLUE, 0.1)}`,
                        '& .MuiTablePagination-toolbar': { minHeight: '44px', padding: '0 16px' },
                        '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': { fontSize: '0.8rem', color: PALETTE.TEXT },
                    }}
                />
            </Paper>

            {/* ── Move-to-bin confirmation dialog ─────────────────────────── */}
            <MoveToBinDialog
                open={moveToBinDialog.open}
                item={moveToBinDialog.item}
                isBulk={moveToBinDialog.isBulk}
                count={selectedIds.size}
                onConfirm={confirmMoveToBin}
                onClose={() => setMoveToBinDialog(p => ({ ...p, open: false }))}
            />

            {/* ── Recycle bin modal ────────────────────────────────────────── */}
            <RecycleBinModal
                open={binOpen}
                onClose={() => setBinOpen(false)}
                items={deletedData}
                onRestore={handleRestore}
                onBulkRestore={handleBulkRestore}
                onPermanentDelete={handlePermanentDelete}
                onBulkPermanentDelete={handleBulkPermanentDelete}
            />
        </Box>
    );
}