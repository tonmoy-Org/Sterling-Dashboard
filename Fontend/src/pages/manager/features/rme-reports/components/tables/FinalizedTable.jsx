import React, { useMemo } from 'react';
import {
    TableContainer,
    Table,
    TableHead,
    TableBody,
    TableRow,
    TableCell,
    Checkbox,
    Box,
    Typography,
    TablePagination,
    Chip,
    Link
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { CheckCircle, AlertTriangle } from 'lucide-react';
import PriorityBadge from '../../../../../../components/ui/PriorityBadge';
import {
    GRAY_COLOR,
    TEXT_COLOR,
    GREEN_COLOR,
    RED_COLOR
} from '../../utils/constants';

const FinalizedTable = ({
    items,
    selected,
    onToggleSelect,
    onToggleAll,
    color,
    totalCount,
    page,
    rowsPerPage,
    onPageChange,
    onRowsPerPageChange,
    isMobile,
}) => {
    // Sort items by date (newest to oldest)
    const sortedItems = useMemo(() => {
        return [...items].sort((a, b) => {
            // Parse date string format: "02/15/2026 08:58 AM"
            const parseDateTime = (dateStr) => {
                if (!dateStr || typeof dateStr !== 'string') return new Date(0);

                const parts = dateStr.trim().split(' ');
                if (parts.length < 3) return new Date(0);

                const datePart = parts[0];
                const timePart = parts[1];
                const period = parts[2];

                const dateParts = datePart.split('/');
                const timeParts = timePart.split(':');

                if (dateParts.length !== 3 || timeParts.length !== 2) return new Date(0);

                const month = parseInt(dateParts[0]);
                const day = parseInt(dateParts[1]);
                const year = parseInt(dateParts[2]);
                let hours = parseInt(timeParts[0]);
                const minutes = parseInt(timeParts[1]);

                // Convert 12-hour format to 24-hour
                if (period === 'PM' && hours !== 12) {
                    hours += 12;
                } else if (period === 'AM' && hours === 12) {
                    hours = 0;
                }

                return new Date(year, month - 1, day, hours, minutes, 0);
            };

            const dateA = parseDateTime(a.finalizedDateFormatted);
            const dateB = parseDateTime(b.finalizedDateFormatted);

            return dateB.getTime() - dateA.getTime(); // Newest to oldest
        });
    }, [items]);

    const allSelectedOnPage = sortedItems.length > 0 && sortedItems.every(item => selected.has(item.id));
    const someSelectedOnPage = sortedItems.length > 0 && sortedItems.some(item => selected.has(item.id));

    return (
        <TableContainer sx={{
            overflowX: 'auto',
            '&::-webkit-scrollbar': {
                height: '8px',
            },
            '&::-webkit-scrollbar-track': {
                backgroundColor: alpha(color, 0.05),
            },
            '&::-webkit-scrollbar-thumb': {
                backgroundColor: alpha(color, 0.2),
                borderRadius: '4px',
            },
        }}>
            <Table size="small" sx={{ minWidth: isMobile ? 1000 : 'auto' }}>
                <TableHead>
                    <TableRow sx={{
                        bgcolor: alpha(color, 0.04),
                        '& th': {
                            borderBottom: `2px solid ${alpha(color, 0.1)}`,
                            py: 1.5,
                            px: 1.5,
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            color: TEXT_COLOR,
                            whiteSpace: 'nowrap',
                        }
                    }}>
                        <TableCell
                            padding="checkbox"
                            sx={{
                                pl: isMobile ? 1.5 : 2.5,
                                width: '50px',
                                minWidth: '50px',
                                maxWidth: '50px',
                            }}
                        >
                            <Checkbox
                                size="small"
                                checked={allSelectedOnPage}
                                indeterminate={someSelectedOnPage && !allSelectedOnPage}
                                onChange={onToggleAll}
                                sx={{
                                    color: color,
                                    '&.Mui-checked': {
                                        color: color,
                                    },
                                    padding: '4px',
                                }}
                            />
                        </TableCell>
                        <TableCell sx={{ minWidth: 120 }}>
                            Status
                        </TableCell>
                        <TableCell sx={{ minWidth: 180 }}>
                            Customer Info
                        </TableCell>
                        <TableCell sx={{ minWidth: 150 }}>Priority</TableCell>
                        <TableCell sx={{ minWidth: 150 }}>
                            Date
                        </TableCell>
                        <TableCell sx={{ minWidth: 150 }}>
                            {isMobile ? 'Manager' : 'By Manager'}
                        </TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {sortedItems.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                                <Box sx={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: 1,
                                }}>
                                    <CheckCircle size={32} color={alpha(TEXT_COLOR, 0.2)} />
                                    <Typography
                                        variant="body2"
                                        sx={{
                                            color: TEXT_COLOR,
                                            opacity: 0.6,
                                            fontSize: '0.85rem',
                                            fontWeight: 500,
                                        }}
                                    >
                                        No finalized reports
                                    </Typography>
                                </Box>
                            </TableCell>
                        </TableRow>
                    ) : (
                        sortedItems.map((item) => {
                            const isSelected = selected.has(item.id);

                            return (
                                <TableRow
                                    key={item.id}
                                    hover
                                    sx={{
                                        bgcolor: isSelected ? alpha(color, 0.1) : 'white',
                                        '&:hover': {
                                            backgroundColor: alpha(color, 0.05),
                                        },
                                        '&:last-child td': {
                                            borderBottom: 'none',
                                        },
                                    }}
                                >
                                    <TableCell padding="checkbox" sx={{
                                        pl: isMobile ? 1.5 : 2.5,
                                        py: 1.5,
                                        width: '50px',
                                        minWidth: '50px',
                                        maxWidth: '50px',
                                    }}>
                                        <Checkbox
                                            checked={isSelected}
                                            onChange={() => onToggleSelect(item.id)}
                                            size="small"
                                            sx={{
                                                color: color,
                                                '&.Mui-checked': {
                                                    color: color,
                                                },
                                                padding: '4px',
                                            }}
                                        />
                                    </TableCell>
                                    <TableCell sx={{ py: 1.5 }}>
                                        <Chip
                                            label={item.status}
                                            size="small"
                                            sx={{
                                                bgcolor: alpha(item.statusColor, 0.1),
                                                color: item.statusColor,
                                                fontWeight: 600,
                                                fontSize: '0.85rem',
                                            }}
                                        />
                                    </TableCell>
                                    <TableCell sx={{ py: 1.5 }}>
                                        <Link
                                            href={item.woDetailsLink}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            underline="hover"
                                            sx={{
                                                color: 'inherit',
                                                display: 'block',
                                                transition: 'color 0.2s ease-in-out',
                                                '&:hover': {
                                                    color: '#1976d2',
                                                }
                                            }}
                                        >
                                            <Typography
                                                variant="body2"
                                                sx={{
                                                    fontWeight: 600,
                                                    fontSize: '0.85rem',
                                                    wordBreak: 'break-word',
                                                    overflowWrap: 'break-word',
                                                    color: TEXT_COLOR
                                                }}
                                            >
                                                {item.customer} - {item.street}
                                            </Typography>
                                        </Link>
                                        <Typography
                                            variant="caption"
                                            sx={{
                                                color: '#6b7280',
                                                fontSize: '0.8rem',
                                                wordBreak: 'break-word',
                                                overflowWrap: 'break-word',
                                            }}
                                        >
                                            {item.city}, {item.state} {item.zip}
                                        </Typography>
                                    </TableCell>
                                    <TableCell sx={{ py: 1.5 }}>
                                        <PriorityBadge priority={item.priority} />
                                    </TableCell>
                                    <TableCell sx={{ py: 1.5 }}>
                                        <Typography variant="body2" sx={{
                                            fontWeight: 500,
                                            fontSize: '0.85rem',
                                        }}>
                                            {item.finalizedDateFormatted}
                                        </Typography>
                                    </TableCell>
                                    <TableCell sx={{ py: 1.5 }}>
                                        <Box>
                                            <Typography variant="body2" sx={{
                                                fontWeight: 500,
                                                fontSize: '0.85rem',
                                            }}>
                                                {item.by}
                                            </Typography>
                                            <Typography variant="caption" sx={{
                                                color: GRAY_COLOR,
                                                fontSize: '0.8rem',
                                            }}>
                                                {item.byEmail}
                                            </Typography>
                                        </Box>
                                    </TableCell>
                                </TableRow>
                            );
                        })
                    )}
                </TableBody>
            </Table>

            {totalCount > 0 && (
                <TablePagination
                    rowsPerPageOptions={isMobile ? [5, 10, 25] : [5, 10, 25, 50]}
                    component="div"
                    count={totalCount}
                    SelectProps={{
                        MenuProps: {
                            disableScrollLock: true
                        }
                    }}
                    rowsPerPage={rowsPerPage}
                    page={page}
                    onPageChange={onPageChange}
                    onRowsPerPageChange={onRowsPerPageChange}
                    sx={{
                        borderTop: `1px solid ${alpha(color, 0.1)}`,
                        '& .MuiTablePagination-toolbar': {
                            minHeight: '52px',
                            padding: '0 16px',
                        },
                        '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
                            fontSize: '0.85rem',
                            color: TEXT_COLOR,
                            fontWeight: 400,
                        },
                        '& .MuiTablePagination-actions': {
                            marginLeft: '8px',
                        },
                        '& .MuiIconButton-root': {
                            padding: '6px',
                        },
                    }}
                />
            )}
        </TableContainer>
    );
};

export default FinalizedTable;