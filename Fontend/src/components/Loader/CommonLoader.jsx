import { Box, CircularProgress } from '@mui/material'
import React from 'react'

export default function CommonLoader() {
    return (
        <Box
            sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                width: '100%',
                minHeight: '200px',
                py: 4,
            }}
        >
            <CircularProgress
                sx={{
                    color: '#3182CE',
                    width: '50px !important',
                    height: '50px !important',
                }}
            />
        </Box>
    )
}