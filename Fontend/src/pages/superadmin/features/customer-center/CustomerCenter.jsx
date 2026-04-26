import React, { useState, useMemo, useCallback, memo } from 'react';
import { format } from 'date-fns';
import {
    Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Chip, Stack, Checkbox,
    Button, Tooltip, IconButton, Dialog, DialogTitle, DialogContent,
    DialogActions, TablePagination, TextField, Modal,
    CircularProgress
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
    AlertCircle, CheckCircle, Search, X, Trash2, FileText,
    RotateCcw, ExternalLink, Eye, Clock,
    CheckCheck, ChevronRight, History, ChevronDown, ChevronUp,
} from 'lucide-react';
import { workOrdersApi } from '../../../../api/services/workOrders';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../../../auth/AuthProvider';
import { Helmet } from 'react-helmet-async';
import DashboardLoader from '../../../../components/Loader/DashboardLoader';
import RefreshButton from '../../../../components/ui/RefreshButton';
import CommonDialog from '../../../../components/ui/CommonDialog';
import { rmeApi } from '../../../../api/services/rmeApi';

// ─── Replace local snack state with the global snackbar hook ───────────────────
import { useGlobalSnackbar } from '../../../../context/GlobalSnackbarContext';

/* ── Palette ─────────────────────────────────────────────────────────────── */
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
const formatDateTimeWithTZ = (dateString) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    return isNaN(date) ? '—' : format(date, "MM/dd/yyyy hh:mm a");
};

/* ── Address parser ──────────────────────────────────────────────────────── */
const parseAddress = (fullAddress) => {
    if (!fullAddress || fullAddress === 'No address provided') {
        return { address: 'No address', street: 'Unknown', city: 'Unknown', state: 'Unknown', zip: 'Unknown' };
    }
    const parts = fullAddress.split(',').map(p => p.trim());
    const street = parts[0] || 'Unknown';
    const cityStateZip = parts[1]?.trim().split(' ') || [];
    return {
        address: fullAddress,
        street,
        city:  cityStateZip[0] || 'Unknown',
        state: cityStateZip[1] || 'Unknown',
        zip:   cityStateZip[2] || 'Unknown',
    };
};

/* ── Transform API → local shape ─────────────────────────────────────────── */
const transformRepairData = (item) => {
    const addressComponents = parseAddress(item.workOrderAddress);
    const statusMap = {
        'in_progress':  'In Progress',
        'in progress':  'In Progress',
        'completed':    'Completed',
    };

    return {
        id:               item.id,
        tag:              Array.isArray(item.tag) && item.tag.length > 0 ? item.tag[0] :
                          typeof item.tag === 'string' ? item.tag : 'ROUTINE SERVICE REQUESTED',
        wo:               item.wo,
        customerName:     item.customerName     || 'Unknown Customer',
        workOrderAddress: item.workOrderAddress || 'No address provided',
        ...addressComponents,
        workOrderSummary: item.workOrderSummary || 'No description',
        workOrderLink:    item.workOrderLink,
        quoteLink:        item.quoteLink        || null,
        technicianName:   item.technicianName   || 'Unassigned',
        status:           statusMap[item.status?.toLowerCase()] || 'Viewed',
        note:             item.note             || '',
        completedNote:    item.completedNote    || '',
        createdAt:        item.createdAt        || new Date().toISOString(),
        submittedAt:      item.submittedAt      || item.submitted_at  || null,
        viewedAt:         item.viewedAt         || null,
        completedAt:      item.completedAt      || item.completed_at  || null,
        isDeleted:        item.is_deleted       || false,
        deletedBy:        item.deleted_by       || null,
        deletedByEmail:   item.deleted_by_email || null,
        deletedDate:      item.deleted_date     || null,
    };
};

/* ── Transform local shape → API payload ─────────────────────────────────── */
const transformToAPIFormat = (data) => {
    const statusMap = { 'In Progress': 'in_progress', 'Completed': 'completed' };
    const apiData = {};

    if (data.status         !== undefined) apiData.status           = statusMap[data.status] || data.status.toLowerCase();
    if (data.note           !== undefined) apiData.note             = data.note;
    if (data.completedNote  !== undefined) apiData.completedNote    = data.completedNote;
    if (data.viewedAt       !== undefined) apiData.viewedAt         = data.viewedAt;
    if (data.completedAt    !== undefined) apiData.completedAt      = data.completedAt;
    if (data.submittedAt    !== undefined) apiData.submittedAt      = data.submittedAt;
    if (data.isDeleted      !== undefined) apiData.is_deleted       = data.isDeleted;
    if (data.deletedBy      !== undefined) apiData.deleted_by       = data.deletedBy;
    if (data.deletedByEmail !== undefined) apiData.deleted_by_email = data.deletedByEmail;
    if (data.deletedDate    !== undefined) apiData.deleted_date     = data.deletedDate;

    return apiData;
};

/* ── Sorting helpers ─────────────────────────────────────────────────────── */
const sortOldestFirst = (arr, key = 'createdAt') =>
    [...arr].sort((a, b) => new Date(a[key] || 0) - new Date(b[key] || 0));

const sortNewestFirst = (arr, key = 'createdAt') =>
    [...arr].sort((a, b) => new Date(b[key] || 0) - new Date(a[key] || 0));

/* ── React-Query cache helpers ───────────────────────────────────────────── */
const updateCacheItem = (queryClient, id, changes) => {
    queryClient.setQueryData(['work-orders'], (old) => {
        if (!old) return old;
        return old.map(item => item.id === id ? { ...item, ...changes } : item);
    });
};

const removeCacheItem = (queryClient, id) => {
    queryClient.setQueryData(['work-orders'], (old) => {
        if (!old) return old;
        return old.filter(item => item.id !== id);
    });
};

const removeCacheItems = (queryClient, ids) => {
    const idSet = new Set(ids);
    queryClient.setQueryData(['work-orders'], (old) => {
        if (!old) return old;
        return old.filter(item => !idSet.has(item.id));
    });
};

/* ── Text filter ─────────────────────────────────────────────────────────── */
const applyFilter = (arr, q) => {
    if (!q) return arr;
    const lq = q.toLowerCase();
    return arr.filter(i =>
        (i.customerName || '').toLowerCase().includes(lq)       ||
        (i.workOrderAddress || '').toLowerCase().includes(lq)   ||
        (i.workOrderSummary || '').toLowerCase().includes(lq)   ||
        (i.tag || '').toLowerCase().includes(lq)                ||
        (i.wo || '').toLowerCase().includes(lq)                 ||
        (i.technicianName || '').toLowerCase().includes(lq)
    );
};

/* ════════════════════════════════════════════════════════════════════════════
   MEMOIZED SHARED COMPONENTS
════════════════════════════════════════════════════════════════════════════ */

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

const TagLabel = memo(({ tag }) =>
    tag ? <Typography variant="body2" sx={{ fontSize: '0.78rem', color: PALETTE.TEXT, fontWeight: 500 }}>{tag}</Typography> : null
);
TagLabel.displayName = 'TagLabel';

const NoteBlock = memo(({ note, accentColor, labelText, textColor }) => (
    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.6, background: alpha(accentColor, 0.07), border: `1px solid ${alpha(accentColor, 0.2)}`, borderRadius: '4px', px: 0.8, py: 0.5 }}>
        <FileText size={10} color={accentColor} style={{ flexShrink: 0, marginTop: 2 }} />
        <Box>
            {labelText && <Typography variant="caption" sx={{ fontSize: '0.68rem', color: accentColor, fontWeight: 600, display: 'block', mb: 0.2 }}>{labelText}</Typography>}
            <Typography variant="caption" sx={{ fontSize: '0.75rem', color: textColor || accentColor, lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{note}</Typography>
        </Box>
    </Box>
));
NoteBlock.displayName = 'NoteBlock';

// ActionDialog shell removed in favor of universal CommonDialog

const MoveDialog = memo(({ open, item, onConfirm, onClose }) => {
    const [note, setNote] = useState('');
    React.useEffect(() => { if (item) setNote(''); }, [item]);

    const handleConfirm = useCallback(() => {
        if (note.trim()) { onConfirm(item.id, note); onClose(); }
    }, [note, item, onConfirm, onClose]);

    return (
        <CommonDialog
            open={open} onClose={onClose} onConfirm={handleConfirm}
            title="Move to In Progress" variant="warning" confirmText="Move to In Progress"
            disabled={!note.trim()} icon={<Clock size={18} />}
        >
            <Box sx={{ p: 1.5, borderRadius: '6px', bgcolor: alpha(PALETTE.ORANGE, 0.05), border: `1px solid ${alpha(PALETTE.ORANGE, 0.1)}`, mb: 2 }}>
                <Typography variant="caption" sx={{ color: PALETTE.ORANGE, fontSize: '0.8rem', fontWeight: 500 }}>
                    A progress note is required to move to this stage.
                </Typography>
            </Box>
            <TextField multiline rows={4} fullWidth autoFocus value={note} onChange={e => setNote(e.target.value)}
                placeholder="Describe where this matter currently stands…"
                sx={{ '& .MuiOutlinedInput-root': { fontSize: '0.875rem', borderRadius: '6px' } }} />
        </CommonDialog>
    );
});
MoveDialog.displayName = 'MoveDialog';

const EditNoteDialog = memo(({ open, item, onSave, onClose }) => {
    const [note, setNote] = useState('');
    React.useEffect(() => { if (item) setNote(item.note || ''); }, [item]);

    const handleSave = useCallback(() => {
        if (note.trim()) { onSave(item.id, note); onClose(); }
    }, [note, item, onSave, onClose]);

    return (
        <CommonDialog
            open={open} onClose={onClose} onConfirm={handleSave}
            title="Edit Progress Note" variant="warning" confirmText="Save Note"
            disabled={!note.trim()} icon={<FileText size={18} />}
        >
            <TextField multiline rows={4} fullWidth autoFocus value={note} onChange={e => setNote(e.target.value)}
                placeholder="Describe current progress…"
                sx={{ '& .MuiOutlinedInput-root': { fontSize: '0.875rem', borderRadius: '6px' } }} />
        </CommonDialog>
    );
});
EditNoteDialog.displayName = 'EditNoteDialog';

const CompleteDialog = memo(({ open, item, onConfirm, onClose }) => {
    const [note, setNote] = useState('');
    React.useEffect(() => { if (item) setNote(''); }, [item]);

    const handleConfirm = useCallback(() => {
        onConfirm(item.id, note); onClose();
    }, [note, item, onConfirm, onClose]);

    return (
        <CommonDialog
            open={open} onClose={onClose} onConfirm={handleConfirm}
            title="Mark as Completed" variant="success" confirmText="Mark Complete"
            icon={<CheckCheck size={18} />}
        >
            <Typography variant="body2" sx={{ color: PALETTE.TEXT, fontSize: '0.85rem', mb: 2 }}>
                Optionally add a closing note before completing.
            </Typography>
            <TextField multiline rows={3} fullWidth value={note} onChange={e => setNote(e.target.value)}
                placeholder="Optional — e.g. Issue resolved, customer satisfied…"
                sx={{ '& .MuiOutlinedInput-root': { fontSize: '0.875rem', borderRadius: '6px' } }} />
        </CommonDialog>
    );
});
CompleteDialog.displayName = 'CompleteDialog';

const DeleteConfirmDialog = memo(({ open, onClose, onConfirm, isBulk, item, count }) => (
    <CommonDialog
        open={open} onClose={onClose} onConfirm={onConfirm}
        title="Move to Recycle Bin" variant="warning" confirmText="Move to Bin"
        icon={<Trash2 size={18} />}
    >
        <Typography variant="body2" sx={{ color: PALETTE.TEXT, fontSize: '0.85rem', lineHeight: 1.6, mb: 2 }}>
            {isBulk ? (
                <>Are you sure you want to move <Box component="strong" sx={{ color: PALETTE.ORANGE }}>{count} item(s)</Box> to the Recycle Bin?</>
            ) : (
                <>Are you sure you want to move the work order for <Box component="strong">{item?.customerName}</Box> to the Recycle Bin?</>
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
DeleteConfirmDialog.displayName = 'DeleteConfirmDialog';

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
                    <>Are you sure you want to permanently delete the work order for <Box component="strong">{item?.customerName}</Box>?</>
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

/* ── Customer info cell ───────────────────────────────────────────────────── */
const CustomerInfoCell = memo(({ item }) => (
    <Box>
        <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.85rem', wordBreak: 'break-word', overflowWrap: 'break-word' }}>
            {item.customerName} - {item.street}
        </Typography>
        <Typography variant="caption" sx={{ color: PALETTE.GRAY, fontSize: '0.8rem', wordBreak: 'break-word', overflowWrap: 'break-word' }}>
            {item.city}, {item.state} {item.zip}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 0.5 }}>
            {item.workOrderLink && (
                <a href={item.workOrderLink} target="_blank" rel="noopener noreferrer"
                    style={{ fontSize: '0.75rem', color: PALETTE.BLUE, textDecoration: 'none', fontWeight: 500 }}>
                    {item.wo}
                </a>
            )}
            {item.workOrderLink && item.quoteLink && (
                <Typography variant="caption" sx={{ color: PALETTE.GRAY }}>·</Typography>
            )}
            {item.quoteLink && (
                <a href={item.quoteLink} target="_blank" rel="noopener noreferrer"
                    style={{ fontSize: '0.75rem', color: PALETTE.TEAL, textDecoration: 'none', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                    Quote <ExternalLink size={10} />
                </a>
            )}
        </Box>
    </Box>
));
CustomerInfoCell.displayName = 'CustomerInfoCell';

/* ── Expandable work-order summary ───────────────────────────────────────── */
const ExpandableWorkOrderSummary = memo(({ summary, maxLines = 3 }) => {
    const [expanded, setExpanded] = useState(false);
    const lines = summary.split('\n');
    const isExpandable = lines.length > maxLines;
    const displayText = expanded ? summary : lines.slice(0, maxLines).join('\n');

    return (
        <Box>
            <Typography variant="body2" sx={{ fontSize: '0.82rem', color: PALETTE.TEXT, lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word', overflowWrap: 'break-word', maxHeight: expanded ? 'none' : `${maxLines * 1.5 + 0.5}em`, overflow: expanded ? 'visible' : 'hidden', display: 'block', transition: 'max-height 0.3s ease, overflow 0.3s ease' }}>
                {displayText}
            </Typography>
            {isExpandable && (
                <Button size="small" onClick={() => setExpanded(!expanded)}
                    sx={{ textTransform: 'none', fontSize: '0.75rem', fontWeight: 600, color: PALETTE.BLUE, padding: '4px 0', marginTop: '6px', '&:hover': { backgroundColor: 'transparent', textDecoration: 'underline' } }}
                    endIcon={expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}>
                    {expanded ? 'See Less' : 'See More'}
                </Button>
            )}
        </Box>
    );
});
ExpandableWorkOrderSummary.displayName = 'ExpandableWorkOrderSummary';

/* ════════════════════════════════════════════════════════════════════════════
   RECYCLE BIN MODAL
════════════════════════════════════════════════════════════════════════════ */
const RecycleBinModal = memo(({
    open, onClose, items, isLoading,
    page, rowsPerPage, onPageChange, onRowsPerPageChange,
    selected, onToggle, onToggleAll,
    onBulkRestore, onBulkDelete,
    onSingleRestore, onSingleDelete,
    search, onSearchChange,
}) => {
    const [permDeleteModal, setPermDeleteModal] = useState({ open: false, item: null, isBulk: false });

    const pageItems = useMemo(
        () => items.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
        [items, page, rowsPerPage]
    );
    const allOnPage  = pageItems.length > 0 && pageItems.every(i => selected.has(i.id));
    const someOnPage = pageItems.length > 0 && pageItems.some(i => selected.has(i.id)) && !allOnPage;

    return (
        <>
            <Modal open={open} onClose={onClose} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Box sx={{ width: '95%', maxWidth: 1400, maxHeight: '90vh', bgcolor: 'white', borderRadius: '8px', boxShadow: '0 25px 60px rgba(0,0,0,0.15)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

                    {/* ── Header ─────────────────────────────────────────────── */}
                    <Box sx={{ p: 2, borderBottom: `1px solid ${alpha(PALETTE.PURPLE, 0.12)}`, background: `linear-gradient(135deg, ${alpha(PALETTE.PURPLE, 0.06)} 0%, ${alpha(PALETTE.PURPLE, 0.02)} 100%)`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Box sx={{ width: 42, height: 42, borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: `linear-gradient(135deg, ${alpha(PALETTE.PURPLE, 0.15)} 0%, ${alpha(PALETTE.PURPLE, 0.08)} 100%)`, color: PALETTE.PURPLE, border: `1px solid ${alpha(PALETTE.PURPLE, 0.15)}` }}>
                                <History size={20} />
                            </Box>
                            <Box>
                                <Typography sx={{ fontSize: '1rem', fontWeight: 700, color: PALETTE.TEXT, letterSpacing: '-0.01em' }}>Recycle Bin</Typography>
                                <Typography variant="body2" sx={{ fontSize: '0.78rem', color: PALETTE.GRAY }}>{items.length} deleted item(s) · Restore or permanently delete</Typography>
                            </Box>
                        </Box>
                        <IconButton size="small" onClick={onClose} sx={{ color: PALETTE.GRAY, borderRadius: '8px', '&:hover': { bgcolor: alpha(PALETTE.GRAY, 0.1), color: PALETTE.TEXT } }}>
                            <X size={18} />
                        </IconButton>
                    </Box>

                    {/* ── Toolbar (select-all + search + bulk actions) ─────── */}
                    <Box sx={{ px: 2, py: 1.25, borderBottom: `1px solid ${alpha(PALETTE.PURPLE, 0.08)}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, bgcolor: '#fafbfc' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Checkbox size="small" checked={allOnPage} indeterminate={someOnPage} onChange={() => onToggleAll(pageItems)}
                                sx={{ padding: '4px', color: alpha(PALETTE.PURPLE, 0.4), '&.Mui-checked': { color: PALETTE.PURPLE }, '&.MuiCheckbox-indeterminate': { color: PALETTE.PURPLE } }} />
                            <Box sx={{ position: 'relative', minWidth: 260 }}>
                                <input type="text" value={search} onChange={e => onSearchChange(e.target.value)} placeholder="Search deleted items…"
                                    style={{ width: '100%', padding: '7px 36px 7px 34px', borderRadius: '6px', border: `1.5px solid ${alpha(PALETTE.PURPLE, 0.18)}`, fontSize: '0.82rem', outline: 'none', background: 'white', color: PALETTE.TEXT, transition: 'border-color 0.2s, box-shadow 0.2s', boxSizing: 'border-box' }}
                                    onFocus={e => { e.target.style.borderColor = PALETTE.PURPLE; e.target.style.boxShadow = `0 0 0 3px ${alpha(PALETTE.PURPLE, 0.1)}`; }}
                                    onBlur={e => { e.target.style.borderColor = alpha(PALETTE.PURPLE, 0.18); e.target.style.boxShadow = 'none'; }} />
                                <Box sx={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', pointerEvents: 'none' }}>
                                    <History size={15} color={alpha(PALETTE.GRAY, 0.6)} />
                                </Box>
                                {search && (
                                    <IconButton size="small" onClick={() => onSearchChange('')} sx={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', padding: '2px' }}>
                                        <X size={14} />
                                    </IconButton>
                                )}
                            </Box>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                            <Button variant="outlined" size="small" startIcon={<RotateCcw size={13} />} onClick={onBulkRestore} disabled={selected.size === 0}
                                sx={{ textTransform: 'none', fontSize: '0.78rem', fontWeight: 500, color: PALETTE.GREEN, borderColor: alpha(PALETTE.GREEN, 0.35), borderRadius: '6px', px: 1.5, '&:hover': { borderColor: PALETTE.GREEN, bgcolor: alpha(PALETTE.GREEN, 0.06) }, '&.Mui-disabled': { opacity: 0.45 } }}>
                                Restore ({selected.size})
                            </Button>
                            <Button variant="outlined" size="small" startIcon={<Trash2 size={13} />} onClick={() => setPermDeleteModal({ open: true, item: null, isBulk: true })} disabled={selected.size === 0}
                                sx={{ textTransform: 'none', fontSize: '0.78rem', fontWeight: 500, color: PALETTE.RED, borderColor: alpha(PALETTE.RED, 0.35), borderRadius: '6px', px: 1.5, '&:hover': { borderColor: PALETTE.RED, bgcolor: alpha(PALETTE.RED, 0.06) }, '&.Mui-disabled': { opacity: 0.45 } }}>
                                Delete ({selected.size})
                            </Button>
                        </Box>
                    </Box>

                    {/* ── Table body ──────────────────────────────────────────── */}
                    <Box sx={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', scrollbarWidth: 'thin', '&::-webkit-scrollbar': { width: '4px' }, '&::-webkit-scrollbar-thumb': { background: alpha(PALETTE.PURPLE, 0.2), borderRadius: '4px' } }}>
                        {isLoading ? (
                            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                                <CircularProgress size={24} sx={{ color: PALETTE.PURPLE }} />
                            </Box>
                        ) : items.length === 0 ? (
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
                            <TableContainer sx={{ overflowX: 'auto', '&::-webkit-scrollbar': { height: '4px' }, '&::-webkit-scrollbar-thumb': { background: alpha(PALETTE.PURPLE, 0.2), borderRadius: '4px' } }}>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow sx={{ bgcolor: alpha(PALETTE.PURPLE, 0.03), '& th': { borderBottom: `2px solid ${alpha(PALETTE.PURPLE, 0.1)}`, fontWeight: 600, fontSize: '0.78rem', color: PALETTE.TEXT, py: 1.5, px: 1.5, whiteSpace: 'nowrap' } }}>
                                            <TableCell padding="checkbox" width={50} />
                                            <TableCell sx={{ minWidth: 130 }}>Work Order</TableCell>
                                            <TableCell sx={{ minWidth: 180 }}>Customer</TableCell>
                                            <TableCell sx={{ minWidth: 200 }}>Address</TableCell>
                                            <TableCell sx={{ minWidth: 130 }}>Stage</TableCell>
                                            <TableCell sx={{ minWidth: 140 }}>Deleted By</TableCell>
                                            <TableCell sx={{ minWidth: 160 }}>Deleted At</TableCell>
                                            <TableCell width={130} sx={{ minWidth: 120 }}>Actions</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {pageItems.map(item => {
                                            const isSelected = selected.has(item.id);
                                            const [street, ...rest] = item.workOrderAddress.split(',');
                                            const stageColor = item.status === 'Completed' ? PALETTE.GREEN : item.status === 'In Progress' ? PALETTE.ORANGE : PALETTE.BLUE;
                                            return (
                                                <TableRow key={item.id} hover
                                                    sx={{ bgcolor: isSelected ? alpha(PALETTE.PURPLE, 0.07) : 'white', transition: 'background-color 0.15s', '&:hover': { backgroundColor: isSelected ? alpha(PALETTE.PURPLE, 0.1) : alpha(PALETTE.PURPLE, 0.03) }, '&:last-child td': { borderBottom: 'none' } }}>
                                                    <TableCell padding="checkbox">
                                                        <Checkbox size="small" checked={isSelected} onChange={() => onToggle(item.id)} sx={{ padding: '4px', color: alpha(PALETTE.PURPLE, 0.4), '&.Mui-checked': { color: PALETTE.PURPLE } }} />
                                                    </TableCell>
                                                    <TableCell>
                                                        <Typography variant="body2" sx={{ fontSize: '0.83rem', fontWeight: 600, color: PALETTE.PURPLE }}>{item.wo}</Typography>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Typography variant="body2" sx={{ fontSize: '0.83rem', fontWeight: 500, color: PALETTE.TEXT }}>{item.customerName}</Typography>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Typography variant="body2" sx={{ fontSize: '0.83rem', color: PALETTE.TEXT }}>{street || '—'}</Typography>
                                                        {rest.length > 0 && <Typography variant="caption" sx={{ fontSize: '0.72rem', color: PALETTE.GRAY }}>{rest.join(',').trim()}</Typography>}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                                                            <Box sx={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: stageColor, flexShrink: 0 }} />
                                                            <Typography variant="body2" sx={{ fontSize: '0.83rem', color: PALETTE.TEXT }}>{item.status}</Typography>
                                                        </Box>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Typography variant="body2" sx={{ fontSize: '0.83rem', color: PALETTE.TEXT }}>{item.deletedBy || 'Unknown'}</Typography>
                                                        {item.deletedByEmail && <Typography variant="caption" sx={{ fontSize: '0.72rem', color: PALETTE.GRAY }}>{item.deletedByEmail}</Typography>}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Typography variant="body2" sx={{ fontSize: '0.83rem', color: PALETTE.TEXT }}>{item.deletedDate ? formatDateTimeWithTZ(item.deletedDate) : '—'}</Typography>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Stack direction="row" spacing={0.25}>
                                                            <Tooltip title="Restore" arrow>
                                                                <IconButton size="small" onClick={() => onSingleRestore(item)} sx={{ color: PALETTE.GREEN, borderRadius: '6px', p: 0.75, '&:hover': { bgcolor: alpha(PALETTE.GREEN, 0.1) } }}>
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
                                rowsPerPageOptions={[5, 10, 25, 50]} component="div"
                                count={items.length} rowsPerPage={rowsPerPage} page={page}
                                onPageChange={onPageChange} onRowsPerPageChange={onRowsPerPageChange}
                                SelectProps={{ MenuProps: { disableScrollLock: true } }}
                                sx={{ '& .MuiTablePagination-toolbar': { minHeight: '44px' }, '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': { fontSize: '0.78rem', color: PALETTE.GRAY } }}
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
                    if (permDeleteModal.isBulk) await onBulkDelete();
                    else await onSingleDelete(permDeleteModal.item);
                }}
                isBulk={permDeleteModal.isBulk}
                item={permDeleteModal.item}
                count={selected.size}
            />
        </>
    );
});
RecycleBinModal.displayName = 'RecycleBinModal';

/* ── Section wrapper ─────────────────────────────────────────────────────── */
const Section = memo(({ title, color, count, filteredCount, selectedCount, onDelete, children, subtitle, tableSearch, onTableSearch, tableSearchPlaceholder }) => (
    <Paper elevation={0} sx={{ mb: 4, borderRadius: '6px', overflow: 'hidden', border: `1px solid ${alpha(color, 0.15)}`, bgcolor: 'white' }}>
        <Box sx={{ p: 1.5, bgcolor: 'white', borderBottom: `1px solid ${alpha(color, 0.1)}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                <Typography sx={{ fontSize: '1rem', color: PALETTE.TEXT, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    {title}
                    <Chip size="small" label={tableSearch ? `${filteredCount}/${count}` : count}
                        sx={{ bgcolor: alpha(color, 0.08), color: PALETTE.TEXT, fontSize: '0.75rem', fontWeight: 500, height: '24px', '& .MuiChip-label': { px: 1.2, py: 0 } }} />
                </Typography>
                {subtitle && <Typography variant="caption" sx={{ color: PALETTE.GRAY, fontSize: '0.78rem' }}>{subtitle}</Typography>}
            </Box>
            <Stack direction="row" spacing={1} alignItems="center">
                <TableSearchBar value={tableSearch} onChange={onTableSearch} color={color} placeholder={tableSearchPlaceholder || `Search ${title.toLowerCase()}…`} />
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

/* ── Shared table head ───────────────────────────────────────────────────── */
const THead = memo(({ color, allOnPage, someOnPage, onToggleAll, extraCols }) => (
    <TableHead>
        <TableRow sx={{ bgcolor: alpha(color, 0.04), '& th': { borderBottom: `2px solid ${alpha(color, 0.1)}` } }}>
            <TableCell padding="checkbox" sx={{ pl: 2.5, py: 1.5 }}>
                <Checkbox size="small" checked={allOnPage} indeterminate={someOnPage && !allOnPage} onChange={onToggleAll} sx={{ color: PALETTE.TEXT, padding: '4px' }} />
            </TableCell>
            {[
                { label: 'Tag', width: 170 },
                { label: 'Customer Info', minWidth: 240 },
                { label: 'Work Order Summary', minWidth: 280 },
                { label: 'Technician', width: 150 },
                { label: 'Tag Created', width: 160 },
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

/* ── Shared base row (checkbox + common cells) ───────────────────────────── */
const BaseRow = memo(({ item, isSelected, color, onToggleSelect, children }) => (
    <TableRow hover sx={{ bgcolor: isSelected ? alpha(color, 0.07) : 'white', '&:hover': { backgroundColor: alpha(color, 0.04) }, '&:last-child td': { borderBottom: 'none' } }}>
        <TableCell padding="checkbox" sx={{ pl: 2.5, py: 1.5 }}>
            <Checkbox checked={isSelected} onChange={() => onToggleSelect(item.id)} size="small" sx={{ color: PALETTE.TEXT, padding: '4px' }} />
        </TableCell>
        <TableCell sx={{ py: 1.5 }}><TagLabel tag={item.tag} /></TableCell>
        <TableCell sx={{ py: 1.5, minWidth: 240 }}><CustomerInfoCell item={item} /></TableCell>
        <TableCell sx={{ py: 1.5, minWidth: 280 }}><ExpandableWorkOrderSummary summary={item.workOrderSummary} maxLines={3} /></TableCell>
        <TableCell sx={{ py: 1.5 }}>
            <Typography variant="body2" sx={{ fontSize: '0.82rem', color: PALETTE.TEXT }}>{item.technicianName}</Typography>
        </TableCell>
        <TableCell sx={{ py: 1.5 }}>
            <Typography variant="body2" sx={{ fontSize: '0.78rem', color: PALETTE.GRAY }}>{formatDateTimeWithTZ(item.createdAt)}</Typography>
        </TableCell>
        {children}
    </TableRow>
));
BaseRow.displayName = 'BaseRow';

/* ── Viewed table ────────────────────────────────────────────────────────── */
const ViewedTable = memo(({ items, sel, onSel, onSelAll, onMove, onDelete, onView, page, rpp, onPage, onRpp }) => {
    const pg  = items.slice(page * rpp, page * rpp + rpp);
    const all = pg.length > 0 && pg.every(i => sel.has(i.id));
    const some = pg.length > 0 && pg.some(i => sel.has(i.id));

    return (
        <TableContainer>
            <Table size="small">
                <THead color={PALETTE.BLUE} allOnPage={all} someOnPage={some} onToggleAll={() => onSelAll(pg)}
                    extraCols={[{ label: 'Viewed At', width: 180 }, { label: 'Actions', width: 190 }]} />
                <TableBody>
                    {!pg.length ? <EmptyRow colSpan={9} isFiltered={items.length === 0} /> : pg.map(item => (
                        <BaseRow key={item.id} item={item} isSelected={sel.has(item.id)} color={PALETTE.BLUE} onToggleSelect={onSel}>
                            <TableCell sx={{ py: 1.5 }}>
                                {item.viewedAt ? (
                                    <Typography variant="body2" sx={{ fontSize: '0.78rem', color: PALETTE.GRAY }}>{formatDateTimeWithTZ(item.viewedAt)}</Typography>
                                ) : (
                                    <Button size="small" variant="outlined" startIcon={<Eye size={12} />} onClick={() => onView(item.id)}
                                        sx={{ textTransform: 'none', fontSize: '0.72rem', height: '28px', px: 1, color: PALETTE.BLUE, borderColor: alpha(PALETTE.BLUE, 0.4), '&:hover': { borderColor: PALETTE.BLUE, bgcolor: alpha(PALETTE.BLUE, 0.05) } }}>
                                        Viewed
                                    </Button>
                                )}
                            </TableCell>
                            <TableCell sx={{ py: 1.5 }}>
                                <Stack direction="row" spacing={0.5} alignItems="center">
                                    <Button size="small" variant="outlined" startIcon={<ChevronRight size={13} />} onClick={() => onMove(item)}
                                        sx={{ textTransform: 'none', fontSize: '0.75rem', height: '30px', px: 1.5, color: PALETTE.ORANGE, borderColor: alpha(PALETTE.ORANGE, 0.4), '&:hover': { borderColor: PALETTE.ORANGE, bgcolor: alpha(PALETTE.ORANGE, 0.05) } }}>
                                        Progress
                                    </Button>
                                    <Tooltip title="Move to Recycle Bin">
                                        <IconButton size="small" onClick={() => onDelete(item)} sx={{ color: PALETTE.RED, p: '6px', '&:hover': { bgcolor: alpha(PALETTE.RED, 0.08) } }}>
                                            <Trash2 size={15} />
                                        </IconButton>
                                    </Tooltip>
                                </Stack>
                            </TableCell>
                        </BaseRow>
                    ))}
                </TableBody>
            </Table>
            <Pagination color={PALETTE.BLUE} count={items.length} rowsPerPage={rpp} page={page} onPageChange={onPage} onRowsPerPageChange={onRpp} />
        </TableContainer>
    );
});
ViewedTable.displayName = 'ViewedTable';

/* ── In-Progress table ───────────────────────────────────────────────────── */
const InProgressTable = memo(({ items, sel, onSel, onSelAll, onEditNote, onComplete, onDelete, page, rpp, onPage, onRpp }) => {
    const pg  = items.slice(page * rpp, page * rpp + rpp);
    const all = pg.length > 0 && pg.every(i => sel.has(i.id));
    const some = pg.length > 0 && pg.some(i => sel.has(i.id));

    return (
        <TableContainer>
            <Table size="small">
                <THead color={PALETTE.ORANGE} allOnPage={all} someOnPage={some} onToggleAll={() => onSelAll(pg)}
                    extraCols={[{ label: 'Note', width: 250 }, { label: 'Submitted At / Actions', width: 220 }]} />
                <TableBody>
                    {!pg.length ? <EmptyRow colSpan={9} isFiltered={items.length === 0} /> : pg.map(item => (
                        <BaseRow key={item.id} item={item} isSelected={sel.has(item.id)} color={PALETTE.ORANGE} onToggleSelect={onSel}>
                            <TableCell sx={{ py: 1.5, maxWidth: 250 }}>
                                {item.note ? (
                                    <NoteBlock note={item.note} accentColor={PALETTE.AMBER} textColor="#78350f" />
                                ) : (
                                    <Typography variant="caption" sx={{ fontSize: '0.78rem', color: PALETTE.GRAY, fontStyle: 'italic' }}>No note</Typography>
                                )}
                            </TableCell>
                            <TableCell sx={{ py: 1.5 }}>
                                <Typography variant="body2" sx={{ fontSize: '0.78rem', color: PALETTE.GRAY, mb: 0.75 }}>
                                    {item.submittedAt ? formatDateTimeWithTZ(item.submittedAt) : '—'}
                                </Typography>
                                <Stack direction="row" spacing={0.5} alignItems="center">
                                    <Tooltip title="Edit progress note">
                                        <IconButton size="small" onClick={() => onEditNote(item)} sx={{ color: PALETTE.AMBER, '&:hover': { bgcolor: alpha(PALETTE.AMBER, 0.08) }, p: '6px' }}>
                                            <FileText size={15} />
                                        </IconButton>
                                    </Tooltip>
                                    <Button size="small" variant="outlined" startIcon={<CheckCheck size={13} />} onClick={() => onComplete(item)}
                                        sx={{ textTransform: 'none', fontSize: '0.75rem', height: '30px', px: 1.5, color: PALETTE.GREEN, borderColor: alpha(PALETTE.GREEN, 0.4), '&:hover': { borderColor: PALETTE.GREEN, bgcolor: alpha(PALETTE.GREEN, 0.05) } }}>
                                        Complete
                                    </Button>
                                    <Tooltip title="Move to Recycle Bin">
                                        <IconButton size="small" onClick={() => onDelete(item)} sx={{ color: PALETTE.RED, p: '6px', '&:hover': { bgcolor: alpha(PALETTE.RED, 0.08) } }}>
                                            <Trash2 size={15} />
                                        </IconButton>
                                    </Tooltip>
                                </Stack>
                            </TableCell>
                        </BaseRow>
                    ))}
                </TableBody>
            </Table>
            <Pagination color={PALETTE.ORANGE} count={items.length} rowsPerPage={rpp} page={page} onPageChange={onPage} onRowsPerPageChange={onRpp} />
        </TableContainer>
    );
});
InProgressTable.displayName = 'InProgressTable';

/* ── Completed table ─────────────────────────────────────────────────────── */
const CompletedTable = memo(({ items, sel, onSel, onSelAll, onDelete, page, rpp, onPage, onRpp }) => {
    const pg  = items.slice(page * rpp, page * rpp + rpp);
    const all = pg.length > 0 && pg.every(i => sel.has(i.id));
    const some = pg.length > 0 && pg.some(i => sel.has(i.id));

    return (
        <TableContainer>
            <Table size="small">
                <THead color={PALETTE.GREEN} allOnPage={all} someOnPage={some} onToggleAll={() => onSelAll(pg)}
                    extraCols={[{ label: 'Notes', width: 280 }, { label: 'Completed At / Actions', width: 190 }]} />
                <TableBody>
                    {!pg.length ? <EmptyRow colSpan={9} isFiltered={items.length === 0} /> : pg.map(item => (
                        <BaseRow key={item.id} item={item} isSelected={sel.has(item.id)} color={PALETTE.GREEN} onToggleSelect={onSel}>
                            <TableCell sx={{ py: 1.5, maxWidth: 280 }}>
                                {item.completedNote ? (
                                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.6, background: alpha(PALETTE.GREEN, 0.07), border: `1px solid ${alpha(PALETTE.GREEN, 0.2)}`, borderRadius: '4px', px: 0.8, py: 0.5 }}>
                                        <CheckCircle size={10} color={PALETTE.GREEN} style={{ flexShrink: 0, marginTop: 2 }} />
                                        <Box>
                                            <Typography variant="caption" sx={{ fontSize: '0.68rem', color: PALETTE.GREEN, fontWeight: 600, display: 'block', mb: 0.2 }}>Closing note</Typography>
                                            <Typography variant="caption" sx={{ fontSize: '0.75rem', color: '#065f46', lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{item.completedNote}</Typography>
                                        </Box>
                                    </Box>
                                ) : (
                                    <Typography variant="caption" sx={{ fontSize: '0.78rem', color: PALETTE.GRAY, fontStyle: 'italic' }}>No notes</Typography>
                                )}
                            </TableCell>
                            <TableCell sx={{ py: 1.5 }}>
                                <Typography variant="caption" sx={{ fontSize: '0.75rem', color: PALETTE.GRAY, display: 'block', mb: 0.75 }}>
                                    {item.completedAt ? formatDateTimeWithTZ(item.completedAt) : '—'}
                                </Typography>
                                <Tooltip title="Move to Recycle Bin">
                                    <IconButton size="small" onClick={() => onDelete(item)} sx={{ color: PALETTE.RED, p: '6px', '&:hover': { bgcolor: alpha(PALETTE.RED, 0.08) } }}>
                                        <Trash2 size={15} />
                                    </IconButton>
                                </Tooltip>
                            </TableCell>
                        </BaseRow>
                    ))}
                </TableBody>
            </Table>
            <Pagination color={PALETTE.GREEN} count={items.length} rowsPerPage={rpp} page={page} onPageChange={onPage} onRowsPerPageChange={onRpp} />
        </TableContainer>
    );
});
CompletedTable.displayName = 'CompletedTable';

/* ════════════════════════════════════════════════════════════════════════════
   ROOT COMPONENT
════════════════════════════════════════════════════════════════════════════ */
export default function CustomerCenter() {
    const queryClient = useQueryClient();
    const { user }    = useAuth();

    // ── Use the global snackbar instead of managing local state ──────────────
    const { showSnackbar } = useGlobalSnackbar();

    /* ── Data fetching ─────────────────────────────────────────────────────── */
    const { data: workOrders = [], isLoading } = useQuery({
        queryKey: ['work-orders'],
        queryFn: async () => {
            const response = await workOrdersApi.getAll();
            const raw = Array.isArray(response.data)
                ? response.data
                : response.data?.results ?? response.data?.data ?? [];
            return raw.map(transformRepairData);
        },
        refetchInterval: 1000,
        refetchIntervalInBackground: false,
        refetchOnWindowFocus: true,
        refetchOnMount: true,
        refetchOnReconnect: true,
        keepPreviousData: true,
        staleTime: 0,
        cacheTime: 10 * 60 * 1000,
    });

    /* ── Scraper status ──────────────────────────────────────────────────────── */
    const { data: scraperStatus } = useQuery({
        queryKey: ['scraper-status'],
        queryFn: () => rmeApi.getScraperStatus(),
        refetchInterval: 5000,
    });
    const isRunning = scraperStatus?.data?.is_running;

    /* ── Mutations ─────────────────────────────────────────────────────────── */
    // Update a single work order field(s)
    const updateWorkOrderMutation = useMutation({
        mutationFn: async ({ id, data }) => {
            const response = await workOrdersApi.patch(id, transformToAPIFormat(data));
            return transformRepairData(response.data);
        },
        onMutate: async ({ id, data }) => {
            await queryClient.cancelQueries({ queryKey: ['work-orders'] });
            const previous = queryClient.getQueryData(['work-orders']);
            updateCacheItem(queryClient, id, data);
            return { previous };
        },
        onError: (err, _, ctx) => {
            if (ctx?.previous) queryClient.setQueryData(['work-orders'], ctx.previous);
            showSnackbar(err.response?.data?.message || 'Failed to update work order', 'error');
        },
        onSettled: () => queryClient.invalidateQueries({ queryKey: ['work-orders'] }),
    });

    // Single soft-delete (move to bin)
    const softDeleteMutation = useMutation({
        mutationFn: async ({ id, data }) => {
            const response = await workOrdersApi.patch(id, transformToAPIFormat(data));
            return transformRepairData(response.data);
        },
        onMutate: async ({ id, data }) => {
            await queryClient.cancelQueries({ queryKey: ['work-orders'] });
            const previous = queryClient.getQueryData(['work-orders']);
            updateCacheItem(queryClient, id, data);
            return { previous };
        },
        onSuccess: () => showSnackbar('Repair moved to recycle bin', 'success'),
        onError: (err, _, ctx) => {
            if (ctx?.previous) queryClient.setQueryData(['work-orders'], ctx.previous);
            showSnackbar(err.response?.data?.message || 'Failed to move repair to recycle bin', 'error');
        },
        onSettled: () => queryClient.invalidateQueries({ queryKey: ['work-orders'] }),
    });

    // Bulk soft-delete
    const bulkSoftDeleteMutation = useMutation({
        mutationFn: async (ids) => {
            await Promise.all(ids.map(id =>
                workOrdersApi.patch(id, { is_deleted: true, deleted_by: user.name, deleted_by_email: user.email, deleted_date: new Date().toISOString().split('T')[0] })
            ));
            return ids;
        },
        onMutate: async (ids) => {
            await queryClient.cancelQueries({ queryKey: ['work-orders'] });
            const previous = queryClient.getQueryData(['work-orders']);
            const meta = { isDeleted: true, deletedBy: user.name, deletedByEmail: user.email, deletedDate: new Date().toISOString().split('T')[0] };
            ids.forEach(id => updateCacheItem(queryClient, id, meta));
            return { previous };
        },
        onSuccess: (ids) => showSnackbar(`${ids.length} repair(s) moved to recycle bin`, 'success'),
        onError: (err, _, ctx) => {
            if (ctx?.previous) queryClient.setQueryData(['work-orders'], ctx.previous);
            showSnackbar(err.response?.data?.message || 'Failed to move repairs to recycle bin', 'error');
        },
        onSettled: () => queryClient.invalidateQueries({ queryKey: ['work-orders'] }),
    });

    // Single restore
    const restoreMutation = useMutation({
        mutationFn: async (id) => {
            const response = await workOrdersApi.patch(id, { is_deleted: false, deleted_by: null, deleted_by_email: null, deleted_date: null });
            return transformRepairData(response.data);
        },
        onMutate: async (id) => {
            await queryClient.cancelQueries({ queryKey: ['work-orders'] });
            const previous = queryClient.getQueryData(['work-orders']);
            updateCacheItem(queryClient, id, { isDeleted: false, deletedBy: null, deletedByEmail: null, deletedDate: null });
            return { previous };
        },
        onSuccess: () => showSnackbar('Repair restored successfully', 'success'),
        onError: (err, _, ctx) => {
            if (ctx?.previous) queryClient.setQueryData(['work-orders'], ctx.previous);
            showSnackbar(err.response?.data?.message || 'Failed to restore repair', 'error');
        },
        onSettled: () => queryClient.invalidateQueries({ queryKey: ['work-orders'] }),
    });

    // Bulk restore
    const bulkRestoreMutation = useMutation({
        mutationFn: async (ids) => {
            await Promise.all(ids.map(id =>
                workOrdersApi.patch(id, { is_deleted: false, deleted_by: null, deleted_by_email: null, deleted_date: null })
            ));
            return ids;
        },
        onMutate: async (ids) => {
            await queryClient.cancelQueries({ queryKey: ['work-orders'] });
            const previous = queryClient.getQueryData(['work-orders']);
            ids.forEach(id => updateCacheItem(queryClient, id, { isDeleted: false, deletedBy: null, deletedByEmail: null, deletedDate: null }));
            return { previous };
        },
        onSuccess: (ids) => showSnackbar(`${ids.length} repair(s) restored`, 'success'),
        onError: (err, _, ctx) => {
            if (ctx?.previous) queryClient.setQueryData(['work-orders'], ctx.previous);
            showSnackbar(err.response?.data?.message || 'Failed to restore repairs', 'error');
        },
        onSettled: () => queryClient.invalidateQueries({ queryKey: ['work-orders'] }),
    });

    // Single permanent delete
    const permanentDeleteMutation = useMutation({
        mutationFn: async (id) => {
            await workOrdersApi.delete(id);
            return id;
        },
        onMutate: async (id) => {
            await queryClient.cancelQueries({ queryKey: ['work-orders'] });
            const previous = queryClient.getQueryData(['work-orders']);
            removeCacheItem(queryClient, id);
            return { previous };
        },
        onSuccess: () => showSnackbar('Repair permanently deleted', 'success'),
        onError: (err, _, ctx) => {
            if (ctx?.previous) queryClient.setQueryData(['work-orders'], ctx.previous);
            showSnackbar(err.response?.data?.message || 'Failed to permanently delete repair', 'error');
        },
        onSettled: () => queryClient.invalidateQueries({ queryKey: ['work-orders'] }),
    });

    // Bulk permanent delete
    const bulkPermanentDeleteMutation = useMutation({
        mutationFn: async (ids) => {
            await Promise.all(ids.map(id => workOrdersApi.delete(id)));
            return ids;
        },
        onMutate: async (ids) => {
            await queryClient.cancelQueries({ queryKey: ['work-orders'] });
            const previous = queryClient.getQueryData(['work-orders']);
            removeCacheItems(queryClient, ids);
            return { previous };
        },
        onSuccess: (ids) => showSnackbar(`${ids.length} repair(s) permanently deleted`, 'success'),
        onError: (err, _, ctx) => {
            if (ctx?.previous) queryClient.setQueryData(['work-orders'], ctx.previous);
            showSnackbar(err.response?.data?.message || 'Failed to permanently delete repairs', 'error');
        },
        onSettled: () => queryClient.invalidateQueries({ queryKey: ['work-orders'] }),
    });

    /* ── Local UI state ────────────────────────────────────────────────────── */
    const [selV,             setSelV]             = useState(new Set());
    const [selP,             setSelP]             = useState(new Set());
    const [selC,             setSelC]             = useState(new Set());
    const [pageV,            setPageV]            = useState(0);
    const [rppV,             setRppV]             = useState(10);
    const [pageP,            setPageP]            = useState(0);
    const [rppP,             setRppP]             = useState(10);
    const [pageC,            setPageC]            = useState(0);
    const [rppC,             setRppC]             = useState(10);
    const [searchV,          setSearchV]          = useState('');
    const [searchP,          setSearchP]          = useState('');
    const [searchC,          setSearchC]          = useState('');
    const [recycleBinSearch, setRecycleBinSearch] = useState('');
    const [moveD,            setMoveD]            = useState({ open: false, item: null });
    const [noteD,            setNoteD]            = useState({ open: false, item: null });
    const [compD,            setCompD]            = useState({ open: false, item: null });
    const [deleteD,          setDeleteD]          = useState({ open: false, item: null, isBulk: false, selSet: null, setFn: null });
    const [binOpen,          setBinOpen]          = useState(false);
    const [binLoading,       setBinLoading]       = useState(false);
    const [binPage,          setBinPage]          = useState(0);
    const [binRpp,           setBinRpp]           = useState(10);
    const [binSel,           setBinSel]           = useState(new Set());

    /* ── Derived lists ─────────────────────────────────────────────────────── */
    const items = workOrders || [];

    const viewedBase    = useMemo(() => sortOldestFirst(items.filter(i => !i.isDeleted && i.status === 'Viewed'),       'createdAt'),   [items]);
    const inProgBase    = useMemo(() => sortOldestFirst(items.filter(i => !i.isDeleted && i.status === 'In Progress'),  'createdAt'),   [items]);
    const completedBase = useMemo(() => sortNewestFirst(items.filter(i => !i.isDeleted && i.status === 'Completed'),    'completedAt'), [items]);
    const deleted       = useMemo(() => sortNewestFirst(items.filter(i =>  i.isDeleted),                                'deletedDate'), [items]);

    const viewed    = useMemo(() => applyFilter(viewedBase,    searchV), [viewedBase,    searchV]);
    const inProg    = useMemo(() => applyFilter(inProgBase,    searchP), [inProgBase,    searchP]);
    const completed = useMemo(() => applyFilter(completedBase, searchC), [completedBase, searchC]);

    const filteredDeleted = useMemo(() => {
        if (!recycleBinSearch) return deleted;
        const lq = recycleBinSearch.toLowerCase();
        return deleted.filter(i =>
            (i.customerName || '').toLowerCase().includes(lq)    ||
            (i.workOrderAddress || '').toLowerCase().includes(lq)||
            (i.tag || '').toLowerCase().includes(lq)             ||
            (i.wo || '').toLowerCase().includes(lq)              ||
            (i.deletedBy || '').toLowerCase().includes(lq)       ||
            (i.deletedByEmail || '').toLowerCase().includes(lq)
        );
    }, [deleted, recycleBinSearch]);

    // Reset pages when search changes
    React.useEffect(() => setPageV(0), [searchV]);
    React.useEffect(() => setPageP(0), [searchP]);
    React.useEffect(() => setPageC(0), [searchC]);
    React.useEffect(() => setBinPage(0), [recycleBinSearch]);

    /* ── Action handlers ───────────────────────────────────────────────────── */

    // Mark viewed timestamp
    const handleMarkViewed = useCallback(async (id) => {
        await updateWorkOrderMutation.mutateAsync({ id, data: { viewedAt: new Date().toISOString() } });
        showSnackbar('Marked as viewed', 'success');
    }, [updateWorkOrderMutation, showSnackbar]);

    // Move to in-progress
    const handleMove = useCallback(async (id, note) => {
        await updateWorkOrderMutation.mutateAsync({ id, data: { status: 'In Progress', note, submittedAt: new Date().toISOString() } });
        showSnackbar('Moved to In Progress', 'success');
        setMoveD({ open: false, item: null });
    }, [updateWorkOrderMutation, showSnackbar]);

    // Edit progress note
    const handleEditNote = useCallback(async (id, note) => {
        await updateWorkOrderMutation.mutateAsync({ id, data: { note } });
        showSnackbar('Note updated', 'success');
        setNoteD({ open: false, item: null });
    }, [updateWorkOrderMutation, showSnackbar]);

    // Mark completed
    const handleComplete = useCallback(async (id, completedNote) => {
        await updateWorkOrderMutation.mutateAsync({ id, data: { status: 'Completed', completedNote, completedAt: new Date().toISOString() } });
        setSelP(p => { const s = new Set(p); s.delete(id); return s; });
        showSnackbar('Marked as completed', 'success');
        setCompD({ open: false, item: null });
    }, [updateWorkOrderMutation, showSnackbar]);

    // Single soft-delete
    const softDelete = useCallback(async (id) => {
        await softDeleteMutation.mutateAsync({ id, data: { isDeleted: true, deletedBy: user.name, deletedByEmail: user.email, deletedDate: new Date().toISOString().split('T')[0] } });
        [setSelV, setSelP, setSelC].forEach(fn => fn(p => { const s = new Set(p); s.delete(id); return s; }));
    }, [user.name, user.email, softDeleteMutation]);

    // Bulk soft-delete
    const softDeleteBulk = useCallback(async (selSet, setFn) => {
        await bulkSoftDeleteMutation.mutateAsync(Array.from(selSet));
        setFn(new Set());
    }, [bulkSoftDeleteMutation]);

    // Single restore
    const handleRestore = useCallback(async (id) => {
        await restoreMutation.mutateAsync(id);
        setBinSel(p => { const s = new Set(p); s.delete(id); return s; });
    }, [restoreMutation]);

    // Bulk restore
    const handleBulkRestore = useCallback(async () => {
        await bulkRestoreMutation.mutateAsync(Array.from(binSel));
        setBinSel(new Set());
    }, [bulkRestoreMutation, binSel]);

    // Single permanent delete
    const handlePermanentDelete = useCallback(async (id) => {
        await permanentDeleteMutation.mutateAsync(id);
        setBinSel(p => { const s = new Set(p); s.delete(id); return s; });
    }, [permanentDeleteMutation]);

    // Bulk permanent delete
    const handleBulkPermanentDelete = useCallback(async () => {
        await bulkPermanentDeleteMutation.mutateAsync(Array.from(binSel));
        setBinSel(new Set());
    }, [bulkPermanentDeleteMutation, binSel]);

    // Selection toggle helpers
    const toggleSel = useCallback((setFn, id) => {
        setFn(p => { const s = new Set(p); s.has(id) ? s.delete(id) : s.add(id); return s; });
    }, []);

    const toggleAll = useCallback((setFn, pgItems, cur) => {
        const allSel = pgItems.every(i => cur.has(i.id));
        const ids = new Set(pgItems.map(i => i.id));
        setFn(p => { const s = new Set(p); allSel ? ids.forEach(id => s.delete(id)) : ids.forEach(id => s.add(id)); return s; });
    }, []);

    // Open recycle bin with brief loading state
    const handleOpenBin = useCallback(() => {
        setBinLoading(true);
        setBinOpen(true);
        setTimeout(() => setBinLoading(false), 400);
    }, []);

    // Delete confirm helpers
    const openSingleDeleteConfirm = useCallback((item, selSet, setFn) => setDeleteD({ open: true, item, isBulk: false, selSet, setFn }), []);
    const openBulkDeleteConfirm   = useCallback((selSet, setFn)       => setDeleteD({ open: true, item: null, isBulk: true, selSet, setFn }), []);

    const confirmDelete = useCallback(() => {
        if (deleteD.isBulk) softDeleteBulk(deleteD.selSet, deleteD.setFn);
        else softDelete(deleteD.item.id);
        setDeleteD(p => ({ ...p, open: false }));
    }, [deleteD, softDeleteBulk, softDelete]);

    if (isLoading) return <DashboardLoader />;

    return (
        <Box>
            <Helmet>
                <title>Customer Center | Sterling Septic & Plumbing LLC</title>
                <meta name="description" content="View and manage work orders" />
            </Helmet>

            {/* ── Page header ─────────────────────────────────────────────── */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
                <Box>
                    <Typography sx={{ fontWeight: 600, mb: 0.5, fontSize: '1rem', color: PALETTE.TEXT, letterSpacing: '-0.01em' }}>
                        Customer Center
                    </Typography>
                    <Typography variant="body2" sx={{ color: PALETTE.GRAY, fontSize: '0.8rem' }}>
                        Manage work orders, track progress, and view history
                    </Typography>
                </Box>
                <Stack direction="row" spacing={1.5} alignItems="center">
                    {isRunning && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1.5, py: 0.5, bgcolor: alpha(PALETTE.BLUE, 0.08), borderRadius: '20px', border: `1px solid ${alpha(PALETTE.BLUE, 0.2)}` }}>
                            <Box className="animate-pulse" sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: PALETTE.BLUE }} />
                            <Typography sx={{ fontSize: '0.72rem', fontWeight: 600, color: PALETTE.BLUE }}>
                                Scraper Running... ({scraperStatus?.data?.elapsed_minutes}m)
                            </Typography>
                        </Box>
                    )}
                    <RefreshButton onRefresh={rmeApi.startWorkOrdersTagsScraping} />
                    <Button variant="outlined" size="small" startIcon={<History size={15} />} onClick={handleOpenBin}
                        sx={{ textTransform: 'none', fontSize: '0.8rem', fontWeight: 500, height: '34px', px: 1.75, color: PALETTE.PURPLE, borderColor: alpha(PALETTE.PURPLE, 0.35), borderRadius: '6px', '&:hover': { borderColor: PALETTE.PURPLE, bgcolor: alpha(PALETTE.PURPLE, 0.05) } }}>
                        Recycle Bin ({deleted.length})
                    </Button>
                </Stack>
            </Box>

            {/* ── Viewed section ───────────────────────────────────────────── */}
            <Section title="Viewed" color={PALETTE.BLUE} count={viewedBase.length} filteredCount={viewed.length} selectedCount={selV.size}
                onDelete={() => openBulkDeleteConfirm(selV, setSelV)} tableSearch={searchV} onTableSearch={v => setSearchV(v)} tableSearchPlaceholder="Search viewed…">
                <ViewedTable items={viewed} sel={selV} onSel={id => toggleSel(setSelV, id)} onSelAll={pg => toggleAll(setSelV, pg, selV)}
                    onMove={item => setMoveD({ open: true, item })} onDelete={item => openSingleDeleteConfirm(item, selV, setSelV)} onView={handleMarkViewed}
                    page={pageV} rpp={rppV} onPage={(_, p) => setPageV(p)} onRpp={e => { setRppV(+e.target.value); setPageV(0); }} />
            </Section>

            {/* ── In Progress section ──────────────────────────────────────── */}
            <Section title="In Progress" color={PALETTE.ORANGE} count={inProgBase.length} filteredCount={inProg.length} selectedCount={selP.size}
                onDelete={() => openBulkDeleteConfirm(selP, setSelP)} tableSearch={searchP} onTableSearch={v => setSearchP(v)} tableSearchPlaceholder="Search in progress…">
                <InProgressTable items={inProg} sel={selP} onSel={id => toggleSel(setSelP, id)} onSelAll={pg => toggleAll(setSelP, pg, selP)}
                    onEditNote={item => setNoteD({ open: true, item })} onComplete={item => setCompD({ open: true, item })} onDelete={item => openSingleDeleteConfirm(item, selP, setSelP)}
                    page={pageP} rpp={rppP} onPage={(_, p) => setPageP(p)} onRpp={e => { setRppP(+e.target.value); setPageP(0); }} />
            </Section>

            {/* ── Completed section ────────────────────────────────────────── */}
            <Section title="Completed" color={PALETTE.GREEN} count={completedBase.length} filteredCount={completed.length} selectedCount={selC.size}
                onDelete={() => openBulkDeleteConfirm(selC, setSelC)} tableSearch={searchC} onTableSearch={v => setSearchC(v)} tableSearchPlaceholder="Search completed…">
                <CompletedTable items={completed} sel={selC} onSel={id => toggleSel(setSelC, id)} onSelAll={pg => toggleAll(setSelC, pg, selC)}
                    onDelete={item => openSingleDeleteConfirm(item, selC, setSelC)}
                    page={pageC} rpp={rppC} onPage={(_, p) => setPageC(p)} onRpp={e => { setRppC(+e.target.value); setPageC(0); }} />
            </Section>

            {/* ── Action dialogs ───────────────────────────────────────────── */}
            <MoveDialog    open={moveD.open} item={moveD.item} onConfirm={handleMove}    onClose={() => setMoveD({ open: false, item: null })} />
            <EditNoteDialog open={noteD.open} item={noteD.item} onSave={handleEditNote}  onClose={() => setNoteD({ open: false, item: null })} />
            <CompleteDialog open={compD.open} item={compD.item} onConfirm={handleComplete} onClose={() => setCompD({ open: false, item: null })} />
            <DeleteConfirmDialog
                open={deleteD.open}
                onClose={() => setDeleteD(p => ({ ...p, open: false }))}
                onConfirm={confirmDelete}
                isBulk={deleteD.isBulk}
                item={deleteD.item}
                count={deleteD.selSet?.size ?? 0}
            />

            {/* ── Recycle bin modal ────────────────────────────────────────── */}
            <RecycleBinModal
                open={binOpen}
                onClose={() => setBinOpen(false)}
                items={filteredDeleted}
                isLoading={binLoading}
                page={binPage}
                rowsPerPage={binRpp}
                onPageChange={(_, p) => setBinPage(p)}
                onRowsPerPageChange={e => { setBinRpp(+e.target.value); setBinPage(0); }}
                selected={binSel}
                onToggle={id => toggleSel(setBinSel, id)}
                onToggleAll={pgItems => toggleAll(setBinSel, pgItems, binSel)}
                onBulkRestore={handleBulkRestore}
                onBulkDelete={handleBulkPermanentDelete}
                onSingleRestore={item => handleRestore(item.id)}
                onSingleDelete={item => handlePermanentDelete(item.id)}
                search={recycleBinSearch}
                onSearchChange={setRecycleBinSearch}
            />
        </Box>
    );
}