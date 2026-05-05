import React, { useState } from 'react';
import {
    Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Chip, Stack, Avatar, LinearProgress,
    IconButton, useTheme, useMediaQuery, Grid
} from '@mui/material';
import { styled, alpha } from '@mui/material/styles';
import { Helmet } from 'react-helmet-async';
import { useQuery } from '@tanstack/react-query';
import {
    Clock, MapPin, Briefcase, ChevronRight, Calendar,
    DollarSign
} from 'lucide-react';
import RefreshButton from '../../../../components/ui/RefreshButton';
import { rmeApi } from '../../../../api/services/rmeApi';

// ─── Palette ───────────────────────────────────────────────────────────────
const PALETTE = {
    TEXT: '#0F1115',
    GRAY: '#6b7280',
    BLUE: '#1976d2',
    GREEN: '#10b981',
    ORANGE: '#ed6c02',
    PURPLE: '#8b5cf6',
    RED: '#ef4444',
    TEAL: '#0891b2',
    AMBER: '#f59e0b',
};

// Styled components
const StyledPaper = styled(Paper)(({ theme }) => ({
    backgroundColor: '#fff',
    borderRadius: '6px',
    overflow: 'hidden',
    border: `1px solid ${alpha(PALETTE.BLUE, 0.15)}`,
    ...theme.typography.body2,
    ...theme.applyStyles('dark', {
        backgroundColor: '#1A2027',
    }),
}));

const StatusChip = styled(Chip)(({ status }) => ({
    height: 24,
    fontSize: '0.7rem',
    fontWeight: 600,
    backgroundColor: status === 'completed' ? alpha(PALETTE.GREEN, 0.12) : alpha(PALETTE.AMBER, 0.12),
    color: status === 'completed' ? PALETTE.GREEN : PALETTE.AMBER,
    '& .MuiChip-label': { px: 1 },
}));

// ─── Dummy Data ───────────────────────────────────────────────────────────
const DUMMY_TIME_ENTRIES = [
    {
        id: 1,
        employeeName: 'Benjamin Wade',
        employeeAvatar: 'BW',
        date: '2024-03-15',
        travel: {
            marked: { start: '8:26 AM', end: '9:09 AM', minutes: 43 },
            actual: { start: '8:28 AM', end: '9:00 AM', minutes: 32 },
            proficiency: 74,
        },
        workingTime: {
            marked: { start: '9:09 AM', end: '11:37 AM', minutes: 176 },
            actual: { start: '9:00 AM', end: '12:05 PM', minutes: 185 },
            proficiency: 95,
        },
        billing: {
            variant: { minutes: 255 },
            actual: { minutes: 185 },
            proficiency: 138,
        },
        status: 'completed',
        workOrder: 'WO-001234',
        location: '123 Main St, Anytown, ST 12345',
    },
    {
        id: 2,
        employeeName: 'Sarah Johnson',
        employeeAvatar: 'SJ',
        date: '2024-03-15',
        travel: {
            marked: { start: '7:45 AM', end: '8:30 AM', minutes: 45 },
            actual: { start: '7:50 AM', end: '8:25 AM', minutes: 35 },
            proficiency: 78,
        },
        workingTime: {
            marked: { start: '8:30 AM', end: '12:00 PM', minutes: 210 },
            actual: { start: '8:25 AM', end: '11:45 AM', minutes: 200 },
            proficiency: 95,
        },
        billing: {
            variant: { minutes: 255 },
            actual: { minutes: 200 },
            proficiency: 128,
        },
        status: 'completed',
        workOrder: 'WO-001235',
        location: '456 Oak Ave, Somewhere, ST 67890',
    },
    {
        id: 3,
        employeeName: 'Michael Chen',
        employeeAvatar: 'MC',
        date: '2024-03-14',
        travel: {
            marked: { start: '9:00 AM', end: '9:45 AM', minutes: 45 },
            actual: { start: '9:05 AM', end: '9:40 AM', minutes: 35 },
            proficiency: 78,
        },
        workingTime: {
            marked: { start: '9:45 AM', end: '2:30 PM', minutes: 285 },
            actual: { start: '9:40 AM', end: '2:15 PM', minutes: 275 },
            proficiency: 96,
        },
        billing: {
            variant: { minutes: 330 },
            actual: { minutes: 275 },
            proficiency: 120,
        },
        status: 'in_progress',
        workOrder: 'WO-001236',
        location: '789 Pine Rd, Elsewhere, ST 54321',
    },
    {
        id: 4,
        employeeName: 'Emily Rodriguez',
        employeeAvatar: 'ER',
        date: '2024-03-14',
        travel: {
            marked: { start: '10:15 AM', end: '10:55 AM', minutes: 40 },
            actual: { start: '10:20 AM', end: '10:50 AM', minutes: 30 },
            proficiency: 75,
        },
        workingTime: {
            marked: { start: '10:55 AM', end: '3:20 PM', minutes: 265 },
            actual: { start: '10:50 AM', end: '3:15 PM', minutes: 265 },
            proficiency: 100,
        },
        billing: {
            variant: { minutes: 305 },
            actual: { minutes: 265 },
            proficiency: 115,
        },
        status: 'completed',
        workOrder: 'WO-001237',
        location: '321 Elm Blvd, Nowhere, ST 98765',
    },
    {
        id: 5,
        employeeName: 'David Kim',
        employeeAvatar: 'DK',
        date: '2024-03-13',
        travel: {
            marked: { start: '8:00 AM', end: '8:50 AM', minutes: 50 },
            actual: { start: '8:05 AM', end: '8:40 AM', minutes: 35 },
            proficiency: 70,
        },
        workingTime: {
            marked: { start: '8:50 AM', end: '1:15 PM', minutes: 265 },
            actual: { start: '8:40 AM', end: '1:00 PM', minutes: 260 },
            proficiency: 98,
        },
        billing: {
            variant: { minutes: 315 },
            actual: { minutes: 260 },
            proficiency: 121,
        },
        status: 'completed',
        workOrder: 'WO-001238',
        location: '654 Spruce Ct, Someplace, ST 13579',
    },
];

// ─── Time Entry Row Component ─────────────────────────────────────────────
const TimeEntryRow = ({ entry, expanded, onToggle }) => {
    const totalMinutes = entry.travel.marked.minutes + entry.workingTime.marked.minutes;
    const totalHours = (totalMinutes / 60).toFixed(1);
    const travelProficiencyColor = entry.travel.proficiency >= 80 ? PALETTE.GREEN : entry.travel.proficiency >= 70 ? PALETTE.AMBER : PALETTE.RED;
    const workProficiencyColor = entry.workingTime.proficiency >= 90 ? PALETTE.GREEN : entry.workingTime.proficiency >= 80 ? PALETTE.AMBER : PALETTE.RED;

    return (
        <>
            <TableRow
                hover
                sx={{
                    cursor: 'pointer',
                    '&:hover': { bgcolor: alpha(PALETTE.BLUE, 0.04) },
                    '&:last-child td': { borderBottom: 'none' }
                }}
                onClick={onToggle}
            >
                <TableCell>
                    <Stack direction="row" alignItems="center" spacing={1.5}>
                        <Avatar sx={{
                            width: 32, height: 32, bgcolor: alpha(PALETTE.BLUE, 0.12),
                            color: PALETTE.BLUE, fontSize: '0.8rem', fontWeight: 600
                        }}>
                            {entry.employeeAvatar}
                        </Avatar>
                        <Box>
                            <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.85rem', color: PALETTE.TEXT }}>
                                {entry.employeeName}
                            </Typography>
                            <Typography variant="caption" sx={{ fontSize: '0.7rem', color: PALETTE.GRAY }}>
                                {entry.workOrder}
                            </Typography>
                        </Box>
                    </Stack>
                </TableCell>
                <TableCell>
                    <Typography variant="body2" sx={{ fontSize: '0.8rem', color: PALETTE.TEXT }}>
                        {new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </Typography>
                </TableCell>
                <TableCell>
                    <Stack direction="row" alignItems="center" spacing={1}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Clock size={12} color={PALETTE.GRAY} />
                            <Typography variant="body2" sx={{ fontSize: '0.8rem', fontWeight: 500, color: PALETTE.TEXT }}>
                                {totalHours}h
                            </Typography>
                        </Box>
                        <StatusChip
                            label={entry.status === 'completed' ? 'Completed' : 'In Progress'}
                            status={entry.status}
                            size="small"
                        />
                    </Stack>
                </TableCell>
                <TableCell>
                    <Stack direction="row" alignItems="center" spacing={1}>
                        <Typography variant="caption" sx={{ fontSize: '0.75rem', color: travelProficiencyColor, fontWeight: 600 }}>
                            {entry.travel.proficiency}%
                        </Typography>
                        <LinearProgress
                            variant="determinate"
                            value={entry.travel.proficiency}
                            sx={{
                                width: 60,
                                height: 3,
                                borderRadius: 2,
                                bgcolor: alpha(travelProficiencyColor, 0.2),
                                '& .MuiLinearProgress-bar': { bgcolor: travelProficiencyColor, borderRadius: 2 }
                            }}
                        />
                    </Stack>
                </TableCell>
                <TableCell>
                    <Stack direction="row" alignItems="center" spacing={1}>
                        <Typography variant="caption" sx={{ fontSize: '0.75rem', color: workProficiencyColor, fontWeight: 600 }}>
                            {entry.workingTime.proficiency}%
                        </Typography>
                        <LinearProgress
                            variant="determinate"
                            value={entry.workingTime.proficiency}
                            sx={{
                                width: 60,
                                height: 3,
                                borderRadius: 2,
                                bgcolor: alpha(workProficiencyColor, 0.2),
                                '& .MuiLinearProgress-bar': { bgcolor: workProficiencyColor, borderRadius: 2 }
                            }}
                        />
                    </Stack>
                </TableCell>
                <TableCell>
                    <Typography variant="body2" sx={{ fontSize: '0.8rem', fontWeight: 600, color: entry.billing.proficiency >= 120 ? PALETTE.GREEN : PALETTE.AMBER }}>
                        {entry.billing.proficiency}%
                    </Typography>
                </TableCell>
                <TableCell sx={{ pr: 2.5 }}>
                    <IconButton size="small" sx={{ color: PALETTE.GRAY }}>
                        <ChevronRight size={16} style={{ transform: expanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
                    </IconButton>
                </TableCell>
            </TableRow>

            {/* Expanded Details Row */}
            {expanded && (
                <TableRow>
                    <TableCell colSpan={7} sx={{ p: 0, bgcolor: alpha(PALETTE.BLUE, 0.02), borderBottom: 'none' }}>
                        <Box sx={{ p: 2.5 }}>
                            <Grid container spacing={2}>
                                {/* Travel Section */}
                                <Grid item xs={12} md={4}>
                                    <Paper variant="outlined" sx={{ p: 1.5, borderRadius: '6px', borderColor: alpha(PALETTE.GRAY, 0.15), bgcolor: 'white' }}>
                                        <Typography variant="caption" sx={{ fontSize: '0.7rem', fontWeight: 600, color: PALETTE.GRAY, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: 0.5, mb: 1.5 }}>
                                            <MapPin size={12} /> Travel Time
                                        </Typography>
                                        <Stack spacing={1.5}>
                                            <Box>
                                                <Typography variant="caption" sx={{ fontSize: '0.7rem', color: PALETTE.GRAY }}>Marked Travel</Typography>
                                                <Typography variant="body2" sx={{ fontSize: '0.85rem', fontWeight: 500, color: PALETTE.TEXT }}>
                                                    {entry.travel.marked.start} — {entry.travel.marked.end}
                                                </Typography>
                                                <Typography variant="caption" sx={{ fontSize: '0.75rem', color: PALETTE.ORANGE, fontWeight: 500 }}>
                                                    {entry.travel.marked.minutes} MIN
                                                </Typography>
                                            </Box>
                                            <Box>
                                                <Typography variant="caption" sx={{ fontSize: '0.7rem', color: PALETTE.GRAY }}>Actual Travel</Typography>
                                                <Typography variant="body2" sx={{ fontSize: '0.85rem', fontWeight: 500, color: PALETTE.TEXT }}>
                                                    {entry.travel.actual.start} — {entry.travel.actual.end}
                                                </Typography>
                                                <Typography variant="caption" sx={{ fontSize: '0.75rem', color: PALETTE.GREEN, fontWeight: 500 }}>
                                                    {entry.travel.actual.minutes} MIN
                                                </Typography>
                                            </Box>
                                            <Box sx={{ pt: 0.5 }}>
                                                <Stack direction="row" justifyContent="space-between" alignItems="center">
                                                    <Typography variant="caption" sx={{ fontSize: '0.7rem', color: PALETTE.GRAY }}>Proficiency</Typography>
                                                    <Typography variant="caption" sx={{ fontSize: '0.85rem', fontWeight: 600, color: travelProficiencyColor }}>
                                                        {entry.travel.proficiency}%
                                                    </Typography>
                                                </Stack>
                                                <LinearProgress variant="determinate" value={entry.travel.proficiency} sx={{ height: 3, borderRadius: 2, mt: 0.5 }} />
                                            </Box>
                                        </Stack>
                                    </Paper>
                                </Grid>

                                {/* Working Time Section */}
                                <Grid item xs={12} md={4}>
                                    <Paper variant="outlined" sx={{ p: 1.5, borderRadius: '6px', borderColor: alpha(PALETTE.GRAY, 0.15), bgcolor: 'white' }}>
                                        <Typography variant="caption" sx={{ fontSize: '0.7rem', fontWeight: 600, color: PALETTE.GRAY, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: 0.5, mb: 1.5 }}>
                                            <Briefcase size={12} /> Working Time
                                        </Typography>
                                        <Stack spacing={1.5}>
                                            <Box>
                                                <Typography variant="caption" sx={{ fontSize: '0.7rem', color: PALETTE.GRAY }}>Marked Worked</Typography>
                                                <Typography variant="body2" sx={{ fontSize: '0.85rem', fontWeight: 500, color: PALETTE.TEXT }}>
                                                    {entry.workingTime.marked.start} — {entry.workingTime.marked.end}
                                                </Typography>
                                                <Typography variant="caption" sx={{ fontSize: '0.75rem', color: PALETTE.ORANGE, fontWeight: 500 }}>
                                                    {entry.workingTime.marked.minutes} MIN
                                                </Typography>
                                            </Box>
                                            <Box>
                                                <Typography variant="caption" sx={{ fontSize: '0.7rem', color: PALETTE.GRAY }}>Actual Worked</Typography>
                                                <Typography variant="body2" sx={{ fontSize: '0.85rem', fontWeight: 500, color: PALETTE.TEXT }}>
                                                    {entry.workingTime.actual.start} — {entry.workingTime.actual.end}
                                                </Typography>
                                                <Typography variant="caption" sx={{ fontSize: '0.75rem', color: PALETTE.GREEN, fontWeight: 500 }}>
                                                    {entry.workingTime.actual.minutes} MIN
                                                </Typography>
                                            </Box>
                                            <Box sx={{ pt: 0.5 }}>
                                                <Stack direction="row" justifyContent="space-between" alignItems="center">
                                                    <Typography variant="caption" sx={{ fontSize: '0.7rem', color: PALETTE.GRAY }}>Proficiency</Typography>
                                                    <Typography variant="caption" sx={{ fontSize: '0.85rem', fontWeight: 600, color: workProficiencyColor }}>
                                                        {entry.workingTime.proficiency}%
                                                    </Typography>
                                                </Stack>
                                                <LinearProgress variant="determinate" value={entry.workingTime.proficiency} sx={{ height: 3, borderRadius: 2, mt: 0.5 }} />
                                            </Box>
                                        </Stack>
                                    </Paper>
                                </Grid>

                                {/* Billing Section */}
                                <Grid item xs={12} md={4}>
                                    <Paper variant="outlined" sx={{ p: 1.5, borderRadius: '6px', borderColor: alpha(PALETTE.GRAY, 0.15), bgcolor: 'white' }}>
                                        <Typography variant="caption" sx={{ fontSize: '0.7rem', fontWeight: 600, color: PALETTE.GRAY, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: 0.5, mb: 1.5 }}>
                                            <DollarSign size={12} /> Billing
                                        </Typography>
                                        <Stack spacing={1.5}>
                                            <Box>
                                                <Typography variant="caption" sx={{ fontSize: '0.7rem', color: PALETTE.GRAY }}>Variant Time Billed</Typography>
                                                <Typography variant="body2" sx={{ fontSize: '0.85rem', fontWeight: 600, color: PALETTE.ORANGE }}>
                                                    {entry.billing.variant.minutes} MIN
                                                </Typography>
                                                <Typography variant="caption" sx={{ fontSize: '0.7rem', color: PALETTE.GRAY }}>
                                                    ({(entry.billing.variant.minutes / 60).toFixed(1)} hours)
                                                </Typography>
                                            </Box>
                                            <Box>
                                                <Typography variant="caption" sx={{ fontSize: '0.7rem', color: PALETTE.GRAY }}>Actual Worked</Typography>
                                                <Typography variant="body2" sx={{ fontSize: '0.85rem', fontWeight: 600, color: PALETTE.GREEN }}>
                                                    {entry.billing.actual.minutes} MIN
                                                </Typography>
                                                <Typography variant="caption" sx={{ fontSize: '0.7rem', color: PALETTE.GRAY }}>
                                                    ({(entry.billing.actual.minutes / 60).toFixed(1)} hours)
                                                </Typography>
                                            </Box>
                                            <Box sx={{ pt: 0.5 }}>
                                                <Stack direction="row" justifyContent="space-between" alignItems="center">
                                                    <Typography variant="caption" sx={{ fontSize: '0.7rem', color: PALETTE.GRAY }}>Billing Proficiency</Typography>
                                                    <Chip
                                                        label={`${entry.billing.proficiency}%`}
                                                        size="small"
                                                        sx={{
                                                            height: 20,
                                                            fontSize: '0.7rem',
                                                            fontWeight: 600,
                                                            bgcolor: alpha(entry.billing.proficiency >= 120 ? PALETTE.GREEN : PALETTE.AMBER, 0.12),
                                                            color: entry.billing.proficiency >= 120 ? PALETTE.GREEN : PALETTE.AMBER,
                                                        }}
                                                    />
                                                </Stack>
                                            </Box>
                                        </Stack>
                                    </Paper>
                                </Grid>
                            </Grid>
                        </Box>
                    </TableCell>
                </TableRow>
            )}
        </>
    );
};

// ─── Main Component ────────────────────────────────────────────────────────
const TimeTracking = () => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const [expandedRow, setExpandedRow] = useState(null);

    const { data: scraperStatus } = useQuery({
        queryKey: ['scraper-status'],
        queryFn: () => rmeApi.getScraperStatus(),
        refetchInterval: 5000,
    });
    const isRunning = scraperStatus?.data?.is_running;

    const handleRowToggle = (id) => {
        setExpandedRow(expandedRow === id ? null : id);
    };

    return (
        <Box>
            <Helmet>
                <title>Time Tracking | Sterling Septic & Plumbing LLC</title>
                <meta name="description" content="Monitor and manage employee time tracking data" />
            </Helmet>

            {/* Header */}
            <Box sx={{
                display: 'flex',
                flexDirection: isMobile ? 'column' : 'row',
                justifyContent: 'space-between',
                alignItems: isMobile ? 'flex-start' : 'center',
                mb: isMobile ? 2 : 3,
                gap: isMobile ? 2 : 0
            }}>
                <Box>
                    <Typography sx={{
                        fontWeight: 600,
                        mb: 0.5,
                        fontSize: isMobile ? '0.95rem' : '1rem',
                        color: PALETTE.TEXT,
                        letterSpacing: '-0.01em'
                    }}>
                        Time Tracking
                    </Typography>
                    <Typography variant="body2" sx={{
                        color: PALETTE.GRAY,
                        fontSize: isMobile ? '0.8rem' : '0.85rem',
                        fontWeight: 400
                    }}>
                        Monitor and manage employee time tracking data through each stage of the process
                    </Typography>
                </Box>
                <Stack direction="row" spacing={1.5} alignItems="center" sx={{ width: isMobile ? '100%' : 'auto', justifyContent: isMobile ? 'space-between' : 'flex-end' }}>
                    {isRunning && (
                        <Box sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                            px: 1.5,
                            py: 0.5,
                            bgcolor: alpha(PALETTE.BLUE, 0.08),
                            borderRadius: '20px',
                            border: `1px solid ${alpha(PALETTE.BLUE, 0.2)}`
                        }}>
                            <Box className="animate-pulse" sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: PALETTE.BLUE }} />
                            <Typography sx={{ fontSize: '0.72rem', fontWeight: 600, color: PALETTE.BLUE }}>
                                Scraper Running... ({Math.max(0.1, scraperStatus?.data?.elapsed_minutes || 0)}m)
                            </Typography>
                        </Box>
                    )}
                    <RefreshButton onRefresh={rmeApi.startTimeTrackingCombinedScraping} />
                </Stack>
            </Box>

            {/* Time Tracking Table */}
            <StyledPaper>
                <Box sx={{
                    p: 1.5,
                    bgcolor: 'white',
                    borderBottom: `1px solid ${alpha(PALETTE.BLUE, 0.1)}`,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: 1
                }}>
                    <Typography component="div" sx={{
                        fontSize: '0.9rem',
                        color: PALETTE.TEXT,
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.75
                    }}>
                        Time Entries
                        <Chip
                            size="small"
                            label={DUMMY_TIME_ENTRIES.length}
                            sx={{
                                bgcolor: alpha(PALETTE.BLUE, 0.08),
                                color: PALETTE.TEXT,
                                fontSize: '0.75rem',
                                fontWeight: 500,
                                height: '24px',
                                '& .MuiChip-label': { px: 1.2, py: 0 }
                            }}
                        />
                    </Typography>
                </Box>

                <TableContainer sx={{ overflowX: 'auto' }}>
                    <Table size="small">
                        <TableHead>
                            <TableRow sx={{
                                bgcolor: alpha(PALETTE.BLUE, 0.04),
                                '& th': { borderBottom: `2px solid ${alpha(PALETTE.BLUE, 0.1)}`, fontWeight: 600, fontSize: '0.75rem', color: PALETTE.TEXT, py: 1.5, px: 1.5, whiteSpace: 'nowrap' }
                            }}>
                                <TableCell sx={{ pl: 2.5 }}>Employee</TableCell>
                                <TableCell>Date</TableCell>
                                <TableCell>Total Time</TableCell>
                                <TableCell>Travel</TableCell>
                                <TableCell>Work</TableCell>
                                <TableCell>Billing</TableCell>
                                <TableCell sx={{ pr: 2.5, width: 50 }}></TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {DUMMY_TIME_ENTRIES.map((entry) => (
                                <TimeEntryRow
                                    key={entry.id}
                                    entry={entry}
                                    expanded={expandedRow === entry.id}
                                    onToggle={() => handleRowToggle(entry.id)}
                                />
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </StyledPaper>

            {/* Footer Note */}
            <Box sx={{ mt: 2, textAlign: 'center' }}>
                <Typography variant="caption" sx={{ color: PALETTE.GRAY, fontSize: '0.7rem' }}>
                    Last updated: {new Date().toLocaleString()}
                </Typography>
            </Box>
        </Box>
    );
};

export default TimeTracking;