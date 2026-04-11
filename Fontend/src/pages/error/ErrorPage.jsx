import React, { useState } from 'react';
import {
    Box,
    Typography,
    Button,
    Container,
    TextField,
    InputAdornment,
    alpha,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import {
    Search as SearchIcon,
    ArrowBack as ArrowBackIcon,
    Home as HomeIcon,
} from '@mui/icons-material';
import StyledTextField from '../../components/ui/StyledTextField';
import GradientButton from '../../components/ui/GradientButton';

const BLUE_LIGHT = '#A8C9E9';
const BLUE_COLOR = '#1976d2';
const BLUE_DARK = '#1565c0';

export const ErrorPage = () => {
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');

    const handleGoHome = () => navigate('/dashboard');
    const handleGoBack = () => navigate(-1);

    const handleSearch = (e) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            console.log('Searching for:', searchQuery);
        }
    };

    return (
        <Box
            sx={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: 'background.default',
                py: 4,
            }}
        >
            <Container maxWidth="md">
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexDirection: { xs: 'column', md: 'row' },
                        textAlign: { xs: 'center', md: 'left' },
                        gap: 2,
                        mb: 2.5,
                    }}
                >
                    <Box>
                        {/* Error Code */}
                        <Typography
                            sx={{
                                fontSize: '5.5rem',
                                fontWeight: 400,
                                background: `linear-gradient(135deg, ${BLUE_DARK} 0%, ${BLUE_COLOR} 100%)`,
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                lineHeight: 1,
                            }}
                        >
                            404
                        </Typography>
                    </Box>

                    {/* Title and Message */}
                    <Box>
                        <Typography
                            sx={{
                                fontWeight: 600,
                                mb: 1,
                                color: 'text.primary',
                                fontSize: '1.5rem',
                            }}
                        >
                            Oops! You're Lost.
                        </Typography>

                        <Typography
                            sx={{
                                mb: 0,
                                color: 'text.secondary',
                                fontSize: '0.9rem',
                                maxWidth: '400px',
                            }}
                        >
                            The page you are looking for was not found.
                        </Typography>
                    </Box>
                </Box>

                {/* Search Section */}
                <Box sx={{ mb: 4, display: 'flex', justifyContent: 'center' }}>
                    <Box sx={{ width: '100%', maxWidth: '600px' }}>
                        <form onSubmit={handleSearch}>
                            <StyledTextField
                                fullWidth
                                placeholder="Search"
                                size='small'
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                sx={{
                                    '& .MuiOutlinedInput-root': {
                                        borderRadius: '30px',
                                        backgroundColor: alpha('#000', 0.02),
                                        py: 0.3,
                                    },
                                }}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <SearchIcon sx={{ color: BLUE_COLOR }} />
                                        </InputAdornment>
                                    ),
                                    endAdornment: (
                                        <InputAdornment position="end">
                                            <GradientButton
                                                type="submit"
                                                variant="contained"
                                                sx={{
                                                    borderRadius: '30px',
                                                    px: 2,
                                                    background: `linear-gradient(135deg, ${BLUE_COLOR} 0%, ${BLUE_DARK} 100%)`,
                                                    color: 'white',
                                                    fontWeight: 600,
                                                    textTransform: 'none',
                                                }}
                                            >
                                                Search
                                            </GradientButton>
                                        </InputAdornment>
                                    ),
                                }}
                            />
                        </form>
                    </Box>
                </Box>

                {/* Action Buttons */}
                <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
                    <Button
                        variant="outlined"
                        startIcon={<ArrowBackIcon />}
                        onClick={handleGoBack}
                        sx={{
                            borderRadius: '30px',
                            textTransform: 'none',
                            borderColor: BLUE_COLOR,
                            color: BLUE_COLOR,
                            px: 2.5,
                        }}
                    >
                        Go Back
                    </Button>
                    <GradientButton
                        variant="contained"
                        startIcon={<HomeIcon />}
                        onClick={handleGoHome}
                        sx={{
                            borderRadius: '30px',
                            textTransform: 'none',
                            background: `linear-gradient(135deg, ${BLUE_COLOR} 0%, ${BLUE_DARK} 100%)`,
                            px: 2.5,
                        }}
                    >
                        Go to Dashboard
                    </GradientButton>
                </Box>
            </Container>
        </Box>
    );
};