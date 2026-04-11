import React from 'react';
import { Box, IconButton } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { Search, X } from 'lucide-react';

const SearchInput = ({ value, onChange, placeholder, color, fullWidth = false, sx = {} }) => {
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
                    height: '34px',
                    backgroundColor: 'white',
                    paddingLeft: '36px',
                    paddingRight: value ? '36px' : '16px',
                    border: `1px solid ${alpha(color, 0.2)}`,
                    borderRadius: '4px',
                    outline: 'none',
                    '&:focus': {
                        borderColor: color,
                        boxShadow: `0 0 0 2px ${alpha(color, 0.1)}`,
                    },
                    '&::placeholder': {
                        color: alpha('#6b7280', 0.6),
                    },
                }}
            />
            <Search
                size={16}
                color="#6b7280"
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

export default SearchInput;