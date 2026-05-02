import React from 'react';
import { Box, Typography, Paper, Stack, useTheme, useMediaQuery } from '@mui/material';
import { Helmet } from 'react-helmet-async';
import { useQuery } from '@tanstack/react-query';
import { alpha } from '@mui/material/styles';
import RefreshButton from '../../../../components/ui/RefreshButton';
import { rmeApi } from '../../../../api/services/rmeApi';
const TimeTracking = () => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    const { data: scraperStatus } = useQuery({
        queryKey: ['scraper-status'],
        queryFn: () => rmeApi.getScraperStatus(),
        refetchInterval: 5000,
    });
    const isRunning = scraperStatus?.data?.is_running;
    const BLUE_COLOR = '#1976d2';

    const TEXT_COLOR = '#0F1115';
    const GRAY_COLOR = '#6b7280';

    return (
        <Box>
            <Helmet>
                <title>Time Tracking | Sterling Septic & Plumbing LLC</title>
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
                        color: TEXT_COLOR, 
                        letterSpacing: '-0.01em' 
                    }}>
                        Time Tracking
                    </Typography>
                    <Typography variant="body2" sx={{ 
                        color: GRAY_COLOR, 
                        fontSize: isMobile ? '0.8rem' : '0.85rem', 
                        fontWeight: 400 
                    }}>
                        Monitor and manage employee time tracking data through each stage of the process
                    </Typography>
                </Box>
                <Stack direction="row" spacing={1.5} alignItems="center" sx={{ width: isMobile ? '100%' : 'auto', flexWrap: isMobile ? 'wrap' : 'nowrap', justifyContent: isMobile ? 'space-between' : 'flex-end' }}>
                    {isRunning && (
                        <Box sx={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: 1, 
                            px: 1.5, 
                            py: 0.5, 
                            bgcolor: alpha(BLUE_COLOR, 0.08), 
                            borderRadius: '20px', 
                            border: `1px solid ${alpha(BLUE_COLOR, 0.2)}` 
                        }}>
                            <Box className="animate-pulse" sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: BLUE_COLOR }} />
                            <Typography sx={{ fontSize: '0.72rem', fontWeight: 600, color: BLUE_COLOR }}>
                                Scraper Running... ({Math.max(0.1, scraperStatus?.data?.elapsed_minutes || 0)}m)
                            </Typography>
                        </Box>
                    )}
                    <RefreshButton onRefresh={rmeApi.startTimeTrackingCombinedScraping} />
                </Stack>
            </Box>
        </Box>
    );
};

export default TimeTracking;
