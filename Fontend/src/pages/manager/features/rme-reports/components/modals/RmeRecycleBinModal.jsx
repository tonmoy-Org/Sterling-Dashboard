import React, { useMemo } from 'react';
import {
    Modal,
    Box,
    Typography,
    IconButton,
    TableContainer,
    Table,
    TableHead,
    TableBody,
    TableRow,
    TableCell,
    Checkbox,
    Button,
    Tooltip,
    Stack,
    InputAdornment,
    TablePagination,
    Link
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { useTheme } from '@mui/material';
import { X, Search, Trash2, RotateCcw, History } from 'lucide-react';
import StyledTextField from '../../../../../../components/ui/StyledTextField';
import {
    formatFinalizedDate
} from '../../utils/formatters';
import {
    PURPLE_COLOR,
    GRAY_COLOR,
    TEXT_COLOR,
    GREEN_COLOR,
    RED_COLOR
} from '../../utils/constants';

const RmeRecycleBinModal = ({
    open,
    onClose,
    recycleBinItems = [],
    isRecycleBinLoading = false,
    recycleBinSearch = '',
    setRecycleBinSearch = () => { },
    recycleBinPage = 0,
    recycleBinRowsPerPage = 10,
    handleChangeRecycleBinPage = () => { },
    handleChangeRecycleBinRowsPerPage = () => { },
    selectedRecycleBinItems = new Set(),
    toggleRecycleBinSelection = () => { },
    toggleAllRecycleBinSelection = () => { },
    confirmBulkRestore = () => { },
    confirmBulkPermanentDelete = () => { },
    handleSingleRestore = () => { },
    handleSinglePermanentDelete = () => { },
    restoreFromRecycleBinMutation = { isPending: false },
    permanentDeleteFromRecycleBinMutation = { isPending: false },
    bulkRestoreMutation = { isPending: false },
    bulkPermanentDeleteMutation = { isPending: false },
    isMobile = false,
    isSmallMobile = false,
}) => {
    const theme = useTheme();

    // Filter by search only - no sorting
    const filteredRecycleBinItems = useMemo(() => {
        if (!recycleBinSearch) {
            return recycleBinItems;
        }

        const searchLower = recycleBinSearch.toLowerCase();
        return recycleBinItems.filter(item => {
            return (
                (item.wo_number || 'N/A').toLowerCase().includes(searchLower) ||
                (item.technician || 'Unassigned').toLowerCase().includes(searchLower) ||
                (item.full_address || '').toLowerCase().includes(searchLower) ||
                (item.deleted_by || 'Unknown').toLowerCase().includes(searchLower)
            );
        });
    }, [recycleBinItems, recycleBinSearch]);

    // Paginate filtered items
    const recycleBinPageItems = useMemo(() => {
        return filteredRecycleBinItems.slice(
            recycleBinPage * recycleBinRowsPerPage,
            recycleBinPage * recycleBinRowsPerPage + recycleBinRowsPerPage
        );
    }, [filteredRecycleBinItems, recycleBinPage, recycleBinRowsPerPage]);

    const allSelectedOnPage = recycleBinPageItems.length > 0 &&
        recycleBinPageItems.every(item =>
            selectedRecycleBinItems.has(item.id?.toString() || item.id)
        );

    const someSelectedOnPage = recycleBinPageItems.length > 0 &&
        recycleBinPageItems.some(item =>
            selectedRecycleBinItems.has(item.id?.toString() || item.id)
        ) && !allSelectedOnPage;

    return (
        <Modal
            open={open}
            onClose={onClose}
            aria-labelledby="recycle-bin-modal"
            sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            }}
        >
            <Box sx={{
                width: isMobile ? '100%' : '95%',
                maxWidth: 1400,
                maxHeight: '90vh',
                bgcolor: 'white',
                borderRadius: '4px',
                boxShadow: 24,
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                m: isMobile ? 1 : 0,
            }}>
                {/* Header */}
                <Box sx={{
                    p: 1,
                    borderBottom: `1px solid ${alpha(PURPLE_COLOR, 0.1)}`,
                    bgcolor: alpha(PURPLE_COLOR, 0.03),
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Box sx={{
                            width: 40,
                            height: 40,
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: alpha(PURPLE_COLOR, 0.1),
                            color: PURPLE_COLOR,
                        }}>
                            <History size={20} />
                        </Box>
                        <Box>
                            <Typography variant="h6" sx={{
                                fontSize: '1rem',
                                fontWeight: 600,
                                color: TEXT_COLOR,
                                mb: 0.5,
                            }}>
                                Recycle Bin
                            </Typography>
                            <Typography variant="body2" sx={{
                                fontSize: '0.85rem',
                                color: GRAY_COLOR,
                            }}>
                                {filteredRecycleBinItems.length} deleted work order(s) • Restore or permanently delete
                            </Typography>
                        </Box>
                    </Box>
                    <IconButton
                        size="small"
                        onClick={onClose}
                        sx={{
                            color: GRAY_COLOR,
                            '&:hover': { backgroundColor: alpha(GRAY_COLOR, 0.1) },
                        }}
                    >
                        <X size={20} />
                    </IconButton>
                </Box>

                {/* Toolbar */}
                <Box sx={{
                    p: 1.5,
                    borderBottom: `1px solid ${alpha(PURPLE_COLOR, 0.1)}`,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 2,
                    flexDirection: isMobile ? 'column' : 'row',
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
                                color: PURPLE_COLOR,
                                '&.Mui-checked': { color: PURPLE_COLOR },
                            }}
                        />
                        <Box sx={{ width: isMobile ? '100%' : 300 }}>
                            <StyledTextField
                                size="small"
                                placeholder="Search deleted work orders..."
                                value={recycleBinSearch}
                                onChange={(e) => setRecycleBinSearch(e.target.value)}
                                sx={{
                                    width: '100%',
                                    '& .MuiInputBase-root': {
                                        fontSize: '0.8rem',
                                        height: '36px',
                                    },
                                }}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <Search size={16} color={GRAY_COLOR} />
                                        </InputAdornment>
                                    ),
                                    endAdornment: recycleBinSearch && (
                                        <InputAdornment position="end">
                                            <IconButton
                                                size="small"
                                                onClick={() => setRecycleBinSearch('')}
                                                edge="end"
                                                sx={{ p: 0.5 }}
                                            >
                                                <X size={16} />
                                            </IconButton>
                                        </InputAdornment>
                                    ),
                                }}
                            />
                        </Box>
                    </Box>
                    <Box sx={{
                        display: 'flex',
                        gap: 1,
                        width: isMobile ? '100%' : 'auto',
                        mt: isMobile ? 1 : 0,
                        flexWrap: isMobile ? 'wrap' : 'nowrap',
                    }}>
                        <Button
                            variant="outlined"
                            size="small"
                            startIcon={<RotateCcw size={14} />}
                            onClick={confirmBulkRestore}
                            disabled={selectedRecycleBinItems.size === 0 || bulkRestoreMutation?.isPending}
                            sx={{
                                textTransform: 'none',
                                fontSize: '0.75rem',
                                color: GREEN_COLOR,
                                borderColor: alpha(GREEN_COLOR, 0.3),
                                '&:hover': {
                                    borderColor: GREEN_COLOR,
                                    backgroundColor: alpha(GREEN_COLOR, 0.05),
                                },
                            }}
                        >
                            Restore ({selectedRecycleBinItems.size})
                        </Button>
                        <Button
                            variant="outlined"
                            size="small"
                            startIcon={<Trash2 size={14} />}
                            onClick={confirmBulkPermanentDelete}
                            disabled={selectedRecycleBinItems.size === 0 || bulkPermanentDeleteMutation?.isPending}
                            sx={{
                                textTransform: 'none',
                                fontSize: '0.75rem',
                                color: RED_COLOR,
                                borderColor: alpha(RED_COLOR, 0.3),
                                '&:hover': {
                                    borderColor: RED_COLOR,
                                    backgroundColor: alpha(RED_COLOR, 0.05),
                                },
                            }}
                        >
                            Delete ({selectedRecycleBinItems.size})
                        </Button>
                    </Box>
                </Box>

                {/* Table */}
                <Box sx={{
                    flex: 1,
                    overflow: 'auto',
                    overflowX: 'hidden',
                    scrollbarWidth: 'thin',
                    '&::-webkit-scrollbar': { width: '4px' },
                    '&::-webkit-scrollbar-track': { background: '#f1f5f9', borderRadius: '4px' },
                    '&::-webkit-scrollbar-thumb': {
                        background: '#cbd5e0',
                        borderRadius: '4px',
                        '&:hover': { background: '#94a3b8' },
                    },
                }}>
                    {isRecycleBinLoading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <Box sx={{
                                    width: 24,
                                    height: 24,
                                    borderRadius: '50%',
                                    border: `2px solid ${alpha(PURPLE_COLOR, 0.3)}`,
                                    borderTopColor: PURPLE_COLOR,
                                    animation: 'spin 1s linear infinite',
                                    '@keyframes spin': {
                                        '0%': { transform: 'rotate(0deg)' },
                                        '100%': { transform: 'rotate(360deg)' },
                                    },
                                }} />
                                <Typography variant="body2" sx={{ color: GRAY_COLOR, fontSize: '0.85rem' }}>
                                    Loading...
                                </Typography>
                            </Box>
                        </Box>
                    ) : filteredRecycleBinItems.length === 0 ? (
                        <Box sx={{ textAlign: 'center', py: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                            <History size={48} color={alpha(GRAY_COLOR, 0.3)} />
                            <Typography variant="body2" sx={{ mt: 2, color: GRAY_COLOR, fontSize: '0.9rem' }}>
                                {recycleBinSearch ? 'No matching deleted items found' : 'No deleted items in recycle bin'}
                            </Typography>
                            <Typography variant="caption" sx={{ color: GRAY_COLOR, fontSize: '0.8rem' }}>
                                {recycleBinSearch ? 'Try a different search term' : 'Deleted work orders will appear here'}
                            </Typography>
                        </Box>
                    ) : (
                        <TableContainer>
                            <Table size="small" sx={{ minWidth: isMobile ? 1000 : 'auto' }}>
                                <TableHead>
                                    <TableRow sx={{
                                        bgcolor: alpha(PURPLE_COLOR, 0.04),
                                        '& th': {
                                            borderBottom: `2px solid ${alpha(PURPLE_COLOR, 0.1)}`,
                                            fontWeight: 600,
                                            fontSize: isMobile ? '0.75rem' : '0.8rem',
                                            color: TEXT_COLOR,
                                            py: 1.5,
                                            px: 1.5,
                                            whiteSpace: 'nowrap',
                                        },
                                    }}>
                                        <TableCell padding="checkbox" width={50} />
                                        <TableCell sx={{ minWidth: 120 }}>Work Order</TableCell>
                                        <TableCell sx={{ minWidth: 180 }}>Customer Info</TableCell>
                                        <TableCell sx={{ minWidth: 120 }}>Deleted By</TableCell>
                                        <TableCell sx={{ minWidth: 150 }}>
                                            Deleted At
                                        </TableCell>
                                        <TableCell width={150} sx={{ minWidth: 120 }}>Actions</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {recycleBinPageItems.map((item) => {
                                        const itemId = item.id?.toString() || item.id;
                                        const isSelected = selectedRecycleBinItems.has(itemId);
                                        const workOrderNumber = item.wo_number || 'N/A';
                                        const customer = item.customer || 'Unknown';
                                        const deletedBy = item.deleted_by || 'Unknown';
                                        const deletedByEmail = item.deleted_by_email || '';
                                        const fullAddress = item.full_address || '';
                                        const [streetPart = '', restPart = ''] = fullAddress.split(',');
                                        const restParts = restPart.trim().split(/\s+/);
                                        const street = streetPart.trim() || 'Unknown';
                                        const city = restParts[0] || 'Unknown';
                                        const state = restParts[1] || 'Unknown';
                                        const zip = restParts[2] || 'Unknown';

                                        return (
                                            <TableRow
                                                key={itemId}
                                                hover
                                                sx={{
                                                    bgcolor: isSelected ? alpha(PURPLE_COLOR, 0.1) : 'white',
                                                    '&:hover': { backgroundColor: alpha(PURPLE_COLOR, 0.05) },
                                                }}
                                            >
                                                <TableCell padding="checkbox">
                                                    <Checkbox
                                                        size="small"
                                                        checked={isSelected}
                                                        onChange={() => toggleRecycleBinSelection(itemId)}
                                                        sx={{
                                                            padding: '4px',
                                                            color: PURPLE_COLOR,
                                                            '&.Mui-checked': { color: PURPLE_COLOR },
                                                        }}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Typography variant="body2" sx={{
                                                        fontSize: isMobile ? '0.8rem' : '0.85rem',
                                                        fontWeight: 500,
                                                        color: TEXT_COLOR,
                                                    }}>
                                                        {workOrderNumber}
                                                    </Typography>
                                                    <Typography variant="caption" sx={{ fontSize: '0.75rem', color: GRAY_COLOR }}>
                                                        Status: {item.techReportSubmitted === true ? 'Submitted' : 'Waiting'}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell sx={{ py: 1.5 }}>
                                                    <Link
                                                        href="https://login.fieldedge.com/#/List/0"
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        underline="hover"
                                                        sx={{
                                                            color: 'inherit',
                                                            display: 'block',
                                                            transition: 'color 0.2s ease-in-out',
                                                            '&:hover': { color: '#1976d2' },
                                                        }}
                                                    >
                                                        <Typography variant="body2" sx={{
                                                            fontWeight: 500,
                                                            fontSize: '0.85rem',
                                                            wordBreak: 'break-word',
                                                            overflowWrap: 'break-word',
                                                        }}>
                                                            {customer} - {street}
                                                        </Typography>
                                                    </Link>
                                                    <Typography variant="caption" sx={{
                                                        color: '#6b7280',
                                                        fontSize: '0.8rem',
                                                        wordBreak: 'break-word',
                                                        overflowWrap: 'break-word',
                                                    }}>
                                                        {city}, {state} {zip}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Typography variant="body2" sx={{
                                                        fontSize: isMobile ? '0.8rem' : '0.85rem',
                                                        color: TEXT_COLOR,
                                                    }}>
                                                        {deletedBy}
                                                    </Typography>
                                                    {deletedByEmail && !isMobile && (
                                                        <Typography variant="caption" sx={{ fontSize: '0.75rem', color: GRAY_COLOR }}>
                                                            {deletedByEmail}
                                                        </Typography>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <Typography variant="body2" sx={{
                                                        fontSize: isMobile ? '0.8rem' : '0.85rem',
                                                        color: TEXT_COLOR,
                                                    }}>
                                                        {formatFinalizedDate(item.deleted_date)}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Stack direction="row" spacing={0.5}>
                                                        <Tooltip title="Restore">
                                                            <IconButton
                                                                size="small"
                                                                onClick={() => handleSingleRestore(item)}
                                                                disabled={restoreFromRecycleBinMutation?.isPending}
                                                                sx={{
                                                                    color: GREEN_COLOR,
                                                                    '&:hover': { backgroundColor: alpha(GREEN_COLOR, 0.1) },
                                                                }}
                                                            >
                                                                <RotateCcw size={16} />
                                                            </IconButton>
                                                        </Tooltip>
                                                        <Tooltip title="Delete Permanently">
                                                            <IconButton
                                                                size="small"
                                                                onClick={() => handleSinglePermanentDelete(item)}
                                                                disabled={permanentDeleteFromRecycleBinMutation?.isPending}
                                                                sx={{
                                                                    color: RED_COLOR,
                                                                    '&:hover': { backgroundColor: alpha(RED_COLOR, 0.1) },
                                                                }}
                                                            >
                                                                <Trash2 size={16} />
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

                {/* Pagination */}
                {filteredRecycleBinItems.length > 0 && (
                    <Box sx={{
                        borderTop: `1px solid ${alpha(PURPLE_COLOR, 0.1)}`,
                        p: 1,
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
                                    fontSize: '0.8rem',
                                },
                            }}
                        />
                    </Box>
                )}
            </Box>
        </Modal>
    );
};

export default RmeRecycleBinModal;