import React, { useState, useMemo, useCallback } from 'react';
import {
    Box,
    Typography,
    Button,
    useTheme,
    useMediaQuery,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    CircularProgress,
    Alert,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { useQueryClient } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import { AlertTriangle, History, RotateCcw, Trash2 } from 'lucide-react';

import { useRmeData } from './hooks/useRmeData';
import { useRmeMutations } from './hooks/useRmeMutations';
import { useGlobalSnackbar } from '../../../../context/GlobalSnackbarContext';

import DashboardLoader from '../../../../components/Loader/DashboardLoader';
import Section from './components/shared/Section';
import SearchInput from './components/shared/SearchInput';

import ReportNeededTable from './components/tables/ReportNeededTable';
import ReportSubmittedTable from './components/tables/ReportSubmittedTable';
import HoldingTable from './components/tables/HoldingTable';
import FinalizedTable from './components/tables/FinalizedTable';

import PDFViewerModal from './components/modals/PDFViewerModal';
import EditFormModal from './components/modals/EditFormModal';
import RmeRecycleBinModal from './components/modals/RmeRecycleBinModal';
import {
    DeleteConfirmationModal,
    RestoreConfirmationModal,
    PermanentDeleteConfirmationModal,
    LockConfirmationModal,
    DiscardConfirmationModal
} from './components/modals/ConfirmationModals';

import {
    BLUE_COLOR,
    CYAN_COLOR,
    ORANGE_COLOR,
    GREEN_COLOR,
    PURPLE_COLOR,
    GRAY_COLOR,
    TEXT_COLOR,
    RED_COLOR
} from './utils/constants';
import RefreshButton from '../../../../components/ui/RefreshButton';


const parseDateTime = (dateStr) => {
    if (!dateStr || typeof dateStr !== 'string') return null;

    const trimmedStr = dateStr.trim();

    try {
        const isoDate = new Date(trimmedStr);
        if (!isNaN(isoDate.getTime())) {
            return isoDate;
        }
    } catch (e) {
    }

    if (trimmedStr.includes('/')) {
        const parts = trimmedStr.split(' ');
        const datePart = parts[0];
        const dateParts = datePart.split('/');

        if (dateParts.length === 3) {
            let month, day, year;

            const firstNum = parseInt(dateParts[0]);
            const secondNum = parseInt(dateParts[1]);

            if (firstNum > 12) {
                day = firstNum;
                month = secondNum;
                year = parseInt(dateParts[2]);
            } else {
                month = firstNum;
                day = secondNum;
                year = parseInt(dateParts[2]);
            }

            if (!isNaN(month) && !isNaN(day) && !isNaN(year)) {
                let hours = 0;
                let minutes = 0;

                if (parts.length >= 3) {
                    const timePart = parts[1];
                    const period = parts[2];
                    const timeParts = timePart.split(':');
                    if (timeParts.length === 2) {
                        hours = parseInt(timeParts[0]);
                        minutes = parseInt(timeParts[1]);
                        if (period === 'PM' && hours !== 12) hours += 12;
                        else if (period === 'AM' && hours === 12) hours = 0;
                    }
                }

                return new Date(year, month - 1, day, hours, minutes, 0);
            }
        }
    }

    const monthNames = {
        'january': 0, 'february': 1, 'march': 2, 'april': 3, 'may': 4, 'june': 5,
        'july': 6, 'august': 7, 'september': 8, 'october': 9, 'november': 10, 'december': 11,
        'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'jun': 5,
        'jul': 6, 'aug': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dec': 11
    };

    const parts = trimmedStr.split(/[\s,]+/);

    if (parts.length >= 3) {
        const monthStr = parts[0].toLowerCase();
        const month = monthNames[monthStr];

        if (month !== undefined) {
            const day = parseInt(parts[1]);
            const year = parseInt(parts[2]);

            if (!isNaN(day) && !isNaN(year)) {
                let hours = 0;
                let minutes = 0;

                if (parts.length >= 6) {
                    const hourStr = parts[3];
                    const minuteStr = parts[4];
                    const period = parts[5].toUpperCase();

                    const timeParts = hourStr.split(':');
                    if (timeParts.length === 2) {
                        hours = parseInt(timeParts[0]);
                        minutes = parseInt(timeParts[1]);

                        if (period === 'PM' && hours !== 12) hours += 12;
                        else if (period === 'AM' && hours === 12) hours = 0;
                    }
                }

                return new Date(year, month, day, hours, minutes, 0);
            }
        }
    }

    return null;
};

const sortByDateAsc = (items, dateField = 'completedDate') => {
    return [...items].sort((a, b) => {
        const dateA = parseDateTime(a[dateField]);
        const dateB = parseDateTime(b[dateField]);
        if (!dateA && !dateB) return 0;
        if (!dateA) return 1;
        if (!dateB) return -1;
        return dateA.getTime() - dateB.getTime();
    });
};

const sortByDateDesc = (items, dateField) => {
    return [...items].sort((a, b) => {
        const getDate = (item) => {
            if (dateField) return parseDateTime(item[dateField]);
            return (
                parseDateTime(item.deleted_date) ||
                parseDateTime(item.finalizedDateFormatted) ||
                parseDateTime(item.completedDate)
            );
        };
        const dateA = getDate(a);
        const dateB = getDate(b);
        if (!dateA && !dateB) return 0;
        if (!dateA) return 1;
        if (!dateB) return -1;
        return dateB.getTime() - dateA.getTime();
    });
};

const RMEReports = () => {
    const queryClient = useQueryClient();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const isSmallMobile = useMediaQuery(theme.breakpoints.down('sm'));

    const { showSnackbar } = useGlobalSnackbar();

    const [selectedReportNeeded, setSelectedReportNeeded] = useState(new Set());
    const [selectedReportSubmitted, setSelectedReportSubmitted] = useState(new Set());
    const [selectedHolding, setSelectedHolding] = useState(new Set());
    const [selectedFinalized, setSelectedFinalized] = useState(new Set());

    const [waitToLockAction, setWaitToLockAction] = useState(new Set());
    const [waitToLockDetails, setWaitToLockDetails] = useState({});

    const [pageReportNeeded, setPageReportNeeded] = useState(0);
    const [rowsPerPageReportNeeded, setRowsPerPageReportNeeded] = useState(isMobile ? 5 : 10);
    const [pageReportSubmitted, setPageReportSubmitted] = useState(0);
    const [rowsPerPageReportSubmitted, setRowsPerPageReportSubmitted] = useState(isMobile ? 5 : 10);
    const [pageHolding, setPageHolding] = useState(0);
    const [rowsPerPageHolding, setRowsPerPageHolding] = useState(isMobile ? 5 : 10);
    const [pageFinalized, setPageFinalized] = useState(0);
    const [rowsPerPageFinalized, setRowsPerPageFinalized] = useState(isMobile ? 5 : 10);

    const [searchReportNeeded, setSearchReportNeeded] = useState('');
    const [searchReportSubmitted, setSearchReportSubmitted] = useState('');
    const [searchHolding, setSearchHolding] = useState('');
    const [searchFinalized, setSearchFinalized] = useState('');

    const [recycleBinModalOpen, setRecycleBinModalOpen] = useState(false);
    const [recycleBinSearch, setRecycleBinSearch] = useState('');
    const [recycleBinPage, setRecycleBinPage] = useState(0);
    const [recycleBinRowsPerPage, setRecycleBinRowsPerPage] = useState(isMobile ? 5 : 10);
    const [selectedRecycleBinItems, setSelectedRecycleBinItems] = useState(new Set());

    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedForDeletion, setSelectedForDeletion] = useState(new Set());
    const [deletionSection, setDeletionSection] = useState('');

    const [permanentDeleteDialogOpen, setPermanentDeleteDialogOpen] = useState(false);
    const [selectedForPermanentDeletion, setSelectedForPermanentDeletion] = useState(new Set());

    const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
    const [selectedForRestore, setSelectedForRestore] = useState(new Set());

    const [pdfViewerOpen, setPdfViewerOpen] = useState(false);
    const [currentPdfUrl, setCurrentPdfUrl] = useState('');

    const [editFormModalOpen, setEditFormModalOpen] = useState(false);
    const [selectedWorkOrder, setSelectedWorkOrder] = useState(null);

    const [lockedConfirmModal, setLockedConfirmModal] = useState({
        open: false,
        itemId: null,
        itemData: null,
        isLoading: false,
    });

    const [discardConfirmModal, setDiscardConfirmModal] = useState({
        open: false,
        itemId: null,
        itemData: null,
        isLoading: false,
    });

    const [selectedSingleItem, setSelectedSingleItem] = useState(null);
    const [singleRestoreDialogOpen, setSingleRestoreDialogOpen] = useState(false);
    const [singleDeleteDialogOpen, setSingleDeleteDialogOpen] = useState(false);

    const {
        processedData,
        deletedWorkOrders,
        isLoading,
        currentUser
    } = useRmeData();

    const {
        bulkSoftDeleteMutation,
        singleSoftDeleteMutation,
        permanentDeleteFromRecycleBinMutation,
        bulkPermanentDeleteMutation,
        restoreFromRecycleBinMutation,
        bulkRestoreMutation,
        lockReportMutation,
        waitToLockMutation,
        deleteReportMutation,
        invalidateAndRefetch
    } = useRmeMutations(currentUser, showSnackbar);

    const filteredData = useMemo(() => {
        const filterItems = (items, search) => {
            if (!search) return items;
            const searchLower = search.toLowerCase();
            return items.filter(item =>
                item.technician?.toLowerCase().includes(searchLower) ||
                item.address?.toLowerCase().includes(searchLower) ||
                item.street?.toLowerCase().includes(searchLower) ||
                item.city?.toLowerCase().includes(searchLower) ||
                item.woNumber?.toLowerCase().includes(searchLower)
            );
        };

        return {
            reportNeeded: sortByDateAsc(filterItems(processedData.reportNeeded, searchReportNeeded)),
            reportSubmitted: sortByDateAsc(filterItems(processedData.reportSubmitted, searchReportSubmitted)),
            holding: sortByDateAsc(filterItems(processedData.holding, searchHolding)),
            finalized: sortByDateDesc(filterItems(processedData.finalized, searchFinalized), 'finalizedDateFormatted'),
        };
    }, [processedData, searchReportNeeded, searchReportSubmitted, searchHolding, searchFinalized]);

    const sortedDeletedWorkOrders = useMemo(() => {
        return sortByDateDesc(deletedWorkOrders);
    }, [deletedWorkOrders]);

    const pageItems = useMemo(() => ({
        reportNeeded: filteredData.reportNeeded.slice(
            pageReportNeeded * rowsPerPageReportNeeded,
            pageReportNeeded * rowsPerPageReportNeeded + rowsPerPageReportNeeded
        ),
        reportSubmitted: filteredData.reportSubmitted.slice(
            pageReportSubmitted * rowsPerPageReportSubmitted,
            pageReportSubmitted * rowsPerPageReportSubmitted + rowsPerPageReportSubmitted
        ),
        holding: filteredData.holding.slice(
            pageHolding * rowsPerPageHolding,
            pageHolding * rowsPerPageHolding + rowsPerPageHolding
        ),
        finalized: filteredData.finalized.slice(
            pageFinalized * rowsPerPageFinalized,
            pageFinalized * rowsPerPageFinalized + rowsPerPageFinalized
        )
    }), [filteredData, pageReportNeeded, rowsPerPageReportNeeded, pageReportSubmitted, rowsPerPageReportSubmitted, pageHolding, rowsPerPageHolding, pageFinalized, rowsPerPageFinalized]);

    const handleViewPDF = useCallback((pdfUrl) => {
        setCurrentPdfUrl(pdfUrl);
        setPdfViewerOpen(true);
    }, []);

    const handleEditClick = useCallback((item) => {
        setSelectedWorkOrder(item);
        setEditFormModalOpen(true);
    }, []);

    const handleSaveForm = useCallback(() => {
        showSnackbar('Form saved successfully', 'success');
        invalidateAndRefetch();
        setEditFormModalOpen(false);
    }, [showSnackbar, invalidateAndRefetch]);

    const handleLockedClick = useCallback((id, itemData) => {
        setLockedConfirmModal({
            open: true,
            itemId: id,
            itemData: itemData,
            isLoading: false,
        });
    }, []);

    const confirmLockedAction = useCallback(async () => {
        const { itemId } = lockedConfirmModal;
        setLockedConfirmModal({ open: false, itemId: null, itemData: null, isLoading: false });
        showSnackbar('Locking report… please wait', 'info');
        try {
            await lockReportMutation.mutateAsync({ id: itemId });
            showSnackbar('Report locked successfully', 'success');
        } catch (error) {
            showSnackbar('Failed to lock report', 'error');
        }
    }, [lockedConfirmModal, lockReportMutation, showSnackbar]);

    const handleDiscardClick = useCallback((id, itemData) => {
        setDiscardConfirmModal({
            open: true,
            itemId: id,
            itemData: itemData,
            isLoading: false,
        });
    }, []);

    const confirmDiscardAction = useCallback(async () => {
        const { itemId } = discardConfirmModal;
        setDiscardConfirmModal({ open: false, itemId: null, itemData: null, isLoading: false });
        showSnackbar('Discarding report… please wait', 'info');
        try {
            await deleteReportMutation.mutateAsync({ id: itemId });
            showSnackbar('Report discarded successfully', 'success');
        } catch (error) {
            showSnackbar('Failed to discard report', 'error');
        }
    }, [discardConfirmModal, deleteReportMutation, showSnackbar]);

    const handleWaitToLockToggle = useCallback((id) => {
        setWaitToLockAction(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
                setWaitToLockDetails(prevDetails => {
                    const newDetails = { ...prevDetails };
                    delete newDetails[id];
                    return newDetails;
                });
            } else {
                newSet.add(id);
                setWaitToLockDetails(prevDetails => ({
                    ...prevDetails,
                    [id]: { reason: '', notes: '' }
                }));
            }
            return newSet;
        });
    }, []);

    const handleWaitToLockReasonChange = useCallback((id, reason) => {
        setWaitToLockDetails(prev => ({ ...prev, [id]: { ...prev[id], reason } }));
    }, []);

    const handleWaitToLockNotesChange = useCallback((id, notes) => {
        setWaitToLockDetails(prev => ({ ...prev, [id]: { ...prev[id], notes } }));
    }, []);

    const handleSaveReportSubmittedChanges = useCallback(async () => {
        const selectedItems = pageItems.reportSubmitted.filter(item => waitToLockAction.has(item.id));

        const actions = { waitToLock: [], invalidCombinations: [] };

        selectedItems.forEach(item => {
            const details = waitToLockDetails[item.id] || { reason: '', notes: '' };
            if (details.reason) {
                actions.waitToLock.push({ id: item.id, reason: details.reason, notes: details.notes });
            } else {
                actions.invalidCombinations.push({ id: item.id, address: item.address, error: 'Missing reason for Wait to Lock' });
            }
        });

        try {
            let message = '';
            if (actions.waitToLock.length > 0) {
                for (const action of actions.waitToLock) {
                    await waitToLockMutation.mutateAsync({ id: action.id, reason: action.reason, notes: action.notes });
                }
                message += `${actions.waitToLock.length} report(s) moved to Holding. `;
            }
            if (actions.invalidCombinations.length > 0) {
                const invalidAddresses = actions.invalidCombinations.map(ic => ic.address).join(', ');
                message += `${actions.invalidCombinations.length} report(s) have errors: ${invalidAddresses}.`;
                showSnackbar(message, 'warning');
            } else if (message) {
                showSnackbar(message, 'success');
            } else {
                showSnackbar('No Wait to Lock changes to save', 'info');
            }
            setWaitToLockAction(new Set());
            setWaitToLockDetails({});
        } catch (error) {
            showSnackbar('Failed to save changes', 'error');
        }
    }, [pageItems.reportSubmitted, waitToLockAction, waitToLockDetails, waitToLockMutation, showSnackbar]);

    const handleSoftDelete = useCallback((selectionSet, section) => {
        if (selectionSet.size === 0) return;
        setSelectedForDeletion(selectionSet);
        setDeletionSection(section);
        setDeleteDialogOpen(true);
    }, []);

    const executeSoftDelete = useCallback(async () => {
        try {
            await bulkSoftDeleteMutation.mutateAsync(selectedForDeletion);
            setSelectedReportNeeded(new Set());
            setSelectedReportSubmitted(new Set());
            setSelectedHolding(new Set());
            setSelectedFinalized(new Set());
            setSelectedForDeletion(new Set());
            setDeleteDialogOpen(false);
        } catch (error) { }
    }, [selectedForDeletion, bulkSoftDeleteMutation]);

    const handlePermanentDelete = useCallback((selectionSet) => {
        if (selectionSet.size === 0) return;
        setSelectedForPermanentDeletion(selectionSet);
        setPermanentDeleteDialogOpen(true);
    }, []);

    const executePermanentDelete = useCallback(async () => {
        try {
            await bulkPermanentDeleteMutation.mutateAsync(Array.from(selectedForPermanentDeletion));
            setSelectedRecycleBinItems(new Set());
            setPermanentDeleteDialogOpen(false);
            setSelectedForPermanentDeletion(new Set());
        } catch (error) { }
    }, [selectedForPermanentDeletion, bulkPermanentDeleteMutation]);

    const handleRestore = useCallback((selectionSet) => {
        if (selectionSet.size === 0) return;
        setSelectedForRestore(selectionSet);
        setRestoreDialogOpen(true);
    }, []);

    const executeRestore = useCallback(async () => {
        try {
            await bulkRestoreMutation.mutateAsync(Array.from(selectedForRestore));
            setSelectedRecycleBinItems(new Set());
            setRestoreDialogOpen(false);
            setSelectedForRestore(new Set());
        } catch (error) { }
    }, [selectedForRestore, bulkRestoreMutation]);

    const handleSingleRestore = useCallback((item) => {
        setSelectedSingleItem(item);
        setSingleRestoreDialogOpen(true);
    }, []);

    const handleSinglePermanentDelete = useCallback((item) => {
        setSelectedSingleItem(item);
        setSingleDeleteDialogOpen(true);
    }, []);

    const executeSingleRestore = useCallback(() => {
        if (selectedSingleItem) {
            restoreFromRecycleBinMutation.mutate(selectedSingleItem.id, {
                onSuccess: () => { setSingleRestoreDialogOpen(false); setSelectedSingleItem(null); },
                onSettled: () => { setSingleRestoreDialogOpen(false); setSelectedSingleItem(null); }
            });
        }
    }, [selectedSingleItem, restoreFromRecycleBinMutation]);

    const executeSinglePermanentDelete = useCallback(() => {
        if (selectedSingleItem) {
            permanentDeleteFromRecycleBinMutation.mutate(selectedSingleItem.id, {
                onSuccess: () => { setSingleDeleteDialogOpen(false); setSelectedSingleItem(null); },
                onSettled: () => { setSingleDeleteDialogOpen(false); setSelectedSingleItem(null); }
            });
        }
    }, [selectedSingleItem, permanentDeleteFromRecycleBinMutation]);

    const handleMoveToRecycleBinFromEditForm = useCallback(async (id) => {
        try {
            await singleSoftDeleteMutation.mutateAsync(id);
        } catch (error) {
            throw error;
        }
    }, [singleSoftDeleteMutation]);

    const toggleSelection = useCallback((setState, id) => {
        setState(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) newSet.delete(id);
            else newSet.add(id);
            return newSet;
        });
    }, []);

    const toggleAllSelection = useCallback((items, pageItems, selectedSet) => {
        const allPageIds = new Set(pageItems.map(item => item.id));
        const currentSelected = new Set(selectedSet);
        const allSelectedOnPage = Array.from(allPageIds).every(id => currentSelected.has(id));
        if (allSelectedOnPage) {
            const newSet = new Set(currentSelected);
            allPageIds.forEach(id => newSet.delete(id));
            return newSet;
        } else {
            return new Set([...currentSelected, ...allPageIds]);
        }
    }, []);

    const recycleBinPageItems = useMemo(() => {
        return sortedDeletedWorkOrders.slice(
            recycleBinPage * recycleBinRowsPerPage,
            recycleBinPage * recycleBinRowsPerPage + recycleBinRowsPerPage
        );
    }, [sortedDeletedWorkOrders, recycleBinPage, recycleBinRowsPerPage]);

    const toggleRecycleBinSelection = useCallback((itemKey) => {
        setSelectedRecycleBinItems(prev => {
            const newSet = new Set(prev);
            if (newSet.has(itemKey)) newSet.delete(itemKey);
            else newSet.add(itemKey);
            return newSet;
        });
    }, []);

    const toggleAllRecycleBinSelection = useCallback(() => {
        const currentPageItems = recycleBinPageItems;
        const allPageIds = new Set(currentPageItems.map(item => item.id.toString()));
        const currentSelected = new Set(selectedRecycleBinItems);
        const allSelectedOnPage = Array.from(allPageIds).every(id => currentSelected.has(id));
        if (allSelectedOnPage) {
            const newSet = new Set(currentSelected);
            allPageIds.forEach(id => newSet.delete(id));
            setSelectedRecycleBinItems(newSet);
        } else {
            setSelectedRecycleBinItems(new Set([...currentSelected, ...allPageIds]));
        }
    }, [recycleBinPageItems, selectedRecycleBinItems]);

    const handleChangeRecycleBinPage = useCallback((event, newPage) => {
        setRecycleBinPage(newPage);
    }, []);

    const handleChangeRecycleBinRowsPerPage = useCallback((event) => {
        setRecycleBinRowsPerPage(parseInt(event.target.value, 10));
        setRecycleBinPage(0);
    }, []);

    if (isLoading) {
        return <DashboardLoader />;
    }

    return (
        <Box>
            <Helmet>
                <title>RME Reports | Sterling Septic & Plumbing LLC</title>
                <meta name="description" content="Super Admin RME Reports page" />
            </Helmet>

            <Box sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                flexDirection: isMobile ? 'column' : 'row',
                mb: 3,
                gap: isMobile ? 2 : 0
            }}>
                <Box>
                    <Typography sx={{
                        fontWeight: 600,
                        mb: 0.5,
                        fontSize: isMobile ? '0.95rem' : '1rem',
                        color: TEXT_COLOR,
                        letterSpacing: '-0.01em',
                    }}>
                        RME Report Tracking
                    </Typography>
                    <Typography variant="body2" sx={{
                        color: GRAY_COLOR,
                        fontSize: isMobile ? '0.8rem' : '0.85rem',
                        fontWeight: 400,
                    }}>
                        Track RME reports through 4 stages
                    </Typography>
                </Box>
                <Box>
                    <RefreshButton />
                    <Button
                        variant="outlined"
                        startIcon={<History size={isMobile ? 14 : 16} />}
                        onClick={() => setRecycleBinModalOpen(true)}
                        sx={{
                            textTransform: 'none',
                            ml: 1,
                            fontSize: isMobile ? '0.8rem' : '0.85rem',
                            fontWeight: 500,
                            color: PURPLE_COLOR,
                            borderColor: alpha(PURPLE_COLOR, 0.3),
                            minWidth: isMobile ? 'auto' : undefined,
                            '&:hover': {
                                borderColor: PURPLE_COLOR,
                                backgroundColor: alpha(PURPLE_COLOR, 0.05),
                            },
                        }}
                    >
                        {`Recycle Bin (${deletedWorkOrders.length})`}
                    </Button>
                </Box>
            </Box>

            <Section
                title="Stage 1: Report Needed"
                color={BLUE_COLOR}
                count={filteredData.reportNeeded.length}
                selectedCount={selectedReportNeeded.size}
                additionalActions={
                    <Box sx={{ width: '100%', mt: isMobile ? 1 : 0 }}>
                        {selectedReportNeeded.size > 0 ? (
                            <Button
                                variant="outlined"
                                color="error"
                                size="small"
                                startIcon={<Trash2 size={16} />}
                                onClick={() => handleSoftDelete(selectedReportNeeded, 'Report Needed')}
                                sx={{ textTransform: 'none', fontSize: '0.8rem', fontWeight: 500, width: isMobile ? '100%' : 'auto' }}
                            >
                                {isMobile ? `Delete (${selectedReportNeeded.size})` : `Delete Selected (${selectedReportNeeded.size})`}
                            </Button>
                        ) : (
                            <Box sx={{ width: '100%' }}>
                                <SearchInput
                                    value={searchReportNeeded}
                                    onChange={setSearchReportNeeded}
                                    placeholder="Search report needed..."
                                    fullWidth
                                    isMobile={isMobile}
                                />
                            </Box>
                        )}
                    </Box>
                }
                showDeleteButton={false}
                isMobile={isMobile}
            >
                <ReportNeededTable
                    items={pageItems.reportNeeded}
                    selected={selectedReportNeeded}
                    onToggleSelect={(id) => toggleSelection(setSelectedReportNeeded, id)}
                    onToggleAll={() => setSelectedReportNeeded(
                        toggleAllSelection(filteredData.reportNeeded, pageItems.reportNeeded, selectedReportNeeded)
                    )}
                    color={BLUE_COLOR}
                    totalCount={filteredData.reportNeeded.length}
                    page={pageReportNeeded}
                    rowsPerPage={rowsPerPageReportNeeded}
                    onPageChange={(e, newPage) => setPageReportNeeded(newPage)}
                    onRowsPerPageChange={(e) => {
                        setRowsPerPageReportNeeded(parseInt(e.target.value, 10));
                        setPageReportNeeded(0);
                    }}
                    onViewPDF={handleViewPDF}
                    isMobile={isMobile}
                />
            </Section>

            <Section
                title="Stage 2: Report Submitted"
                color={CYAN_COLOR}
                count={filteredData.reportSubmitted.length}
                selectedCount={selectedReportSubmitted.size}
                additionalActions={
                    <Box sx={{ width: '100%', mt: isMobile ? 1 : 0 }}>
                        {selectedReportSubmitted.size > 0 ? (
                            <Button
                                variant="outlined"
                                color="error"
                                size="small"
                                startIcon={<Trash2 size={16} />}
                                onClick={() => handleSoftDelete(selectedReportSubmitted, 'Report Submitted')}
                                sx={{ textTransform: 'none', fontSize: '0.8rem', fontWeight: 500, width: isMobile ? '100%' : 'auto' }}
                            >
                                {isMobile ? `Delete (${selectedReportSubmitted.size})` : `Delete Selected (${selectedReportSubmitted.size})`}
                            </Button>
                        ) : (
                            <Box sx={{ width: '100%' }}>
                                <SearchInput
                                    value={searchReportSubmitted}
                                    onChange={setSearchReportSubmitted}
                                    placeholder="Search report submitted..."
                                    fullWidth
                                    isMobile={isMobile}
                                />
                            </Box>
                        )}
                    </Box>
                }
                showDeleteButton={false}
                isMobile={isMobile}
            >
                <ReportSubmittedTable
                    items={pageItems.reportSubmitted}
                    selected={selectedReportSubmitted}
                    onToggleSelect={(id) => toggleSelection(setSelectedReportSubmitted, id)}
                    onToggleAll={() => setSelectedReportSubmitted(
                        toggleAllSelection(filteredData.reportSubmitted, pageItems.reportSubmitted, selectedReportSubmitted)
                    )}
                    onLockedClick={handleLockedClick}
                    waitToLockAction={waitToLockAction}
                    onWaitToLockToggle={handleWaitToLockToggle}
                    onDiscardClick={handleDiscardClick}
                    waitToLockDetails={waitToLockDetails}
                    onWaitToLockReasonChange={handleWaitToLockReasonChange}
                    onWaitToLockNotesChange={handleWaitToLockNotesChange}
                    onSaveChanges={handleSaveReportSubmittedChanges}
                    waitToLockActionSize={waitToLockAction.size}
                    onEditClick={handleEditClick}
                    color={CYAN_COLOR}
                    totalCount={filteredData.reportSubmitted.length}
                    page={pageReportSubmitted}
                    rowsPerPage={rowsPerPageReportSubmitted}
                    onPageChange={(e, newPage) => setPageReportSubmitted(newPage)}
                    onRowsPerPageChange={(e) => {
                        setRowsPerPageReportSubmitted(parseInt(e.target.value, 10));
                        setPageReportSubmitted(0);
                    }}
                    onViewPDF={handleViewPDF}
                    isMobile={isMobile}
                />
            </Section>

            <Section
                title="Stage 3: Holding"
                color={ORANGE_COLOR}
                count={filteredData.holding.length}
                selectedCount={selectedHolding.size}
                additionalActions={
                    <Box sx={{ width: '100%', mt: isMobile ? 1 : 0 }}>
                        {selectedHolding.size > 0 ? (
                            <Button
                                variant="outlined"
                                color="error"
                                size="small"
                                startIcon={<Trash2 size={16} />}
                                onClick={() => handleSoftDelete(selectedHolding, 'Holding')}
                                sx={{ textTransform: 'none', fontSize: '0.8rem', fontWeight: 500, width: isMobile ? '100%' : 'auto' }}
                            >
                                {isMobile ? `Delete (${selectedHolding.size})` : `Delete Selected (${selectedHolding.size})`}
                            </Button>
                        ) : (
                            <Box sx={{ width: '100%' }}>
                                <SearchInput
                                    value={searchHolding}
                                    onChange={setSearchHolding}
                                    placeholder="Search holding..."
                                    fullWidth
                                    isMobile={isMobile}
                                />
                            </Box>
                        )}
                    </Box>
                }
                showDeleteButton={false}
                isMobile={isMobile}
            >
                <HoldingTable
                    items={pageItems.holding}
                    selected={selectedHolding}
                    onToggleSelect={(id) => toggleSelection(setSelectedHolding, id)}
                    onToggleAll={() => setSelectedHolding(
                        toggleAllSelection(filteredData.holding, pageItems.holding, selectedHolding)
                    )}
                    onLockedClick={handleLockedClick}
                    onDiscardClick={handleDiscardClick}
                    onEditClick={handleEditClick}
                    color={ORANGE_COLOR}
                    totalCount={filteredData.holding.length}
                    page={pageHolding}
                    rowsPerPage={rowsPerPageHolding}
                    onPageChange={(e, newPage) => setPageHolding(newPage)}
                    onRowsPerPageChange={(e) => {
                        setRowsPerPageHolding(parseInt(e.target.value, 10));
                        setPageHolding(0);
                    }}
                    onViewPDF={handleViewPDF}
                    isMobile={isMobile}
                />
            </Section>

            <Section
                title="Stage 4: Finalized"
                color={GREEN_COLOR}
                count={filteredData.finalized.length}
                selectedCount={selectedFinalized.size}
                additionalActions={
                    <Box sx={{ width: '100%', mt: isMobile ? 1 : 0 }}>
                        {selectedFinalized.size > 0 ? (
                            <Button
                                variant="outlined"
                                color="error"
                                size="small"
                                startIcon={<Trash2 size={16} />}
                                onClick={() => handleSoftDelete(selectedFinalized, 'Finalized')}
                                sx={{ textTransform: 'none', fontSize: '0.8rem', fontWeight: 500, width: isMobile ? '100%' : 'auto' }}
                            >
                                {isMobile ? `Delete (${selectedFinalized.size})` : `Delete Selected (${selectedFinalized.size})`}
                            </Button>
                        ) : (
                            <Box sx={{ width: '100%' }}>
                                <SearchInput
                                    value={searchFinalized}
                                    onChange={setSearchFinalized}
                                    placeholder="Search finalized..."
                                    fullWidth
                                    isMobile={isMobile}
                                />
                            </Box>
                        )}
                    </Box>
                }
                showDeleteButton={false}
                isMobile={isMobile}
            >
                <FinalizedTable
                    items={pageItems.finalized}
                    selected={selectedFinalized}
                    onToggleSelect={(id) => toggleSelection(setSelectedFinalized, id)}
                    onToggleAll={() => setSelectedFinalized(
                        toggleAllSelection(filteredData.finalized, pageItems.finalized, selectedFinalized)
                    )}
                    color={GREEN_COLOR}
                    totalCount={filteredData.finalized.length}
                    page={pageFinalized}
                    rowsPerPage={rowsPerPageFinalized}
                    onPageChange={(e, newPage) => setPageFinalized(newPage)}
                    onRowsPerPageChange={(e) => {
                        setRowsPerPageFinalized(parseInt(e.target.value, 10));
                        setPageFinalized(0);
                    }}
                    isMobile={isMobile}
                />
            </Section>

            <PDFViewerModal
                open={pdfViewerOpen}
                onClose={() => setPdfViewerOpen(false)}
                pdfUrl={currentPdfUrl}
            />

            <EditFormModal
                open={editFormModalOpen}
                onClose={() => setEditFormModalOpen(false)}
                workOrderData={selectedWorkOrder}
                onSave={handleSaveForm}
                showSnackbar={showSnackbar}
                onMoveToRecycleBin={handleMoveToRecycleBinFromEditForm}
            />

            <RmeRecycleBinModal
                open={recycleBinModalOpen}
                onClose={() => setRecycleBinModalOpen(false)}
                recycleBinItems={sortedDeletedWorkOrders}
                recycleBinSearch={recycleBinSearch}
                setRecycleBinSearch={setRecycleBinSearch}
                recycleBinPage={recycleBinPage}
                recycleBinRowsPerPage={recycleBinRowsPerPage}
                handleChangeRecycleBinPage={handleChangeRecycleBinPage}
                handleChangeRecycleBinRowsPerPage={handleChangeRecycleBinRowsPerPage}
                selectedRecycleBinItems={selectedRecycleBinItems}
                toggleRecycleBinSelection={toggleRecycleBinSelection}
                toggleAllRecycleBinSelection={toggleAllRecycleBinSelection}
                confirmBulkRestore={() => handleRestore(selectedRecycleBinItems)}
                confirmBulkPermanentDelete={() => handlePermanentDelete(selectedRecycleBinItems)}
                handleSingleRestore={handleSingleRestore}
                handleSinglePermanentDelete={handleSinglePermanentDelete}
                restoreFromRecycleBinMutation={restoreFromRecycleBinMutation}
                permanentDeleteFromRecycleBinMutation={permanentDeleteFromRecycleBinMutation}
                bulkRestoreMutation={bulkRestoreMutation}
                bulkPermanentDeleteMutation={bulkPermanentDeleteMutation}
                isMobile={isMobile}
                isSmallMobile={isSmallMobile}
            />

            <DeleteConfirmationModal
                open={deleteDialogOpen}
                onClose={() => setDeleteDialogOpen(false)}
                title="Move to Recycle Bin"
                count={selectedForDeletion.size}
                section={deletionSection}
                isLoading={bulkSoftDeleteMutation.isPending}
                onConfirm={executeSoftDelete}
            />

            <RestoreConfirmationModal
                open={restoreDialogOpen}
                onClose={() => setRestoreDialogOpen(false)}
                count={selectedForRestore.size}
                isLoading={bulkRestoreMutation.isPending}
                onConfirm={executeRestore}
            />

            <PermanentDeleteConfirmationModal
                open={permanentDeleteDialogOpen}
                onClose={() => setPermanentDeleteDialogOpen(false)}
                count={selectedForPermanentDeletion.size}
                isLoading={bulkPermanentDeleteMutation.isPending}
                onConfirm={executePermanentDelete}
            />

            <LockConfirmationModal
                open={lockedConfirmModal.open}
                onClose={() => setLockedConfirmModal({ ...lockedConfirmModal, open: false })}
                itemData={lockedConfirmModal.itemData}
                isLoading={lockedConfirmModal.isLoading}
                onConfirm={confirmLockedAction}
            />

            <DiscardConfirmationModal
                open={discardConfirmModal.open}
                onClose={() => setDiscardConfirmModal({ ...discardConfirmModal, open: false })}
                itemData={discardConfirmModal.itemData}
                isLoading={discardConfirmModal.isLoading}
                onConfirm={confirmDiscardAction}
            />

            <Dialog
                open={singleRestoreDialogOpen}
                onClose={() => { setSingleRestoreDialogOpen(false); setSelectedSingleItem(null); }}
                maxWidth="sm"
                fullWidth
                PaperProps={{ sx: { bgcolor: 'white', borderRadius: '6px' } }}
            >
                <DialogTitle>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <RotateCcw size={20} color={GREEN_COLOR} />
                        <Typography variant="h6" sx={{ fontSize: '0.95rem', fontWeight: 600 }}>
                            Restore Item
                        </Typography>
                    </Box>
                </DialogTitle>
                <DialogContent>
                    <Typography variant="body2" sx={{ mb: 2, fontSize: '0.85rem' }}>
                        Are you sure you want to restore work order <strong>{selectedSingleItem?.wo_number}</strong>?
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button
                        onClick={() => { setSingleRestoreDialogOpen(false); setSelectedSingleItem(null); }}
                        sx={{ textTransform: 'none', color: TEXT_COLOR, fontSize: '0.85rem', fontWeight: 400, px: 2 }}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="contained"
                        color="success"
                        onClick={executeSingleRestore}
                        disabled={restoreFromRecycleBinMutation.isPending}
                        startIcon={restoreFromRecycleBinMutation.isPending ? <CircularProgress size={16} /> : <RotateCcw size={16} />}
                        sx={{
                            textTransform: 'none', fontSize: '0.85rem', fontWeight: 500, px: 2,
                            bgcolor: GREEN_COLOR, boxShadow: 'none',
                            '&:hover': { bgcolor: alpha(GREEN_COLOR, 0.9), boxShadow: 'none' },
                        }}
                    >
                        {restoreFromRecycleBinMutation.isPending ? 'Restoring...' : 'Restore'}
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog
                open={singleDeleteDialogOpen}
                onClose={() => { setSingleDeleteDialogOpen(false); setSelectedSingleItem(null); }}
                maxWidth="sm"
                fullWidth
                PaperProps={{ sx: { bgcolor: 'white', borderRadius: '6px' } }}
            >
                <DialogTitle>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Trash2 size={20} color={RED_COLOR} />
                        <Typography variant="h6" sx={{ fontSize: '0.95rem', fontWeight: 600 }}>
                            Permanent Delete
                        </Typography>
                    </Box>
                </DialogTitle>
                <DialogContent>
                    <Typography variant="body2" sx={{ mb: 2, fontSize: '0.85rem' }}>
                        Are you sure you want to permanently delete work order <strong>{selectedSingleItem?.wo_number}</strong>?
                        This action cannot be undone.
                    </Typography>
                    <Alert severity="warning" icon={<AlertTriangle size={20} />} sx={{ fontSize: '0.85rem' }}>
                        Item will be permanently removed and cannot be recovered.
                    </Alert>
                </DialogContent>
                <DialogActions>
                    <Button
                        onClick={() => { setSingleDeleteDialogOpen(false); setSelectedSingleItem(null); }}
                        variant='outlined'
                        color='error'
                        sx={{ textTransform: 'none', fontSize: '0.85rem', fontWeight: 400 }}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="contained"
                        color="error"
                        onClick={executeSinglePermanentDelete}
                        disabled={permanentDeleteFromRecycleBinMutation.isPending}
                        startIcon={permanentDeleteFromRecycleBinMutation.isPending ? <CircularProgress size={16} /> : <Trash2 size={16} />}
                        sx={{ textTransform: 'none', fontSize: '0.85rem', fontWeight: 500 }}
                    >
                        {permanentDeleteFromRecycleBinMutation.isPending ? 'Deleting...' : 'Delete Permanently'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default RMEReports;