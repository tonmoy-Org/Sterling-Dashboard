import React from 'react';
import { Box, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { getPriorityStyle, P } from '../../utils/priorityStyles';

const PriorityBadge = ({ priority }) => {
    const { color } = getPriorityStyle(priority);
    return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <Box sx={{
                width: 10,
                height: 10,
                borderRadius: '2px',
                bgcolor: color,
                flexShrink: 0,
                border: `1px solid ${alpha(color, 0.4)}`
            }} />
            <Typography sx={{ 
                fontSize: '0.72rem', 
                fontWeight: 600, 
                color: P.TEXT, 
                whiteSpace: 'nowrap' 
            }}>
                {priority}
            </Typography>
        </Box>
    );
};

export default PriorityBadge;
