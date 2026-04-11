import React from 'react';
import { Box, IconButton, InputAdornment } from '@mui/material';
import { Search, X } from 'lucide-react';
import StyledTextField from '../../../../../../components/ui/StyledTextField';

const SearchInput = ({ value, onChange, placeholder, fullWidth = false, sx = {}, isMobile }) => {
    return (
        <Box sx={{ position: 'relative', width: fullWidth || isMobile ? '100%' : 300, ...sx }}>
            <StyledTextField
                size="small"
                placeholder={placeholder}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                sx={{
                    width: '100%',
                    '& .MuiInputBase-root': {
                        fontSize: '0.85rem',
                        height: '34px',
                    },
                }}
                InputProps={{
                    startAdornment: (
                        <InputAdornment position="start">
                            <Search size={16} color="#6b7280" />
                        </InputAdornment>
                    ),
                    endAdornment: value && (
                        <InputAdornment position="end">
                            <IconButton
                                size="small"
                                onClick={() => onChange('')}
                                edge="end"
                                sx={{ p: 0.5 }}
                            >
                                <X size={16} />
                            </IconButton>
                        </InputAdornment>
                    ),
                }}
            />
        </Box>
    );
};

export default SearchInput;