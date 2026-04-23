import React from 'react';
import { Box, Typography, Paper, Grid } from '@mui/material';
import { Helmet } from 'react-helmet-async';
import { FileText } from 'lucide-react';
import { rmeApi } from '../../../../api/services/rmeApi';
import RefreshButton from '../../../../components/ui/RefreshButton';
import { useQuery } from '@tanstack/react-query';
import DashboardLoader from '../../../../components/Loader/DashboardLoader';

const PALETTE = {
    TEXT: '#0F1115',
    GRAY: '#6b7280',
    BLUE: '#1976d2',
};

export const InvoiceProficiency = () => {
    // Check if scraper is running
    const { data: scraperStatus } = useQuery({
        queryKey: ['scraper-status'],
        queryFn: () => rmeApi.getScraperStatus(),
        refetchInterval: 5000, // Poll every 5 seconds
    });

    const isRunning = scraperStatus?.data?.is_running;

    return (
        <Box>
            <Helmet>
                <title>Invoice Proficiency | Sterling Septic & Plumbing LLC</title>
                <meta name="description" content="Super Admin Invoice Proficiency page" />
            </Helmet>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4, flexWrap: 'wrap', gap: 2 }}>
                <Box>
                    <Typography sx={{ fontWeight: 600, mb: 0.5, fontSize: '1.1rem', color: PALETTE.TEXT, letterSpacing: '-0.01em' }}>
                        Invoice Proficiency Report
                    </Typography>
                    <Typography variant="body2" sx={{ color: PALETTE.GRAY, fontSize: '0.8rem' }}>
                        Track technician invoice proficiency and performance metrics
                    </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    {isRunning && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1.5, py: 0.5, bgcolor: 'rgba(25, 118, 210, 0.08)', borderRadius: '20px', border: '1px solid rgba(25, 118, 210, 0.2)' }}>
                            <Box className="animate-pulse" sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: PALETTE.BLUE }} />
                            <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: PALETTE.BLUE }}>
                                Scraper Running... ({scraperStatus?.data?.elapsed_minutes}m)
                            </Typography>
                        </Box>
                    )}
                    <RefreshButton onRefresh={rmeApi.startInvoiceProficiencyScraping} />
                </Box>
            </Box>

            <Paper elevation={0} sx={{ p: 4, borderRadius: '8px', border: '1px solid #e5e7eb', textAlign: 'center', bgcolor: 'white' }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', maxWidth: 400, mx: 'auto', py: 4 }}>
                    <Box sx={{ p: 2, borderRadius: '50%', bgcolor: 'rgba(25, 118, 210, 0.05)', mb: 3 }}>
                        <FileText size={48} color={PALETTE.BLUE} />
                    </Box>
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 1, color: PALETTE.TEXT }}>
                        Report Coming Soon
                    </Typography>
                    <Typography variant="body2" sx={{ color: PALETTE.GRAY, mb: 3 }}>
                        We are currently finalizing the data visualization for the Invoice Proficiency metrics. You can trigger a new scan using the refresh button to ensure latest data is being processed in the background.
                    </Typography>
                </Box>
            </Paper>
        </Box>
    );
};
