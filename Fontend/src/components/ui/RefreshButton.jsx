import { alpha, Button, styled, Dialog, DialogTitle, DialogContent, DialogActions, Typography, Box, CircularProgress } from '@mui/material';
import { useState } from 'react';
import RefreshIcon from '@mui/icons-material/Refresh';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import axiosInstance from '../../api/axios';
import { useScraping } from '../../context/ScrapingContext'; // ← ADD THIS

const StyledRefreshButton = styled(Button)(({ theme }) => ({
    color: '#fff',
    background: 'linear-gradient(45deg, #ed6c02 30%, #ff9800 90%)',
    boxShadow: '0 3px 5px 2px rgba(237, 108, 2, .3)',
    '&:hover': {
        background: 'linear-gradient(45deg, #ed6c02 20%, #ff9800 100%)',
        boxShadow: '0 5px 8px 3px rgba(237, 108, 2, .4)',
    },
    padding: '6px 16px',
    height: '34px',
    fontWeight: 600,
    fontSize: '13px',
    textTransform: 'none',
    borderRadius: '5px',
    transition: 'all 0.3s ease',
    '&:disabled': {
        background: theme.palette.grey[400],
        boxShadow: 'none',
        color: theme.palette.grey[600],
    },
    '& .MuiButton-startIcon': {
        marginRight: '8px',
        '& svg': {
            fontSize: '1.2rem',
        },
    },
}));

const StyledDialog = styled(Dialog)(({ theme }) => ({
    '& .MuiDialog-paper': {
        borderRadius: '8px',
        padding: theme.spacing(2),
        background: theme.palette.background.paper,
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
    },
}));

const DialogTitleStyled = styled(DialogTitle)(({ theme }) => ({
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1.5),
    padding: theme.spacing(2, 3),
    '& .MuiSvgIcon-root': {
        fontSize: '2rem',
        color: '#ed6c02',
    },
}));

const RefreshButton = () => {
    const { loading, setLoading } = useScraping(); // ← REPLACE useState with context
    const [openModal, setOpenModal] = useState(false);

    const handleOpenModal = () => {
        setOpenModal(true);
    };

    const handleCloseModal = () => {
        setOpenModal(false);
    };

    const handleConfirmRefresh = async () => {
        setLoading(true);
        handleCloseModal();
        
        try {
            await axiosInstance.post('/work-orders-today/start-scraping/');
            console.log('Scraping started successfully');
        } catch (error) {
            console.error('Error starting scraping:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <StyledRefreshButton
                onClick={handleOpenModal}
                disabled={loading}
                startIcon={loading ? <AutorenewIcon className="spin" /> : <RefreshIcon />}
                variant="contained"
                size="medium"
            >
                {loading ? 'Refreshing...' : 'Refresh Data'}
            </StyledRefreshButton>

            <StyledDialog
                open={openModal}
                onClose={handleCloseModal}
                aria-labelledby="refresh-confirmation-dialog"
            >
                <DialogTitleStyled id="refresh-confirmation-dialog">
                    <WarningAmberIcon />
                    <Typography variant="h6" component="span" fontWeight={600}>
                        Confirm Refresh
                    </Typography>
                </DialogTitleStyled>

                <DialogContent dividers sx={{ borderColor: 'rgba(0, 0, 0, 0.12)', py: 3 }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <Typography variant="body1" color="text.primary">
                            Are you sure you want to refresh the work orders?
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            This action will:
                        </Typography>
                        <Box component="ul" sx={{ mt: 0, pl: 2, color: 'text.secondary', fontSize: '0.85rem' }}>
                            <li>Fetch the latest work orders from the source</li>
                            <li>Update the existing data in the system</li>
                            <li>Take a few moments to complete</li>
                        </Box>
                    </Box>
                </DialogContent>

                <DialogActions sx={{ p: 2, gap: 1 }}>
                    <Button
                        onClick={handleCloseModal}
                        variant="outlined"
                        color="inherit"
                        sx={{
                            borderRadius: '5px',
                            fontSize: '13px',
                            textTransform: 'none',
                            fontWeight: 500,
                        }}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleConfirmRefresh}
                        variant="contained"
                        disabled={loading}
                        startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <RefreshIcon />}
                        sx={{
                            background: 'linear-gradient(45deg, #ed6c02 30%, #ff9800 90%)',
                            borderRadius: '5px',
                            textTransform: 'none',
                            fontWeight: 500,
                            fontSize: '13px',
                            boxShadow: '0 3px 5px 2px rgba(237, 108, 2, .3)',
                            '&:hover': {
                                background: 'linear-gradient(45deg, #ed6c02 20%, #ff9800 100%)',
                            },
                        }}
                    >
                        {loading ? 'Refreshing...' : 'Confirm Refresh'}
                    </Button>
                </DialogActions>
            </StyledDialog>

            <style jsx>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                .spin {
                    animation: spin 1s linear infinite;
                }
            `}</style>
        </>
    );
};

export default RefreshButton;