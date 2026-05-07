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
    Tooltip,
    Chip,
    Link
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { Clock, AlertOctagon, AlertTriangle } from 'lucide-react';
import PriorityBadge from '../../../../../../components/ui/PriorityBadge';
import reportIcon from '../../../../../../assets/icons/report.gif';
import penIcon from '../../../../../../assets/icons/Edit.gif';
import lockedIcon from '../../../../../../assets/icons/locked.gif';
import discardIcon from '../../../../../../assets/icons/btnDel.gif';
import {
    BLUE_COLOR,
    GRAY_COLOR,
    TEXT_COLOR,
    ORANGE_COLOR
} from '../../utils/constants';

const HoldingTable = ({
    items,
    selected,
    onToggleSelect,
    onToggleAll,
    onLockedClick,
    onDiscardClick,
    onEditClick,
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
            <Table size="small" sx={{ minWidth: isMobile ? 1300 : 'auto' }}>
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
                        <TableCell sx={{ minWidth: 180 }}>
                            {isMobile ? 'Date/Time' : 'Elapsed Time'}
                        </TableCell>
                        <TableCell sx={{ minWidth: 100 }}>Priority</TableCell>
                        <TableCell sx={{ minWidth: 120 }}>
                            Technician
                        </TableCell>
                        <TableCell sx={{ minWidth: 180 }}>
                            Customer Info
                        </TableCell>
                        <TableCell align="center" sx={{ minWidth: 120 }}>
                            {isMobile ? 'Prior Report' : 'Locked Report'}
                        </TableCell>
                        <TableCell align="center" sx={{ minWidth: 80 }}>
                            Edit
                        </TableCell>
                        <TableCell sx={{ minWidth: 200 }}>
                            {isMobile ? 'Reason & Notes' : 'Reason & Notes'}
                        </TableCell>
                        <TableCell align="center" sx={{ minWidth: 80 }}>
                            {isMobile ? 'Lock' : 'LOCKED'}
                        </TableCell>
                        <TableCell align="center" sx={{ minWidth: 80 }}>
                            {isMobile ? 'Discard' : 'DISCARD'}
                        </TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {items.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={10} align="center" sx={{ py: 6 }}>
                                <Box sx={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: 1,
                                }}>
                                    <AlertOctagon size={32} color={alpha(TEXT_COLOR, 0.2)} />
                                    <Typography
                                        variant="body2"
                                        sx={{
                                            color: TEXT_COLOR,
                                            opacity: 0.6,
                                            fontSize: '0.85rem',
                                            fontWeight: 500,
                                        }}
                                    >
                                        No holding reports
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
                                                color: TEXT_COLOR,
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
                                                <Clock size={12} />
                                                {item.completedElapsedTime}
                                            </Typography>
                                        </Box>
                                    </TableCell>
                                    <TableCell sx={{ py: 1.5 }}>
                                        <PriorityBadge priority={item.priority} />
                                    </TableCell>
                                    <TableCell sx={{ py: 1.5 }}>
                                        <Typography
                                            variant="body2"
                                            sx={{
                                                color: TEXT_COLOR,
                                                fontSize: '0.85rem',
                                                fontWeight: 400,
                                            }}
                                        >
                                            {item.technician}
                                        </Typography>
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
                                    <TableCell align="center" sx={{ py: 1.5 }}>
                                        {item.priorLockedReport ? (
                                            <Tooltip title="View Prior Locked Report">
                                                <IconButton
                                                    size="small"
                                                    onClick={() => onViewPDF(item.lastReportLink)}
                                                    sx={{
                                                        color: BLUE_COLOR,
                                                        '&:hover': {
                                                            backgroundColor: alpha(BLUE_COLOR, 0.1),
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
                                                color: GRAY_COLOR,
                                                fontSize: '0.8rem',
                                            }}>
                                                —
                                            </Typography>
                                        )}
                                    </TableCell>
                                    <TableCell align="center" sx={{ py: 1.5 }}>
                                        <Tooltip title="Edit RME Form">
                                            <IconButton
                                                size="small"
                                                onClick={() => onEditClick(item)}
                                                sx={{
                                                    color: ORANGE_COLOR,
                                                    '&:hover': {
                                                        backgroundColor: alpha(ORANGE_COLOR, 0.1),
                                                    },
                                                }}
                                            >
                                                <img
                                                    src={penIcon}
                                                    alt="edit"
                                                    style={{
                                                        width: '20px',
                                                        height: '20px',
                                                    }}
                                                />
                                            </IconButton>
                                        </Tooltip>
                                    </TableCell>
                                    <TableCell sx={{ py: 1.5 }}>
                                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                            <Chip
                                                label={item.reason}
                                                size="small"
                                                sx={{
                                                    bgcolor: alpha(color, 0.1),
                                                    color: color,
                                                    fontWeight: 500,
                                                    fontSize: '0.85rem',
                                                    alignSelf: 'flex-start',
                                                }}
                                            />
                                            {item.notes && (
                                                <Typography variant="caption" sx={{
                                                    color: TEXT_COLOR,
                                                    fontSize: '0.8rem',
                                                    lineHeight: 1.2,
                                                    whiteSpace: 'normal',
                                                    wordBreak: 'break-word',
                                                    display: '-webkit-box',
                                                    WebkitLineClamp: 2,
                                                    WebkitBoxOrient: 'vertical',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                }}>
                                                    {item.notes}
                                                </Typography>
                                            )}
                                        </Box>
                                    </TableCell>
                                    <TableCell align="center" sx={{ py: 1.5 }}>
                                        <Tooltip title="Click to lock this report">
                                            <IconButton
                                                size="small"
                                                onClick={() => onLockedClick(item.id, item)}
                                                sx={{
                                                    padding: '6px',
                                                    '&:hover': {
                                                        backgroundColor: alpha('#10b981', 0.1),
                                                    },
                                                }}
                                            >
                                                <img
                                                    src={lockedIcon}
                                                    alt="locked"
                                                    style={{
                                                        width: '20px',
                                                        height: '20px',
                                                    }}
                                                />
                                            </IconButton>
                                        </Tooltip>
                                    </TableCell>
                                    <TableCell align="center" sx={{ py: 1.5 }}>
                                        <Tooltip title="Click to discard this report">
                                            <IconButton
                                                size="small"
                                                onClick={() => onDiscardClick(item.id, item)}
                                                sx={{
                                                    padding: '6px',
                                                    '&:hover': {
                                                        backgroundColor: alpha('#ef4444', 0.1),
                                                    },
                                                }}
                                            >
                                                <img
                                                    src={discardIcon}
                                                    alt="discard"
                                                    style={{
                                                        width: '20px',
                                                        height: '20px',
                                                    }}
                                                />
                                            </IconButton>
                                        </Tooltip>
                                    </TableCell>
                                </TableRow>
                            );
                        })
                    )}
                </TableBody>
            </Table>

            {totalCount > 0 && (
                <TablePagination
                    SelectProps={{
                        MenuProps: {
                            disableScrollLock: true
                        }
                    }}
                    rowsPerPageOptions={isMobile ? [5, 10, 25] : [5, 10, 25, 50]}
                    component="div"
                    count={totalCount}
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

export default HoldingTable;