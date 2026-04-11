// components/SearchInput.jsx
import React from 'react';
import { Box, IconButton } from '@mui/material';
import { Search, X } from 'lucide-react';

const GRAY_COLOR = '#6b7280';

export const SearchInput = ({ 
    value, 
    onChange, 
    placeholder, 
    color, 
    fullWidth = false,
    sx = {} 
}) => {
    const alpha = (color, opacity) => {
        return color + Math.round(opacity * 255).toString(16).padStart(2, '0');
    };

    return (
        <Box sx={{ position: 'relative', width: fullWidth ? '100%' : 250, ...sx }}>
            <Box
                component="input"
                placeholder={placeholder}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                sx={{
                    width: '100%',
                    fontSize: '0.8rem',
                    height: '36px',
                    paddingLeft: '36px',
                    paddingRight: value ? '36px' : '16px',
                    border: `1px solid ${alpha(color, 0.2)}`,
                    borderRadius: '4px',
                    outline: 'none',
                    backgroundColor: 'white',
                    '&:focus': {
                        borderColor: color,
                        boxShadow: `0 0 0 2px ${alpha(color, 0.1)}`,
                    },
                    '&::placeholder': {
                        color: alpha(GRAY_COLOR, 0.6),
                    },
                }}
            />
            <Search
                size={16}
                color={GRAY_COLOR}
                style={{
                    position: 'absolute',
                    left: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                }}
            />
            {value && (
                <IconButton
                    size="small"
                    onClick={() => onChange('')}
                    sx={{
                        position: 'absolute',
                        right: '4px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        padding: '4px',
                    }}
                >
                    <X size={16} />
                </IconButton>
            )}
        </Box>
    );
};