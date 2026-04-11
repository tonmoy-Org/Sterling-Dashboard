import React from 'react';
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
    IconButton,
    Tooltip
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { Timer, FileSpreadsheet } from 'lucide-react';
import reportIcon from '../../../../../../assets/icons/report.gif';
import Link from '@mui/material/Link';

const ReportNeededTable = ({
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
    onViewPDF,
    isMobile,
}) => {
    const allSelectedOnPage = items.length > 0 && items.every(item => selected.has(item.id));
    const someSelectedOnPage = items.length > 0 && items.some(item => selected.has(item.id));


    return (
        <TableContainer sx={{
            overflowX: 'auto',
            '&::-webkit-scrollbar': { height: '8px' },
            '&::-webkit-scrollbar-track': { backgroundColor: alpha(color, 0.05) },
            '&::-webkit-scrollbar-thumb': { backgroundColor: alpha(color, 0.2), borderRadius: '4px' },
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
                            color: '#0F1115',
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
                        <TableCell sx={{ minWidth: 150 }}>
                            {isMobile ? 'Date/Time' : 'W.O Date & Elapsed Time'}
                        </TableCell>
                        <TableCell sx={{ minWidth: 150 }}>
                            Task
                        </TableCell>
                        <TableCell sx={{ minWidth: 120 }}>
                            Technician
                        </TableCell>
                        <TableCell sx={{ minWidth: 180 }}>
                            Customer Info                        </TableCell>
                        <TableCell align="center" sx={{ minWidth: 120 }}>
                            {isMobile ? 'Report' : 'Last Report'}
                        </TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {items.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                                <Box sx={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: 1,
                                }}>
                                    <FileSpreadsheet size={32} color={alpha('#0F1115', 0.2)} />
                                    <Typography
                                        variant="body2"
                                        sx={{
                                            color: '#0F1115',
                                            opacity: 0.6,
                                            fontSize: '0.85rem',
                                            fontWeight: 500,
                                        }}
                                    >
                                        No reports needed
                                    </Typography>
                                </Box>
                            </TableCell>
                        </TableRow>
                    ) : (
                        items.map((item) => {
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
                                        <Box>
                                            <Typography variant="body2" sx={{
                                                fontWeight: 500,
                                                color: '#0F1115',
                                                fontSize: '0.85rem',
                                            }}>
                                                {item.completedDate}
                                            </Typography>
                                            <Typography variant="caption" sx={{
                                                color: item.elapsedColor,
                                                fontWeight: 600,
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 0.5,
                                                fontSize: '0.8rem',
                                            }}>
                                                <Timer size={12} />
                                                {item.completedElapsedTime}
                                            </Typography>
                                        </Box>
                                    </TableCell>
                                    <TableCell sx={{ py: 1.5 }}>
                                        <Typography
                                            variant="body2"
                                            sx={{
                                                color: '#0F1115',
                                                fontSize: '0.85rem',
                                                fontWeight: 400,
                                            }}
                                        >
                                            {item.task}
                                        </Typography>
                                    </TableCell>
                                    <TableCell sx={{ py: 1.5 }}>
                                        <Typography
                                            variant="body2"
                                            sx={{
                                                color: '#0F1115',
                                                fontSize: '0.85rem',
                                                fontWeight: 400,
                                            }}
                                        >
                                            {item.technician}
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
                                                '&:hover': {
                                                    color: '#1976d2',
                                                }
                                            }}
                                        >
                                            <Typography
                                                variant="body2"
                                                sx={{
                                                    fontWeight: 500,
                                                    fontSize: '0.85rem',
                                                    wordBreak: 'break-word',
                                                    overflowWrap: 'break-word',
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
                                    <TableCell align="center" sx={{ py: 1.5 }}>
                                        {item.lastReport ? (
                                            <Tooltip title="View Last Locked Report">
                                                <IconButton
                                                    size="small"
                                                    onClick={() => onViewPDF(item.lastReportLink)}
                                                    sx={{
                                                        color: '#1976d2',
                                                        '&:hover': {
                                                            backgroundColor: alpha('#1976d2', 0.1),
                                                        },
                                                    }}
                                                >
                                                    <img
                                                        src={reportIcon}
                                                        alt="view-report"
                                                        style={{
                                                            width: '20px',
                                                            height: '20px',
                                                        }}
                                                    />
                                                </IconButton>
                                            </Tooltip>
                                        ) : (
                                            <Typography variant="caption" sx={{
                                                color: '#6b7280',
                                                fontSize: '0.8rem',
                                            }}>
                                                —
                                            </Typography>
                                        )}
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
                    rowsPerPage={rowsPerPage}
                    page={page}
                    SelectProps={{
                        MenuProps: {
                            disableScrollLock: true
                        }
                    }}
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
                            color: '#0F1115',
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

export default ReportNeededTable;