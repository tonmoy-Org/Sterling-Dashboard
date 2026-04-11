import React, { useMemo } from 'react';
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
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
  History,
  X,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import SearchInput from '../SearchInput';
import {
  PURPLE_COLOR,
  GREEN_COLOR,
  RED_COLOR,
  GRAY_COLOR,
  TEXT_COLOR,
} from '../../utils/constants';
import { formatDate } from '../../utils/dateUtils';

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
  restoreFromRecycleBinMutation,
  permanentDeleteFromRecycleBinMutation,
  bulkRestoreMutation,
  bulkPermanentDeleteMutation,
  isMobile,
  isSmallMobile,
}) => {
  // First filter items by search
  const filteredRecycleBinItems = useMemo(() => {
    if (!recycleBinSearch) return recycleBinItems;
    const searchLower = recycleBinSearch.toLowerCase();
    return recycleBinItems.filter(item =>
      item.workOrderNumber?.toLowerCase().includes(searchLower) ||
      item.customerName?.toLowerCase().includes(searchLower) ||
      item.street?.toLowerCase().includes(searchLower) ||
      item.city?.toLowerCase().includes(searchLower) ||
      item.deletedBy?.toLowerCase().includes(searchLower)
    );
  }, [recycleBinItems, recycleBinSearch]);

  // Then sort by deletedAt (newest to oldest)
  const sortedRecycleBinItems = useMemo(() => {
    return [...filteredRecycleBinItems].sort((a, b) => {
      const parseDateTime = (dateStr) => {
        if (!dateStr) return new Date(0);

        try {
          // Handle ISO format or any valid date string
          const date = new Date(dateStr);
          return isNaN(date.getTime()) ? new Date(0) : date;
        } catch {
          return new Date(0);
        }
      };

      const dateA = parseDateTime(a.deletedAt);
      const dateB = parseDateTime(b.deletedAt);

      return dateB.getTime() - dateA.getTime(); // Newest to oldest
    });
  }, [filteredRecycleBinItems]);

  // Paginate the sorted items
  const recycleBinPageItems = useMemo(() => {
    return sortedRecycleBinItems.slice(
      recycleBinPage * recycleBinRowsPerPage,
      recycleBinPage * recycleBinRowsPerPage + recycleBinRowsPerPage
    );
  }, [sortedRecycleBinItems, recycleBinPage, recycleBinRowsPerPage]);

  // Check if all items on current page are selected
  const allSelectedOnPage = recycleBinPageItems.length > 0 &&
    recycleBinPageItems.every(item =>
      selectedRecycleBinItems.has(item.id)
    );

  const someSelectedOnPage = recycleBinPageItems.length > 0 &&
    recycleBinPageItems.some(item =>
      selectedRecycleBinItems.has(item.id)
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
        borderRadius: '5px',
        boxShadow: 24,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        m: isMobile ? 1 : 0,
        // Prevent layout shift by always reserving space for scrollbar
        scrollbarGutter: 'stable',
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
                {filteredRecycleBinItems.length} deleted item(s) • Restore or permanently delete
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
            flexWrap: isMobile ? 'wrap' : 'nowrap'
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
            <SearchInput
              value={recycleBinSearch}
              onChange={setRecycleBinSearch}
              placeholder="Search deleted items..."
              color={PURPLE_COLOR}
              fullWidth={isMobile}
            />
          </Box>
          <Box sx={{
            display: 'flex',
            gap: 1,
            width: isMobile ? '100%' : 'auto',
            justifyContent: isMobile ? 'flex-start' : 'flex-start',
            mt: isMobile ? 1 : 0,
            flexWrap: isMobile ? 'wrap' : 'nowrap'
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
              {isSmallMobile ? 'Restore' : 'Restore'} ({selectedRecycleBinItems.size})
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
              {isSmallMobile ? 'Delete' : 'Delete'} ({selectedRecycleBinItems.size})
            </Button>
          </Box>
        </Box>

        {/* Content - Main scrollable area */}
        <Box sx={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          scrollbarWidth: 'thin',
          '&::-webkit-scrollbar': {
            width: '4px',
          },
          '&::-webkit-scrollbar-track': {
            background: '#f1f5f9',
            borderRadius: '4px',
          },
          '&::-webkit-scrollbar-thumb': {
            background: '#cbd5e0',
            borderRadius: '4px',
            '&:hover': {
              background: '#94a3b8',
            },
          },
        }}>
          {isRecycleBinLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
              <CircularProgress size={24} sx={{ color: PURPLE_COLOR }} />
            </Box>
          ) : sortedRecycleBinItems.length === 0 ? (
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
              // Thinner horizontal scrollbar styles
              '&::-webkit-scrollbar': {
                height: '4px', // Thin horizontal scrollbar
              },
              '&::-webkit-scrollbar-track': {
                background: alpha(PURPLE_COLOR, 0.05),
                borderRadius: '4px',
              },
              '&::-webkit-scrollbar-thumb': {
                background: alpha(PURPLE_COLOR, 0.2),
                borderRadius: '4px',
                '&:hover': {
                  background: alpha(PURPLE_COLOR, 0.3),
                },
              },
              // Firefox scrollbar for horizontal
              scrollbarWidth: 'thin',
              scrollbarColor: `${alpha(PURPLE_COLOR, 0.2)} ${alpha(PURPLE_COLOR, 0.05)}`,
            }}>
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
                    }
                  }}>
                    <TableCell padding="checkbox" width={50} />
                    <TableCell sx={{ minWidth: 120 }}>Work Order</TableCell>
                    <TableCell sx={{ minWidth: 180 }}>Address</TableCell>
                    <TableCell sx={{ minWidth: 120 }}>Deleted By</TableCell>
                    <TableCell sx={{ minWidth: 120 }}>Deleted At</TableCell>
                    <TableCell width={150} sx={{ minWidth: 120 }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {recycleBinPageItems.map((item) => {
                    const isSelected = selectedRecycleBinItems.has(item.id);
                    const workOrderNumber = item.workOrderNumber || 'N/A';
                    const type = item.type || 'STANDARD';
                    const deletedBy = item.deletedBy || 'Unknown';
                    const deletedByEmail = item.deletedByEmail || '';

                    return (
                      <TableRow
                        key={item.id}
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
                            onChange={() => toggleRecycleBinSelection(item.id)}
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
                          <Typography variant="caption" sx={{
                            fontSize: '0.75rem',
                            color: GRAY_COLOR,
                          }}>
                            {type}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{
                            fontSize: isMobile ? '0.8rem' : '0.85rem',
                            color: TEXT_COLOR,
                            mb: 0.5,
                          }}>
                            {item.street || '—'}
                          </Typography>
                          <Typography variant="caption" sx={{
                            fontSize: '0.75rem',
                            color: GRAY_COLOR,
                          }}>
                            {[item.city, item.state, item.zip].filter(Boolean).join(', ') || '—'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Box>
                            <Typography variant="body2" sx={{
                              fontSize: isMobile ? '0.8rem' : '0.85rem',
                              color: TEXT_COLOR,
                            }}>
                              {deletedBy}
                            </Typography>
                            {deletedByEmail && !isMobile && (
                              <Typography variant="caption" sx={{
                                fontSize: '0.75rem',
                                color: GRAY_COLOR,
                              }}>
                                {deletedByEmail}
                              </Typography>
                            )}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{
                            fontSize: isMobile ? '0.8rem' : '0.85rem',
                            color: TEXT_COLOR,
                          }}>
                            {formatDate(item.deletedAt)}
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
        {sortedRecycleBinItems.length > 0 && (
          <Box sx={{
            borderTop: `1px solid ${alpha(PURPLE_COLOR, 0.1)}`,
            p: 1,
          }}>
            <TablePagination
              rowsPerPageOptions={[5, 10, 25, 50]}
              component="div"
              count={sortedRecycleBinItems.length}
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

export default RecycleBinModal;