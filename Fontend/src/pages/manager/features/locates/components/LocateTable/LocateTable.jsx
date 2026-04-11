import React, { useEffect, useState } from 'react';
import {
    TableContainer,
    Table,
    TableHead,
    TableBody,
    TableRow,
    TableCell,
    TablePagination,
    Checkbox,
    Button,
    Stack,
    Chip,
    Tooltip,
    IconButton,
    Typography,
    Box,
    Alert,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
    CheckCircle,
    Clock,
    Mail,
    User,
    PhoneCall,
    AlertTriangle,
    AlertCircle,
} from 'lucide-react';
import {
    formatDate,
    formatDateShort,
    formatTimeRemaining,
    calculateExpirationDate,
} from '../../utils/dateUtils';
import {
    BLUE_COLOR,
    GREEN_COLOR,
    RED_COLOR,
    ORANGE_COLOR,
    GRAY_COLOR,
    TEXT_COLOR,
} from '../../utils/constants';

const LocateTable = ({
    items,
    selected,
    onToggleSelect,
    onToggleAll,
    onMarkCalled,
    onManualComplete,
    color,
    showCallAction = false,
    showCalledBy = false,
    showTimerColumn = false,
    showManualCompleteAction = false,
    totalCount,
    page,
    rowsPerPage,
    onPageChange,
    onRowsPerPageChange,
    markCalledMutation,
    completeWorkOrderManuallyMutation,
    tableType = 'pending',
    isMobile = false,
}) => {
    const [currentTime, setCurrentTime] = useState(() => new Date());

    const getColumnCount = () => {
        let count = 1;
        if (showCallAction) count++;
        if (showTimerColumn) count++;
        count += 4;
        if (showCalledBy) count++;
        if (showManualCompleteAction && tableType === 'inProgress') count++;
        return count;
    };

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    const allSelectedOnPage = items.length > 0 && items.every(item => selected.has(item.id));
    const someSelectedOnPage = items.length > 0 && items.some(item => selected.has(item.id));

    const renderManualCompleteButton = (item) => {
        if (showManualCompleteAction && tableType === 'inProgress') {
            return (
                <Tooltip title="Mark as Complete">
                    <IconButton
                        size="small"
                        onClick={() => onManualComplete(item.workOrderId)}
                        disabled={completeWorkOrderManuallyMutation?.isPending}
                        sx={{
                            color: GREEN_COLOR,
                            '&:hover': {
                                backgroundColor: alpha(GREEN_COLOR, 0.1),
                            },
                        }}
                    >
                        <CheckCircle size={16} />
                    </IconButton>
                </Tooltip>
            );
        }
        return null;
    };

    const getRealTimeRemaining = (item) => {
        if (!item.locatesCalled || !item.calledAt || !item.callType || item.isExpired) {
            return {
                text: item.timeRemainingText,
                color: item.timeRemainingColor,
                detail: item.timeRemainingDetail
            };
        }

        const expirationDate = calculateExpirationDate(item.calledAt, item.callType);
        if (!expirationDate) {
            return { text: '—', color: GRAY_COLOR, detail: '' };
        }

        const remainingMs = expirationDate.getTime() - currentTime.getTime();
        const buffer = 1000;

        if (remainingMs <= 0) {
            return {
                text: 'EXPIRED',
                color: RED_COLOR,
                detail: `Expired on: ${formatDate(expirationDate)}`
            };
        }

        const text = formatTimeRemaining(remainingMs + buffer);
        const detail = `Expires at: ${formatDate(expirationDate)}`;

        let timeRemainingColor = TEXT_COLOR;
        if (item.isEmergency) {
            if (remainingMs <= 60 * 60 * 1000) {
                timeRemainingColor = RED_COLOR;
            } else if (remainingMs <= 2 * 60 * 60 * 1000) {
                timeRemainingColor = ORANGE_COLOR;
            } else {
                timeRemainingColor = BLUE_COLOR;
            }
        } else {
            if (remainingMs <= 24 * 60 * 60 * 1000) {
                timeRemainingColor = ORANGE_COLOR;
            } else {
                timeRemainingColor = BLUE_COLOR;
            }
        }

        return { text, color: timeRemainingColor, detail };
    };

    const renderDateCell = (item) => {
        if (tableType === 'completed') {
            return (
                <>
                    <Box>
                        <Typography variant="caption" sx={captionStyle(isMobile)}>
                            {isMobile ? 'Triggered:' : 'Locate Triggered:'}
                            <Typography variant="caption" sx={blueCaptionStyle(isMobile)}>
                                {isMobile ? formatDateShort(item.locateTriggeredDate) : formatDate(item.locateTriggeredDate)}
                            </Typography>
                        </Typography>
                    </Box>

                    <Box>
                        <Typography variant="caption" sx={captionStyle(isMobile)}>
                            {isMobile ? 'Called:' : 'Locate Called In:'}
                            {item.locateCalledInDate ? (
                                <Typography variant="caption" sx={orangeCaptionStyle(isMobile)}>
                                    {isMobile ? formatDateShort(item.locateCalledInDate) : formatDate(item.locateCalledInDate)}
                                </Typography>
                            ) : (
                                <Typography variant="caption" sx={grayItalicCaptionStyle(isMobile)}>
                                    {isMobile ? 'Not called' : 'Not called yet'}
                                </Typography>
                            )}
                        </Typography>
                    </Box>

                    <Box>
                        <Typography variant="caption" sx={captionStyle(isMobile)}>
                            {isMobile ? 'Clear:' : 'Clear-to-Dig:'}
                            {item.clearToDigDate ? (
                                <Typography variant="caption" sx={greenCaptionStyle(isMobile)}>
                                    {isMobile ? formatDateShort(item.clearToDigDate) : formatDate(item.clearToDigDate)}
                                </Typography>
                            ) : (
                                <Typography variant="caption" sx={grayItalicCaptionStyle(isMobile)}>
                                    Pending
                                </Typography>
                            )}
                        </Typography>
                    </Box>
                </>
            );
        } else if (tableType === 'inProgress') {
            return (
                <Box>
                    <Typography variant="caption" sx={captionStyle(isMobile)}>
                        {isMobile ? 'Called:' : 'Locate Called:'}
                        <Typography variant="caption" sx={orangeCaptionStyle(isMobile)}>
                            {isMobile ? formatDateShort(item.calledAt) : formatDateShort(item.calledAt)}
                        </Typography>
                    </Typography>
                </Box>
            );
        } else {
            return (
                <>
                    <Box>
                        <Typography variant="caption" sx={captionStyle(isMobile)}>
                            {isMobile ? 'Triggered:' : 'Triggered Locate:'}
                            <Typography variant="caption" sx={blueCaptionStyle(isMobile)}>
                                {isMobile ? formatDateShort(item.locateTriggeredDate) : formatDate(item.locateTriggeredDate)}
                            </Typography>
                        </Typography>
                    </Box>
                    <Box>
                        <Typography variant="caption" sx={captionStyle(isMobile)}>
                            {isMobile ? 'Target:' : 'Target Work Date:'}
                            <Typography variant="caption" sx={greenCaptionStyle(isMobile)}>
                                {item.targetWorkDate}
                            </Typography>
                        </Typography>
                    </Box>
                </>
            );
        }
    };

    const renderCallAction = (item) => {
        if (item.locatesCalled) {
            return (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CheckCircle size={isMobile ? 16 : 18} color={RED_COLOR} />
                    <Chip
                        label={item.callType || 'Called'}
                        size="small"
                        sx={{
                            backgroundColor: item.callType === 'Emergency' || item.callType === 'EMERGENCY'
                                ? alpha(RED_COLOR, 0.1)
                                : alpha(BLUE_COLOR, 0.1),
                            color: item.callType === 'Emergency' || item.callType === 'EMERGENCY' ? RED_COLOR : BLUE_COLOR,
                            border: `1px solid ${item.callType === 'Emergency' || item.callType === 'EMERGENCY'
                                ? alpha(RED_COLOR, 0.2)
                                : alpha(BLUE_COLOR, 0.2)}`,
                            fontSize: isMobile ? '0.7rem' : '0.75rem',
                            fontWeight: 500,
                            height: isMobile ? '22px' : '22px',
                            '& .MuiChip-label': { px: 1 },
                        }}
                    />
                </Box>
            );
        }

        return (
            <Stack direction={isMobile ? "column" : "row"} spacing={isMobile ? 0.5 : 1}>
                <Button
                    size="small"
                    variant="outlined"
                    onClick={() => onMarkCalled(item.workOrderId, 'STANDARD')}
                    startIcon={isMobile ? null : <PhoneCall size={14} />}
                    disabled={markCalledMutation?.isPending}
                    sx={{
                        textTransform: 'none',
                        fontSize: isMobile ? '0.7rem' : '0.75rem',
                        height: isMobile ? '28px' : '30px',
                        px: isMobile ? 1 : 1.5,
                        minWidth: isMobile ? '80px' : 'auto',
                        whiteSpace: 'nowrap',
                    }}
                >
                    {markCalledMutation?.isPending && markCalledMutation.variables?.id === item.workOrderId
                        ? (isMobile ? '...' : 'Calling...')
                        : (isMobile ? 'Standard' : 'Standard')
                    }
                </Button>
                <Button
                    size="small"
                    variant="outlined"
                    color="error"
                    onClick={() => onMarkCalled(item.workOrderId, 'EMERGENCY')}
                    startIcon={isMobile ? null : <AlertTriangle size={14} />}
                    disabled={markCalledMutation?.isPending}
                    sx={{
                        textTransform: 'none',
                        fontSize: isMobile ? '0.7rem' : '0.75rem',
                        height: isMobile ? '28px' : '30px',
                        px: isMobile ? 1 : 1.5,
                        minWidth: isMobile ? '80px' : 'auto',
                        whiteSpace: 'nowrap',
                    }}
                >
                    {markCalledMutation?.isPending && markCalledMutation.variables?.id === item.workOrderId
                        ? (isMobile ? '...' : 'Calling...')
                        : (isMobile ? 'Emergency' : 'Emergency')
                    }
                </Button>
            </Stack>
        );
    };

    const renderTimerCell = (item) => {
        if (item.locatesCalled && item.calledAt && item.callType) {
            const timeRemaining = getRealTimeRemaining(item);
            return (
                <Tooltip title={timeRemaining.detail}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Clock size={isMobile ? 14 : 16} color={timeRemaining.color} />
                        <Typography variant="body2" sx={timerTextStyle(isMobile, timeRemaining)}>
                            {timeRemaining.text}
                        </Typography>
                    </Box>
                </Tooltip>
            );
        }

        return (
            <Typography variant="body2" sx={grayTextStyle(isMobile)}>
                —
            </Typography>
        );
    };

    if (items.length === 0) {
        return (
            <TableContainer>
                <Table size="small">
                    <TableBody>
                        <TableRow>
                            <TableCell colSpan={getColumnCount()} align="center" sx={{ py: 6 }}>
                                <Box sx={emptyStateStyle}>
                                    <AlertCircle size={32} color={alpha(TEXT_COLOR, 0.2)} />
                                    <Typography variant="body2" sx={emptyStateTextStyle}>
                                        No records found
                                    </Typography>
                                </Box>
                            </TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </TableContainer>
        );
    }

    return (
        <TableContainer sx={tableContainerStyle(color)}>
            <Table size="small" sx={{ minWidth: isMobile ? 1000 : 'auto', tableLayout: 'auto' }}>
                <TableHead>
                    <TableRow sx={tableHeadStyle(color, isMobile)}>
                        <TableCell padding="checkbox" sx={checkboxHeaderStyle(isMobile)}>
                            <Checkbox
                                size="small"
                                checked={allSelectedOnPage}
                                indeterminate={someSelectedOnPage && !allSelectedOnPage}
                                onChange={onToggleAll}
                                sx={checkboxStyle(color)}
                            />
                        </TableCell>
                        {showCallAction && (
                            <TableCell sx={{ minWidth: 150, maxWidth: 200 }}>
                                {isMobile ? 'Action' : 'Call Action'}
                            </TableCell>
                        )}
                        {showTimerColumn && (
                            <TableCell sx={{ minWidth: 120, maxWidth: 160 }}>
                                {isMobile ? 'Time' : 'Time Remaining'}
                            </TableCell>
                        )}
                        <TableCell sx={{ minWidth: 150 }}>Customer</TableCell>
                        <TableCell sx={{ minWidth: 180 }}>Address</TableCell>
                        <TableCell sx={{ minWidth: 180 }}>Date</TableCell>
                        <TableCell sx={{ minWidth: 120 }}>Technician</TableCell>
                        {showCalledBy && (
                            <TableCell sx={{ minWidth: 150, maxWidth: 200 }}>Called By</TableCell>
                        )}
                        {showManualCompleteAction && tableType === 'inProgress' && (
                            <TableCell sx={{ minWidth: 80, width: '80px', maxWidth: '80px' }}>
                                {isMobile ? 'Act' : 'Actions'}
                            </TableCell>
                        )}
                    </TableRow>
                </TableHead>
                <TableBody>
                    {items.map(item => {
                        const isSelected = selected.has(item.id);
                        const addressLine = item.street || item.original || '—';
                        const location = [item.city, item.state, item.zip].filter(Boolean).join(', ');
                        const hasCheckmark = item.locatesCalled && item.calledByName;

                        return (
                            <TableRow
                                key={item.id}
                                hover
                                sx={tableRowStyle(isSelected, color)}
                            >
                                <TableCell padding="checkbox" sx={checkboxCellStyle(isMobile)}>
                                    <Checkbox
                                        checked={isSelected}
                                        onChange={() => onToggleSelect(item.id)}
                                        size="small"
                                        sx={checkboxStyle(color)}
                                    />
                                </TableCell>

                                {showCallAction && (
                                    <TableCell sx={{ py: 1.5, minWidth: 150, maxWidth: 200 }}>
                                        {renderCallAction(item)}
                                    </TableCell>
                                )}

                                {showTimerColumn && (
                                    <TableCell sx={{ py: 1.5, minWidth: 120, maxWidth: 160 }}>
                                        {renderTimerCell(item)}
                                    </TableCell>
                                )}

                                <TableCell sx={{ py: 1.5, minWidth: 150 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5 }}>
                                        {hasCheckmark && (
                                            <Tooltip title={`Called by ${item.calledByName}`}>
                                                <CheckCircle size={isMobile ? 14 : 16} color={RED_COLOR} />
                                            </Tooltip>
                                        )}
                                        <Box sx={{ flex: 1 }}>
                                            <Typography variant="body2" sx={customerNameStyle(isMobile)}>
                                                {item.customerName}
                                            </Typography>
                                            <Typography variant="caption" sx={workOrderStyle}>
                                                WO: {item.workOrderNumber}
                                            </Typography>
                                        </Box>
                                    </Box>
                                </TableCell>

                                <TableCell sx={{ py: 1.5, minWidth: 180 }}>
                                    <Typography variant="body2" sx={addressStyle(isMobile)}>
                                        {addressLine}
                                    </Typography>
                                    {location && (
                                        <Typography variant="caption" sx={locationStyle}>
                                            {location}
                                        </Typography>
                                    )}
                                </TableCell>

                                <TableCell sx={{ py: 1.5, minWidth: 180 }}>
                                    <Stack spacing={0.5}>
                                        {renderDateCell(item)}
                                    </Stack>
                                </TableCell>

                                <TableCell sx={{ py: 1.5, minWidth: 120 }}>
                                    <Typography variant="body2" sx={techNameStyle(isMobile)}>
                                        {item.techName}
                                    </Typography>
                                </TableCell>

                                {showCalledBy && (
                                    <TableCell sx={{ py: 1.5, minWidth: 150, maxWidth: 200 }}>
                                        {item.calledByName ? (
                                            <Box>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                    <User size={isMobile ? 12 : 14} color={TEXT_COLOR} />
                                                    <Typography variant="body2" sx={calledByNameStyle(isMobile)}>
                                                        {item.calledByName}
                                                    </Typography>
                                                </Box>
                                                {item.calledByEmail && !isMobile && (
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.25 }}>
                                                        <Mail size={10} color={GRAY_COLOR} />
                                                        <Typography variant="caption" sx={calledByEmailStyle}>
                                                            {item.calledByEmail}
                                                        </Typography>
                                                    </Box>
                                                )}
                                            </Box>
                                        ) : (
                                            <Typography variant="body2" sx={grayTextStyle(isMobile)}>
                                                —
                                            </Typography>
                                        )}
                                    </TableCell>
                                )}

                                {showManualCompleteAction && tableType === 'inProgress' && (
                                    <TableCell sx={{ py: 1.5, width: '80px', minWidth: '80px', maxWidth: '80px' }}>
                                        {renderManualCompleteButton(item)}
                                    </TableCell>
                                )}
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>

            {totalCount > 0 && (
                <TablePagination
                    rowsPerPageOptions={isMobile ? [5, 10, 25] : [5, 10, 25, 50]}
                    component="div"
                    SelectProps={{
                        MenuProps: {
                            disableScrollLock: true
                        }
                    }}
                    count={totalCount}
                    rowsPerPage={rowsPerPage}
                    page={page}
                    onPageChange={onPageChange}
                    onRowsPerPageChange={onRowsPerPageChange}
                    sx={paginationStyle(color, isMobile)}
                />
            )}
        </TableContainer>
    );
};

const tableContainerStyle = (color) => ({
    overflowX: 'auto',
    '&::-webkit-scrollbar': { height: '8px' },
    '&::-webkit-scrollbar-track': { backgroundColor: alpha(color, 0.05) },
    '&::-webkit-scrollbar-thumb': {
        backgroundColor: alpha(color, 0.2),
        borderRadius: '4px',
    },
});

const tableHeadStyle = (color, isMobile) => ({
    bgcolor: alpha(color, 0.04),
    '& th': {
        borderBottom: `2px solid ${alpha(color, 0.1)}`,
        py: 1.5,
        px: 1.5,
        fontSize: isMobile ? '0.75rem' : '0.8rem',
        fontWeight: 600,
        color: TEXT_COLOR,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
    },
});

const checkboxHeaderStyle = (isMobile) => ({
    pl: isMobile ? 1.5 : 2.5,
    width: '50px',
    minWidth: '50px',
    maxWidth: '50px',
});

const checkboxStyle = (color) => ({
    color,
    '&.Mui-checked': { color },
    padding: '4px',
});

const checkboxCellStyle = (isMobile) => ({
    pl: isMobile ? 1.5 : 2.5,
    py: 1.5,
    width: '50px',
    minWidth: '50px',
    maxWidth: '50px',
});

const tableRowStyle = (isSelected, color) => ({
    bgcolor: isSelected ? alpha(color, 0.1) : 'white',
    '&:hover': { backgroundColor: alpha(color, 0.05) },
    '&:last-child td': { borderBottom: 'none' },
});

const customerNameStyle = (isMobile) => ({
    color: TEXT_COLOR,
    fontSize: isMobile ? '0.8rem' : '0.85rem',
    fontWeight: 500,
    mb: 0.25,
    wordBreak: 'break-word',
    overflowWrap: 'break-word',
});

const workOrderStyle = {
    color: GRAY_COLOR,
    fontSize: '0.75rem',
    fontWeight: 400,
    display: 'block',
    wordBreak: 'break-word',
    overflowWrap: 'break-word',
};

const addressStyle = (isMobile) => ({
    color: TEXT_COLOR,
    fontSize: isMobile ? '0.8rem' : '0.85rem',
    fontWeight: 400,
    mb: 0.25,
    wordBreak: 'break-word',
    overflowWrap: 'break-word',
});

const locationStyle = {
    color: GRAY_COLOR,
    fontSize: '0.75rem',
    fontWeight: 400,
    wordBreak: 'break-word',
    overflowWrap: 'break-word',
};

const techNameStyle = (isMobile) => ({
    color: TEXT_COLOR,
    fontSize: isMobile ? '0.8rem' : '0.85rem',
    fontWeight: 400,
    wordBreak: 'break-word',
    overflowWrap: 'break-word',
});

const calledByNameStyle = (isMobile) => ({
    color: TEXT_COLOR,
    fontSize: isMobile ? '0.8rem' : '0.85rem',
    fontWeight: 500,
    wordBreak: 'break-word',
    overflowWrap: 'break-word',
});

const calledByEmailStyle = {
    color: GRAY_COLOR,
    fontSize: '0.7rem',
    fontWeight: 400,
    wordBreak: 'break-word',
    overflowWrap: 'break-word',
};

const grayTextStyle = (isMobile) => ({
    color: GRAY_COLOR,
    fontSize: isMobile ? '0.8rem' : '0.85rem',
    fontWeight: 400,
    wordBreak: 'break-word',
    overflowWrap: 'break-word',
});

const timerTextStyle = (isMobile, timeRemaining) => ({
    color: timeRemaining.color,
    fontSize: isMobile ? '0.8rem' : '0.85rem',
    fontWeight: timeRemaining.text === 'EXPIRED' ? 600 : 400,
    whiteSpace: 'nowrap',
});

const captionStyle = (isMobile) => ({
    color: GRAY_COLOR,
    fontSize: '0.7rem',
    fontWeight: 400,
    display: 'block',
    mb: 0.25,
    wordBreak: 'break-word',
    overflowWrap: 'break-word',
});

const blueCaptionStyle = (isMobile) => ({
    color: BLUE_COLOR,
    fontSize: isMobile ? '0.75rem' : '0.75rem',
    fontWeight: 500,
    ml: 0.5,
    wordBreak: 'break-word',
    overflowWrap: 'break-word',
});

const orangeCaptionStyle = (isMobile) => ({
    color: ORANGE_COLOR,
    fontSize: isMobile ? '0.75rem' : '0.75rem',
    fontWeight: 500,
    ml: 0.5,
    wordBreak: 'break-word',
    overflowWrap: 'break-word',
});

const greenCaptionStyle = (isMobile) => ({
    color: GREEN_COLOR,
    fontSize: isMobile ? '0.75rem' : '0.75rem',
    fontWeight: 500,
    ml: 0.5,
    wordBreak: 'break-word',
    overflowWrap: 'break-word',
});

const grayItalicCaptionStyle = (isMobile) => ({
    color: GRAY_COLOR,
    fontSize: isMobile ? '0.75rem' : '0.75rem',
    fontWeight: 400,
    fontStyle: 'italic',
    ml: 0.5,
    wordBreak: 'break-word',
    overflowWrap: 'break-word',
});

const emptyStateStyle = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 1,
};

const emptyStateTextStyle = {
    color: TEXT_COLOR,
    opacity: 0.6,
    fontSize: '0.85rem',
    fontWeight: 500,
};

const paginationStyle = (color, isMobile) => ({
    borderTop: `1px solid ${alpha(color, 0.1)}`,
    '& .MuiTablePagination-toolbar': {
        minHeight: '52px',
        padding: '0 16px',
    },
    '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
        fontSize: isMobile ? '0.75rem' : '0.8rem',
        color: TEXT_COLOR,
        fontWeight: 400,
    },
    '& .MuiTablePagination-actions': { marginLeft: '8px' },
    '& .MuiIconButton-root': { padding: '6px' },
});

export default LocateTable;