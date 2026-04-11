import React from 'react';
import { Box, Typography, Paper, Chip } from '@mui/material';
import { alpha } from '@mui/material/styles';

const Section = ({
    title,
    color,
    count,
    selectedCount,
    children,
    additionalActions = null,
    showDeleteButton = false,
    onDeleteAction = null,
    isMobile,
}) => {
    return (
        <Paper
            elevation={0}
            sx={{
                mb: 4,
                borderRadius: '6px',
                overflow: 'hidden',
                border: `1px solid ${alpha(color, 0.15)}`,
                bgcolor: 'white'
            }}
        >
            <Box
                sx={{
                    p: isMobile ? 1.5 : 2,
                    bgcolor: 'white',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexDirection: isMobile ? 'column' : 'row',
                    borderBottom: `1px solid ${alpha(color, 0.1)}`,
                }}
            >
                <Box sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    width: isMobile ? '100%' : 'auto',
                    flexDirection: isMobile ? 'column' : 'row',
                }}>
                    <Box sx={{
                        flex: 1,
                        width: isMobile ? '100%' : 'auto',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        mb: isMobile ? 0 : 0,
                    }}>
                        <Typography
                            sx={{
                                fontSize: isMobile ? '0.85rem' : '1rem',
                                color: '#0F1115',
                                fontWeight: 600,
                            }}
                        >
                            {title}
                            <Chip
                                size="small"
                                label={count}
                                sx={{
                                    ml: 1,
                                    bgcolor: alpha(color, 0.08),
                                    color: '#0F1115',
                                    fontSize: '0.75rem',
                                    fontWeight: 500,
                                    height: '22px',
                                    '& .MuiChip-label': {
                                        px: 1,
                                    },
                                }}
                            />
                        </Typography>
                        {showDeleteButton && onDeleteAction && !isMobile && (
                            <button
                                className="outline-button"
                                onClick={onDeleteAction}
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    fontSize: '0.85rem',
                                    padding: '6px 12px',
                                    border: `1px solid ${alpha('#ef4444', 0.3)}`,
                                    borderRadius: '4px',
                                    backgroundColor: 'transparent',
                                    color: '#ef4444',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                }}
                                onMouseEnter={(e) => {
                                    e.target.style.backgroundColor = alpha('#ef4444', 0.05);
                                    e.target.style.borderColor = '#ef4444';
                                }}
                                onMouseLeave={(e) => {
                                    e.target.style.backgroundColor = 'transparent';
                                    e.target.style.borderColor = alpha('#ef4444', 0.3);
                                }}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M3 6h18"></path>
                                    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                                    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                                </svg>
                                Move to Bin ({selectedCount})
                            </button>
                        )}
                    </Box>

                    {/* Mobile delete button - shown below the title on mobile */}
                    {showDeleteButton && onDeleteAction && isMobile && (
                        <Box sx={{ width: '100%' }}>
                            <button
                                className="outline-button"
                                onClick={onDeleteAction}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '4px',
                                    fontSize: '0.85rem',
                                    padding: '8px 16px',
                                    border: `1px solid ${alpha('#ef4444', 0.3)}`,
                                    borderRadius: '4px',
                                    backgroundColor: 'transparent',
                                    color: '#ef4444',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                    width: '100%',
                                }}
                                onMouseEnter={(e) => {
                                    e.target.style.backgroundColor = alpha('#ef4444', 0.05);
                                    e.target.style.borderColor = '#ef4444';
                                }}
                                onMouseLeave={(e) => {
                                    e.target.style.backgroundColor = 'transparent';
                                    e.target.style.borderColor = alpha('#ef4444', 0.3);
                                }}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M3 6h18"></path>
                                    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                                    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                                </svg>
                                Move to Bin ({selectedCount})
                            </button>
                        </Box>
                    )}
                </Box>
                {additionalActions && (
                    <Box sx={{
                        width: isMobile ? '100%' : 'auto',
                        mt: isMobile ? 0 : 0,
                    }}>
                        {additionalActions}
                    </Box>
                )}
            </Box>
            {children}
        </Paper>
    );
};

export default Section;