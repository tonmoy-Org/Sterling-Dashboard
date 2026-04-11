import React, { useMemo, useState } from 'react';
import {
    Modal,
    Box,
    Typography,
    TableContainer,
    Table,
    TableHead,
    TableBody,
    TableRow,
    TableCell,
    TablePagination,
    Checkbox,
    Button,
    IconButton,
    Tooltip,
    Stack,
    CircularProgress,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
    History,
    X,
    RotateCcw,
    Trash2,
    AlertCircle,
} from 'lucide-react';
import { useTheme, useMediaQuery } from '@mui/material';

const PURPLE_COLOR = '#8b5cf6';
const GREEN_COLOR = '#10b981';
const RED_COLOR = '#ef4444';
const GRAY_COLOR = '#6b7280';
const TEXT_COLOR = '#0F1115';

const RecycleBinModal = ({
    open,
    onClose,
    recycleBinItems,
    isRecycleBinLoading,
    recycleBinSearch,
    setRecycleBinSearch,
    recycleBinPage,
    recycleBinRowsPerPage,
    handleChangeRecycleBinPage,
    handleChangeRecycleBinRowsPerPage,
    selectedRecycleBinItems,
    toggleRecycleBinSelection,
    toggleAllRecycleBinSelection,
    confirmBulkRestore,
    confirmBulkPermanentDelete,
    handleSingleRestore,
    handleSinglePermanentDelete,
    formatDateShort,
}) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    const [deleteConfirmModal, setDeleteConfirmModal] = useState({
        open: false,
        item: null,
        isBulk: false,
        isLoading: false,
    });

    const filteredRecycleBinItems = useMemo(() => {
        if (!recycleBinSearch) return recycleBinItems;
        const searchLower = recycleBinSearch.toLowerCase();
        return recycleBinItems.filter(item =>
            item.workOrderNumber?.toLowerCase().includes(searchLower) ||
            item.name?.toLowerCase().includes(searchLower) ||
            item.address?.toLowerCase().includes(searchLower) ||
            item.deletedBy?.toLowerCase().includes(searchLower) ||
            item.deletedByEmail?.toLowerCase().includes(searchLower)
        );
    }, [recycleBinItems, recycleBinSearch]);

    const recycleBinPageItems = useMemo(() => {
        return filteredRecycleBinItems.slice(
            recycleBinPage * recycleBinRowsPerPage,
            recycleBinPage * recycleBinRowsPerPage + recycleBinRowsPerPage
        );
    }, [filteredRecycleBinItems, recycleBinPage, recycleBinRowsPerPage]);

    const allSelectedOnPage = recycleBinPageItems.length > 0 &&
        recycleBinPageItems.every(item => selectedRecycleBinItems.has(item.id));

    const someSelectedOnPage = recycleBinPageItems.length > 0 &&
        recycleBinPageItems.some(item => selectedRecycleBinItems.has(item.id)) && !allSelectedOnPage;

    const parseAddressForDisplay = (address) => {
        if (!address) return { street: '', cityState: '—' };
        const parts = address.split(' - ');
        if (parts.length < 2) return { street: address, cityState: '' };
        return { street: parts[0].trim(), cityState: parts[1].trim() };
    };

    // ── open confirm for single item ──────────────────────────────────────────
    const handleDeleteWithConfirmation = (item) => {
        setDeleteConfirmModal({ open: true, item, isBulk: false, isLoading: false });
    };

    // ── open confirm for bulk ────────────────────────────────────────────────
    const handleBulkDeleteWithConfirmation = () => {
        if (selectedRecycleBinItems.size === 0) return;
        setDeleteConfirmModal({ open: true, item: null, isBulk: true, isLoading: false });
    };

    // ── execute after user clicks "Delete Permanently" ───────────────────────
    const confirmDelete = async () => {
        setDeleteConfirmModal(prev => ({ ...prev, isLoading: true }));
        try {
            if (deleteConfirmModal.isBulk) {
                await confirmBulkPermanentDelete();
            } else if (deleteConfirmModal.item) {
                await handleSinglePermanentDelete(deleteConfirmModal.item);
            }
            setDeleteConfirmModal({ open: false, item: null, isBulk: false, isLoading: false });
        } catch {
            setDeleteConfirmModal(prev => ({ ...prev, isLoading: false }));
        }
    };

    const cancelDelete = () => {
        setDeleteConfirmModal({ open: false, item: null, isBulk: false, isLoading: false });
    };

    return (
        <>
            {/* ════════════════════════════════════════════════════════════════
                MAIN RECYCLE-BIN MODAL
            ════════════════════════════════════════════════════════════════ */}
            <Modal
                open={open}
                onClose={onClose}
                aria-labelledby="recycle-bin-modal"
                sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
                <Box sx={{
                    width: isMobile ? '100%' : '95%',
                    maxWidth: 1400,
                    maxHeight: '90vh',
                    bgcolor: 'white',
                    borderRadius: '8px',
                    boxShadow: '0 25px 60px rgba(0,0,0,0.15)',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    m: isMobile ? 1 : 0,
                    scrollbarGutter: 'stable',
                }}>

                    {/* ── Header ────────────────────────────────────────────── */}
                    <Box sx={{
                        p: isMobile ? 1.5 : 2,
                        borderBottom: `1px solid ${alpha(PURPLE_COLOR, 0.12)}`,
                        background: `linear-gradient(135deg, ${alpha(PURPLE_COLOR, 0.06)} 0%, ${alpha(PURPLE_COLOR, 0.02)} 100%)`,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                    }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Box sx={{
                                width: 42,
                                height: 42,
                                borderRadius: '10px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: `linear-gradient(135deg, ${alpha(PURPLE_COLOR, 0.15)} 0%, ${alpha(PURPLE_COLOR, 0.08)} 100%)`,
                                color: PURPLE_COLOR,
                                border: `1px solid ${alpha(PURPLE_COLOR, 0.15)}`,
                            }}>
                                <History size={20} />
                            </Box>
                            <Box>
                                <Typography variant="h6" sx={{
                                    fontSize: isMobile ? '0.9rem' : '1rem',
                                    fontWeight: 700,
                                    color: TEXT_COLOR,
                                    letterSpacing: '-0.01em',
                                }}>
                                    Recycle Bin
                                </Typography>
                                <Typography variant="body2" sx={{ fontSize: '0.78rem', color: GRAY_COLOR }}>
                                    {filteredRecycleBinItems.length} deleted item(s) · Restore or permanently delete
                                </Typography>
                            </Box>
                        </Box>
                        <IconButton
                            size="small"
                            onClick={onClose}
                            sx={{
                                color: GRAY_COLOR,
                                borderRadius: '8px',
                                '&:hover': {
                                    backgroundColor: alpha(GRAY_COLOR, 0.1),
                                    color: TEXT_COLOR,
                                },
                            }}
                        >
                            <X size={18} />
                        </IconButton>
                    </Box>

                    {/* ── Toolbar ───────────────────────────────────────────── */}
                    <Box sx={{
                        px: isMobile ? 1.5 : 2,
                        py: 1.25,
                        borderBottom: `1px solid ${alpha(PURPLE_COLOR, 0.08)}`,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: 2,
                        flexDirection: isMobile ? 'column' : 'row',
                        bgcolor: '#fafbfc',
                    }}>
                        <Box sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                            width: isMobile ? '100%' : 'auto',
                            flexWrap: isMobile ? 'wrap' : 'nowrap',
                        }}>
                            <Checkbox
                                size="small"
                                checked={allSelectedOnPage}
                                indeterminate={someSelectedOnPage}
                                onChange={toggleAllRecycleBinSelection}
                                sx={{
                                    padding: '4px',
                                    color: alpha(PURPLE_COLOR, 0.4),
                                    '&.Mui-checked': { color: PURPLE_COLOR },
                                    '&.MuiCheckbox-indeterminate': { color: PURPLE_COLOR },
                                }}
                            />

                            {/* Search */}
                            <Box sx={{ flex: 1, position: 'relative', minWidth: isMobile ? '100%' : 260 }}>
                                <input
                                    type="text"
                                    value={recycleBinSearch}
                                    onChange={(e) => setRecycleBinSearch(e.target.value)}
                                    placeholder="Search deleted items…"
                                    style={{
                                        width: '100%',
                                        padding: '7px 36px 7px 34px',
                                        borderRadius: '6px',
                                        border: `1.5px solid ${alpha(PURPLE_COLOR, 0.18)}`,
                                        fontSize: '0.82rem',
                                        outline: 'none',
                                        background: 'white',
                                        color: TEXT_COLOR,
                                        transition: 'border-color 0.2s, box-shadow 0.2s',
                                        boxSizing: 'border-box',
                                    }}
                                    onFocus={(e) => {
                                        e.target.style.borderColor = PURPLE_COLOR;
                                        e.target.style.boxShadow = `0 0 0 3px ${alpha(PURPLE_COLOR, 0.1)}`;
                                    }}
                                    onBlur={(e) => {
                                        e.target.style.borderColor = alpha(PURPLE_COLOR, 0.18);
                                        e.target.style.boxShadow = 'none';
                                    }}
                                />
                                <Box sx={{
                                    position: 'absolute', left: '10px', top: '50%',
                                    transform: 'translateY(-50%)', display: 'flex', alignItems: 'center',
                                    pointerEvents: 'none',
                                }}>
                                    <History size={15} color={alpha(GRAY_COLOR, 0.6)} />
                                </Box>
                                {recycleBinSearch && (
                                    <IconButton
                                        size="small"
                                        onClick={() => setRecycleBinSearch('')}
                                        sx={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', padding: '2px' }}
                                    >
                                        <X size={14} />
                                    </IconButton>
                                )}
                            </Box>
                        </Box>

                        {/* Bulk action buttons */}
                        <Box sx={{
                            display: 'flex', gap: 1,
                            width: isMobile ? '100%' : 'auto',
                            mt: isMobile ? 0.5 : 0,
                        }}>
                            <Button
                                variant="outlined"
                                size="small"
                                startIcon={<RotateCcw size={13} />}
                                onClick={confirmBulkRestore}
                                disabled={selectedRecycleBinItems.size === 0}
                                sx={{
                                    textTransform: 'none',
                                    fontSize: '0.78rem',
                                    fontWeight: 500,
                                    color: GREEN_COLOR,
                                    borderColor: alpha(GREEN_COLOR, 0.35),
                                    borderRadius: '6px',
                                    px: 1.5,
                                    '&:hover': {
                                        borderColor: GREEN_COLOR,
                                        backgroundColor: alpha(GREEN_COLOR, 0.06),
                                    },
                                    '&.Mui-disabled': { opacity: 0.45 },
                                }}
                            >
                                Restore ({selectedRecycleBinItems.size})
                            </Button>
                            <Button
                                variant="outlined"
                                size="small"
                                startIcon={<Trash2 size={13} />}
                                onClick={handleBulkDeleteWithConfirmation}
                                disabled={selectedRecycleBinItems.size === 0}
                                sx={{
                                    textTransform: 'none',
                                    fontSize: '0.78rem',
                                    fontWeight: 500,
                                    color: RED_COLOR,
                                    borderColor: alpha(RED_COLOR, 0.35),
                                    borderRadius: '6px',
                                    px: 1.5,
                                    '&:hover': {
                                        borderColor: RED_COLOR,
                                        backgroundColor: alpha(RED_COLOR, 0.06),
                                    },
                                    '&.Mui-disabled': { opacity: 0.45 },
                                }}
                            >
                                Delete ({selectedRecycleBinItems.size})
                            </Button>
                        </Box>
                    </Box>

                    {/* ── Content ───────────────────────────────────────────── */}
                    <Box sx={{
                        flex: 1,
                        overflowY: 'auto',
                        overflowX: 'hidden',
                        scrollbarWidth: 'thin',
                        scrollbarColor: `${alpha(PURPLE_COLOR, 0.2)} transparent`,
                        '&::-webkit-scrollbar': { width: '4px' },
                        '&::-webkit-scrollbar-track': { background: 'transparent' },
                        '&::-webkit-scrollbar-thumb': {
                            background: alpha(PURPLE_COLOR, 0.2),
                            borderRadius: '4px',
                            '&:hover': { background: alpha(PURPLE_COLOR, 0.35) },
                        },
                    }}>
                        {isRecycleBinLoading ? (
                            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                                <CircularProgress size={24} sx={{ color: PURPLE_COLOR }} />
                            </Box>
                        ) : filteredRecycleBinItems.length === 0 ? (
                            <Box sx={{ textAlign: 'center', py: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                                <History size={48} color={alpha(GRAY_COLOR, 0.3)} />
                                <Typography variant="body2" sx={{
                                    mt: 2,
                                    color: GRAY_COLOR,
                                    fontSize: '0.9rem',
                                }}>
                                    {recycleBinSearch ? 'No matching deleted items found' : 'No deleted items in recycle bin'}
                                </Typography>
                                <Typography variant="caption" sx={{
                                    color: GRAY_COLOR,
                                    fontSize: '0.8rem',
                                }}>
                                    {recycleBinSearch ? 'Try a different search term' : 'Deleted items will appear here'}
                                </Typography>
                            </Box>
                        ) : (
                            <TableContainer sx={{
                                overflowX: 'auto',
                                scrollbarWidth: 'thin',
                                scrollbarColor: `${alpha(PURPLE_COLOR, 0.15)} transparent`,
                                '&::-webkit-scrollbar': { height: '4px' },
                                '&::-webkit-scrollbar-thumb': {
                                    background: alpha(PURPLE_COLOR, 0.2),
                                    borderRadius: '4px',
                                },
                            }}>
                                <Table size="small" sx={{ minWidth: isMobile ? 1000 : 'auto' }}>
                                    <TableHead>
                                        <TableRow sx={{
                                            bgcolor: alpha(PURPLE_COLOR, 0.03),
                                            '& th': {
                                                borderBottom: `2px solid ${alpha(PURPLE_COLOR, 0.1)}`,
                                                fontWeight: 600,
                                                fontSize: isMobile ? '0.73rem' : '0.78rem',
                                                color: TEXT_COLOR,
                                                py: 1.5,
                                                px: 1.5,
                                                whiteSpace: 'nowrap',
                                                letterSpacing: '0.01em',
                                            },
                                        }}>
                                            <TableCell padding="checkbox" width={50} />
                                            <TableCell sx={{ minWidth: 130 }}>Work Order</TableCell>
                                            <TableCell sx={{ minWidth: 180 }}>Customer</TableCell>
                                            <TableCell sx={{ minWidth: 200 }}>Address</TableCell>
                                            <TableCell sx={{ minWidth: 130 }}>Stage</TableCell>
                                            <TableCell sx={{ minWidth: 140 }}>Deleted By</TableCell>
                                            <TableCell sx={{ minWidth: 130 }}>Deleted At</TableCell>
                                            <TableCell width={130} sx={{ minWidth: 120 }}>Actions</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {recycleBinPageItems.map((item) => {
                                            const isSelected = selectedRecycleBinItems.has(item.id);
                                            const workOrderNumber =
                                                item.workOrderNumber ||
                                                `REP-${item.workOrderId?.toString().padStart(4, '0')}` ||
                                                'N/A';
                                            const address = parseAddressForDisplay(item.address);
                                            const stage = item.stageName || item.stage || 'Unknown';
                                            const stageColor = item.stageColor || GRAY_COLOR;

                                            return (
                                                <TableRow
                                                    key={item.id}
                                                    hover
                                                    sx={{
                                                        bgcolor: isSelected
                                                            ? alpha(PURPLE_COLOR, 0.07)
                                                            : 'white',
                                                        transition: 'background-color 0.15s',
                                                        '&:hover': {
                                                            backgroundColor: isSelected
                                                                ? alpha(PURPLE_COLOR, 0.1)
                                                                : alpha(PURPLE_COLOR, 0.03),
                                                        },
                                                        '&:last-child td': { borderBottom: 'none' },
                                                    }}
                                                >
                                                    <TableCell padding="checkbox">
                                                        <Checkbox
                                                            size="small"
                                                            checked={isSelected}
                                                            onChange={() => toggleRecycleBinSelection(item.id)}
                                                            sx={{
                                                                padding: '4px',
                                                                color: alpha(PURPLE_COLOR, 0.4),
                                                                '&.Mui-checked': { color: PURPLE_COLOR },
                                                            }}
                                                        />
                                                    </TableCell>

                                                    {/* Work Order */}
                                                    <TableCell>
                                                        <Typography variant="body2" sx={{
                                                            fontSize: isMobile ? '0.78rem' : '0.83rem',
                                                            fontWeight: 600,
                                                            color: PURPLE_COLOR,
                                                        }}>
                                                            {workOrderNumber}
                                                        </Typography>
                                                        <Typography variant="caption" sx={{ fontSize: '0.72rem', color: GRAY_COLOR }}>
                                                            Repair Job
                                                        </Typography>
                                                    </TableCell>

                                                    {/* Customer */}
                                                    <TableCell>
                                                        <Typography variant="body2" sx={{
                                                            fontSize: isMobile ? '0.78rem' : '0.83rem',
                                                            fontWeight: 500,
                                                            color: TEXT_COLOR,
                                                        }}>
                                                            {item.name || '—'}
                                                        </Typography>
                                                    </TableCell>

                                                    {/* Address */}
                                                    <TableCell>
                                                        <Typography variant="body2" sx={{
                                                            fontSize: isMobile ? '0.78rem' : '0.83rem',
                                                            color: TEXT_COLOR,
                                                        }}>
                                                            {address.street || '—'}
                                                        </Typography>
                                                        {address.cityState && (
                                                            <Typography variant="caption" sx={{ fontSize: '0.72rem', color: GRAY_COLOR }}>
                                                                {address.cityState}
                                                            </Typography>
                                                        )}
                                                    </TableCell>

                                                    {/* Stage */}
                                                    <TableCell>
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                                                            <Box sx={{
                                                                width: 8, height: 8,
                                                                borderRadius: '50%',
                                                                backgroundColor: stageColor,
                                                                flexShrink: 0,
                                                            }} />
                                                            <Typography variant="body2" sx={{
                                                                fontSize: isMobile ? '0.78rem' : '0.83rem',
                                                                color: TEXT_COLOR,
                                                            }}>
                                                                {stage}
                                                            </Typography>
                                                        </Box>
                                                    </TableCell>

                                                    {/* Deleted By */}
                                                    <TableCell>
                                                        <Typography variant="body2" sx={{
                                                            fontSize: isMobile ? '0.78rem' : '0.83rem',
                                                            color: TEXT_COLOR,
                                                        }}>
                                                            {item.deletedBy || 'Unknown'}
                                                        </Typography>
                                                        {item.deletedByEmail && !isMobile && (
                                                            <Typography variant="caption" sx={{ fontSize: '0.72rem', color: GRAY_COLOR }}>
                                                                {item.deletedByEmail}
                                                            </Typography>
                                                        )}
                                                    </TableCell>

                                                    {/* Deleted At */}
                                                    <TableCell>
                                                        <Typography variant="body2" sx={{
                                                            fontSize: isMobile ? '0.78rem' : '0.83rem',
                                                            color: TEXT_COLOR,
                                                        }}>
                                                            {formatDateShort
                                                                ? formatDateShort(item.deletedDate)
                                                                : item.deletedDate
                                                                    ? new Date(item.deletedDate).toLocaleDateString()
                                                                    : '—'}
                                                        </Typography>
                                                    </TableCell>

                                                    {/* Actions */}
                                                    <TableCell>
                                                        <Stack direction="row" spacing={0.25}>
                                                            <Tooltip title="Restore" arrow>
                                                                <IconButton
                                                                    size="small"
                                                                    onClick={() => handleSingleRestore(item)}
                                                                    sx={{
                                                                        color: GREEN_COLOR,
                                                                        borderRadius: '6px',
                                                                        p: 0.75,
                                                                        '&:hover': {
                                                                            backgroundColor: alpha(GREEN_COLOR, 0.1),
                                                                        },
                                                                    }}
                                                                >
                                                                    <RotateCcw size={15} />
                                                                </IconButton>
                                                            </Tooltip>
                                                            <Tooltip title="Delete Permanently" arrow>
                                                                <IconButton
                                                                    size="small"
                                                                    onClick={() => handleDeleteWithConfirmation(item)}
                                                                    sx={{
                                                                        color: RED_COLOR,
                                                                        borderRadius: '6px',
                                                                        p: 0.75,
                                                                        '&:hover': {
                                                                            backgroundColor: alpha(RED_COLOR, 0.1),
                                                                        },
                                                                    }}
                                                                >
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

                    {/* ── Pagination ────────────────────────────────────────── */}
                    {filteredRecycleBinItems.length > 0 && (
                        <Box sx={{
                            borderTop: `1px solid ${alpha(PURPLE_COLOR, 0.08)}`,
                            bgcolor: '#fafbfc',
                        }}>
                            <TablePagination
                                rowsPerPageOptions={[5, 10, 25, 50]}
                                component="div"
                                count={filteredRecycleBinItems.length}
                                rowsPerPage={recycleBinRowsPerPage}
                                page={recycleBinPage}
                                onPageChange={handleChangeRecycleBinPage}
                                onRowsPerPageChange={handleChangeRecycleBinRowsPerPage}
                                sx={{
                                    '& .MuiTablePagination-toolbar': { minHeight: '44px' },
                                    '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
                                        fontSize: '0.78rem',
                                        color: GRAY_COLOR,
                                    },
                                }}
                            />
                        </Box>
                    )}
                </Box>
            </Modal>

            {/* ════════════════════════════════════════════════════════════════
                DELETE CONFIRMATION DIALOG  –  no window.confirm() anywhere
            ════════════════════════════════════════════════════════════════ */}
            <Dialog
                open={deleteConfirmModal.open}
                onClose={cancelDelete}
                maxWidth="xs"
                fullWidth
                PaperProps={{
                    sx: {
                        bgcolor: 'white',
                        borderRadius: '12px',
                        border: `1px solid ${alpha(RED_COLOR, 0.12)}`,
                        boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
                        overflow: 'hidden',
                    },
                }}
            >
                {/* Dialog header */}
                <DialogTitle sx={{
                    borderBottom: `1px solid ${alpha(RED_COLOR, 0.1)}`,
                    pb: 1.5,
                    pt: 2,
                    px: 2.5,
                    background: `linear-gradient(135deg, ${alpha(RED_COLOR, 0.05)} 0%, transparent 100%)`,
                }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Box sx={{
                            width: 36,
                            height: 36,
                            borderRadius: '9px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: `linear-gradient(135deg, ${alpha(RED_COLOR, 0.15)}, ${alpha(RED_COLOR, 0.08)})`,
                            color: RED_COLOR,
                            border: `1px solid ${alpha(RED_COLOR, 0.15)}`,
                            flexShrink: 0,
                        }}>
                            <Trash2 size={17} />
                        </Box>
                        <Box>
                            <Typography variant="h6" sx={{
                                color: TEXT_COLOR,
                                fontSize: '0.92rem',
                                fontWeight: 700,
                                lineHeight: 1.2,
                            }}>
                                {deleteConfirmModal.isBulk ? 'Delete Items Permanently' : 'Delete Item Permanently'}
                            </Typography>
                            <Typography variant="caption" sx={{ color: GRAY_COLOR, fontSize: '0.75rem' }}>
                                Permanently delete from recycle bin
                            </Typography>
                        </Box>
                    </Box>
                </DialogTitle>

                {/* Dialog body */}
                <DialogContent sx={{ pt: 2.5, pb: 1.5, px: 2.5 }}>
                    {deleteConfirmModal.isBulk ? (
                        <Typography variant="body2" sx={deleteMessageStyle}>
                            Are you sure you want to permanently delete{' '}
                            <Box component="strong" sx={{ color: RED_COLOR }}>
                                {selectedRecycleBinItems.size} item(s)
                            </Box>{' '}
                            from the recycle bin?
                        </Typography>
                    ) : deleteConfirmModal.item && (
                        <Typography variant="body2" sx={deleteMessageStyle}>
                            Are you sure you want to permanently delete work order{' '}
                            <Box component="strong" sx={{ color: RED_COLOR }}>
                                {deleteConfirmModal.item.workOrderNumber || 'N/A'}
                            </Box>{' '}
                            for{' '}
                            <Box component="strong">
                                {deleteConfirmModal.item.name || 'Unknown Customer'}
                            </Box>?
                        </Typography>
                    )}

                    <Box sx={deleteNoteBoxStyle}>
                        <AlertCircle size={17} color={RED_COLOR} style={{ flexShrink: 0, marginTop: 1 }} />
                        <Box>
                            <Typography variant="body2" sx={deleteNoteTitleStyle}>
                                Warning — cannot be undone
                            </Typography>
                            <Typography variant="caption" sx={deleteNoteTextStyle}>
                                This data will be permanently erased and cannot be recovered.
                            </Typography>
                        </Box>
                    </Box>
                </DialogContent>

                {/* Dialog actions */}
                <DialogActions sx={{ p: 2, pt: 1.5, gap: 1 }}>
                    <Button
                        onClick={cancelDelete}
                        disabled={deleteConfirmModal.isLoading}
                        sx={deleteCancelButtonStyle}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={confirmDelete}
                        disabled={deleteConfirmModal.isLoading}
                        variant="contained"
                        startIcon={deleteConfirmModal.isLoading ? null : <Trash2 size={15} />}
                        sx={deleteConfirmButtonStyle}
                    >
                        {deleteConfirmModal.isLoading ? 'Deleting…' : 'Delete Permanently'}
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
};

/* ── Style objects ────────────────────────────────────────────────────────── */

const deleteMessageStyle = {
    color: TEXT_COLOR,
    fontSize: '0.85rem',
    fontWeight: 400,
    mb: 2,
    lineHeight: 1.6,
};

const deleteNoteBoxStyle = {
    p: 1.5,
    borderRadius: '8px',
    backgroundColor: alpha(RED_COLOR, 0.05),
    border: `1px solid ${alpha(RED_COLOR, 0.12)}`,
    display: 'flex',
    alignItems: 'flex-start',
    gap: 1.25,
};

const deleteNoteTitleStyle = {
    color: RED_COLOR,
    fontSize: '0.82rem',
    fontWeight: 600,
    mb: 0.25,
};

const deleteNoteTextStyle = {
    color: TEXT_COLOR,
    fontSize: '0.78rem',
    fontWeight: 400,
    opacity: 0.75,
};

const deleteCancelButtonStyle = {
    textTransform: 'none',
    color: GRAY_COLOR,
    fontSize: '0.83rem',
    fontWeight: 500,
    px: 2,
    borderRadius: '7px',
    border: `1px solid ${alpha(GRAY_COLOR, 0.25)}`,
    '&:hover': {
        backgroundColor: alpha(GRAY_COLOR, 0.06),
        borderColor: alpha(GRAY_COLOR, 0.4),
    },
};

const deleteConfirmButtonStyle = {
    textTransform: 'none',
    fontSize: '0.83rem',
    fontWeight: 600,
    px: 2,
    borderRadius: '7px',
    bgcolor: RED_COLOR,
    boxShadow: `0 4px 14px ${alpha(RED_COLOR, 0.35)}`,
    '&:hover': {
        bgcolor: alpha(RED_COLOR, 0.88),
        boxShadow: `0 6px 18px ${alpha(RED_COLOR, 0.4)}`,
    },
    '&.Mui-disabled': { opacity: 0.6 },
};

export default RecycleBinModal;