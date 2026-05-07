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
    FormControl,
    InputLabel,
    MenuItem,
    Link,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { Timer, FileSpreadsheet, Save, AlertTriangle } from 'lucide-react';
import PriorityBadge from '../../../../../../components/ui/PriorityBadge';
import StyledSelect from '../../../../../../components/ui/StyledSelect';

import reportIcon from '../../../../../../assets/icons/report.gif';
import penIcon from '../../../../../../assets/icons/Edit.gif';
import lockedIcon from '../../../../../../assets/icons/locked.gif';
import discardIcon from '../../../../../../assets/icons/btnDel.gif';

import {
    WAIT_TO_LOCK_REASONS,
    BLUE_COLOR,
    GRAY_COLOR,
    TEXT_COLOR,
    ORANGE_COLOR,
    CYAN_COLOR
} from '../../utils/constants';
import UpdateButton from '../../../../../../components/ui/UpdateButton';
import StyledTextarea from '../../../../../../components/ui/StyledTextarea';

const ReportSubmittedTable = ({
    items,
    selected,
    onToggleSelect,
    onToggleAll,
    onLockedClick,
    waitToLockAction,
    onWaitToLockToggle,
    onDiscardClick,
    waitToLockDetails,
    onWaitToLockReasonChange,
    onWaitToLockNotesChange,
    onSaveChanges,
    waitToLockActionSize,
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
        <>
            <TableContainer sx={{
                overflowX: 'auto',
                '&::-webkit-scrollbar': { height: '8px' },
                '&::-webkit-scrollbar-track': { backgroundColor: alpha(color, 0.05) },
                '&::-webkit-scrollbar-thumb': { backgroundColor: alpha(color, 0.2), borderRadius: '4px' },
            }}>
                <Table size="small" sx={{ minWidth: isMobile ? 1400 : 'auto' }}>
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
                            <TableCell padding="checkbox" sx={{ pl: isMobile ? 1.5 : 2.5, width: '50px', minWidth: '50px', maxWidth: '50px' }}>
                                <Checkbox
                                    size="small"
                                    checked={allSelectedOnPage}
                                    indeterminate={someSelectedOnPage && !allSelectedOnPage}
                                    onChange={onToggleAll}
                                    sx={{ color: color, '&.Mui-checked': { color: color }, padding: '4px' }}
                                />
                            </TableCell>
                            <TableCell sx={{ minWidth: 170 }}>
                                {isMobile ? 'Date/Time' : 'Elapsed Time'}
                            </TableCell>
                            <TableCell sx={{ minWidth: 150 }}>Priority</TableCell>
                            <TableCell sx={{ minWidth: 120 }}>Technician</TableCell>
                            <TableCell sx={{ minWidth: 180 }}>Customer Info</TableCell>
                            <TableCell align="center" sx={{ minWidth: 120 }}>
                                {isMobile ? 'Report' : 'Last Report'}
                            </TableCell>
                            <TableCell align="center" sx={{ minWidth: 80 }}>Edit</TableCell>
                            <TableCell align="center" sx={{ minWidth: 80 }}>
                                {isMobile ? 'Lock' : 'LOCKED'}
                            </TableCell>
                            <TableCell align="center" sx={{ minWidth: 100 }}>
                                {isMobile ? 'Wait' : 'Wait To Lock'}
                            </TableCell>
                            <TableCell align="center" sx={{ minWidth: 80 }}>
                                {isMobile ? 'Discard' : 'DISCARD'}
                            </TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {items.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={11} align="center" sx={{ py: 6 }}>
                                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                                        <FileSpreadsheet size={32} color={alpha(TEXT_COLOR, 0.2)} />
                                        <Typography variant="body2" sx={{ color: TEXT_COLOR, opacity: 0.6, fontSize: '0.85rem', fontWeight: 500 }}>
                                            No reports submitted
                                        </Typography>
                                    </Box>
                                </TableCell>
                            </TableRow>
                        ) : (
                            items.map((item) => {
                                const isSelected = selected.has(item.id);
                                const isWaitToLock = waitToLockAction.has(item.id);
                                const details = waitToLockDetails[item.id] || { reason: '', notes: '' };

                                return (
                                    <React.Fragment key={item.id}>
                                        <TableRow
                                            hover
                                            sx={{
                                                bgcolor: isSelected ? alpha(color, 0.1) : 'white',
                                                '&:hover': { backgroundColor: alpha(color, 0.05) },
                                                '&:last-child td': { borderBottom: 'none' },
                                            }}
                                        >
                                            <TableCell padding="checkbox" sx={{ pl: isMobile ? 1.5 : 2.5, py: 1.5, width: '50px', minWidth: '50px', maxWidth: '50px' }}>
                                                <Checkbox
                                                    checked={isSelected}
                                                    onChange={() => onToggleSelect(item.id)}
                                                    size="small"
                                                    sx={{ color: color, '&.Mui-checked': { color: color }, padding: '4px' }}
                                                />
                                            </TableCell>
                                            <TableCell sx={{ py: 1.5 }}>
                                                <Box>
                                                    <Typography variant="body2" sx={{ fontWeight: 500, color: TEXT_COLOR, fontSize: '0.85rem' }}>
                                                        {item.completedDate}
                                                    </Typography>
                                                    <Typography variant="caption" sx={{ color: item.elapsedColor, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 0.5, fontSize: '0.8rem' }}>
                                                        <Timer size={12} />
                                                        {item.completedElapsedTime}
                                                    </Typography>
                                                </Box>
                                            </TableCell>
                                            <TableCell sx={{ py: 1.5 }}>
                                                <PriorityBadge priority={item.priority} />
                                            </TableCell>
                                            <TableCell sx={{ py: 1.5 }}>
                                                <Typography variant="body2" sx={{ color: TEXT_COLOR, fontSize: '0.85rem', fontWeight: 400 }}>
                                                    {item.technician}
                                                </Typography>
                                            </TableCell>
                                            <TableCell sx={{ py: 1.5 }}>
                                                <Link
                                                    href={item.woDetailsLink}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    underline="hover"
                                                    sx={{ color: 'inherit', display: 'block', transition: 'color 0.2s ease-in-out', '&:hover': { color: '#1976d2' } }}
                                                >
                                                    <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.85rem', wordBreak: 'break-word', overflowWrap: 'break-word', color: TEXT_COLOR }}>
                                                        {item.customer} - {item.street}
                                                    </Typography>
                                                </Link>
                                                <Typography variant="caption" sx={{ color: '#6b7280', fontSize: '0.8rem', wordBreak: 'break-word', overflowWrap: 'break-word' }}>
                                                    {item.city}, {item.state} {item.zip}
                                                </Typography>
                                            </TableCell>
                                            <TableCell align="center" sx={{ py: 1.5 }}>
                                                {item.lastReport ? (
                                                    <Tooltip title="View Last Locked Report">
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => onViewPDF(item.lastReportLink)}
                                                            sx={{ color: BLUE_COLOR, '&:hover': { backgroundColor: alpha(BLUE_COLOR, 0.1) } }}
                                                        >
                                                            <img src={reportIcon} alt="view-report" style={{ width: '20px', height: '20px' }} />
                                                        </IconButton>
                                                    </Tooltip>
                                                ) : (
                                                    <Typography variant="caption" sx={{ color: GRAY_COLOR, fontSize: '0.8rem' }}>—</Typography>
                                                )}
                                            </TableCell>
                                            <TableCell align="center" sx={{ py: 1 }}>
                                                <Tooltip title="Edit RME Form">
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => onEditClick(item)}
                                                        sx={{ color: ORANGE_COLOR, '&:hover': { backgroundColor: alpha(ORANGE_COLOR, 0.1) } }}
                                                    >
                                                        <img src={penIcon} alt="edit" style={{ width: '20px', height: '20px' }} />
                                                    </IconButton>
                                                </Tooltip>
                                            </TableCell>
                                            <TableCell align="center" sx={{ py: 1.5 }}>
                                                <Tooltip title="Click to lock this report">
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => onLockedClick(item.id, item)}
                                                        disabled={isWaitToLock}
                                                        sx={{ padding: '6px', '&:hover': { backgroundColor: alpha('#10b981', 0.1) } }}
                                                    >
                                                        <img src={lockedIcon} alt="locked" style={{ width: '20px', height: '20px' }} />
                                                    </IconButton>
                                                </Tooltip>
                                            </TableCell>
                                            <TableCell align="center" sx={{ py: 1.5 }}>
                                                <Tooltip title="Wait to Lock - Requires Save Changes">
                                                    <Checkbox
                                                        size="small"
                                                        checked={isWaitToLock}
                                                        onChange={() => onWaitToLockToggle(item.id)}
                                                        sx={{ padding: '6px', color: color, '&.Mui-checked': { color: color } }}
                                                    />
                                                </Tooltip>
                                            </TableCell>
                                            <TableCell align="center" sx={{ py: 1.5 }}>
                                                <Tooltip title="Click to discard this report">
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => onDiscardClick(item.id, item)}
                                                        disabled={isWaitToLock}
                                                        sx={{ padding: '6px', '&:hover': { backgroundColor: alpha('#ef4444', 0.1) } }}
                                                    >
                                                        <img src={discardIcon} alt="discard" style={{ width: '20px', height: '20px' }} />
                                                    </IconButton>
                                                </Tooltip>
                                            </TableCell>
                                        </TableRow>

                                        {isWaitToLock && (
                                            <TableRow sx={{ bgcolor: alpha(CYAN_COLOR, 0.05) }}>
                                                <TableCell colSpan={10} sx={{ p: 2 }}>
                                                    <Box sx={{ pl: 6 }}>
                                                        <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 1, color: CYAN_COLOR, fontSize: '0.8rem' }}>
                                                            Additional Information Required:
                                                        </Typography>
                                                        <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', flexDirection: isMobile ? 'column' : 'row' }}>
                                                            <FormControl size="small" sx={{ minWidth: isMobile ? '100%' : 200 }}>
                                                                <InputLabel sx={{ fontSize: '0.85rem' }}>Reason in Holding</InputLabel>
                                                                <StyledSelect
                                                                    value={details.reason}
                                                                    onChange={(e) => onWaitToLockReasonChange(item.id, e.target.value)}
                                                                    label="Reason in Holding"
                                                                    sx={{ '& .MuiSelect-select': { fontSize: '0.85rem' }, bgcolor: 'white' }}
                                                                >
                                                                    {WAIT_TO_LOCK_REASONS.map((reason) => (
                                                                        <MenuItem key={reason} value={reason} sx={{ fontSize: '0.85rem' }}>
                                                                            {reason}
                                                                        </MenuItem>
                                                                    ))}
                                                                </StyledSelect>
                                                            </FormControl>
                                                            <StyledTextarea
                                                                size="small"
                                                                multiline
                                                                rows={2}
                                                                label="Notes"
                                                                value={details.notes}
                                                                onChange={(e) => onWaitToLockNotesChange(item.id, e.target.value)}
                                                                placeholder="Enter specific details about why the RME will not be locked today..."
                                                                sx={{ flex: 1, width: isMobile ? '100%' : 'auto', '& .MuiInputBase-input': { fontSize: '0.85rem' } }}
                                                            />
                                                            <UpdateButton
                                                                variant="contained"
                                                                color="warning"
                                                                size="small"
                                                                onClick={onSaveChanges}
                                                                disabled={waitToLockActionSize === 0}
                                                                startIcon={<Save size={14} />}
                                                            >
                                                                Save Wait to Lock
                                                            </UpdateButton>
                                                        </Box>
                                                    </Box>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </React.Fragment>
                                );
                            })
                        )}
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
                        sx={{
                            borderTop: `1px solid ${alpha(color, 0.1)}`,
                            '& .MuiTablePagination-toolbar': { minHeight: '52px', padding: '0 16px' },
                            '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': { fontSize: '0.85rem', color: TEXT_COLOR, fontWeight: 400 },
                            '& .MuiTablePagination-actions': { marginLeft: '8px' },
                            '& .MuiIconButton-root': { padding: '6px' },
                        }}
                    />
                )}
            </TableContainer>
        </>
    );
};

export default ReportSubmittedTable;