import { Button, styled, alpha } from '@mui/material';

const OutlineButton = styled(Button)(({ theme, color: customColor }) => {
    // Determine the base color. Default to red if not specified.
    // MUI Button 'color' prop can be 'primary', 'secondary', 'error', 'info', 'success', 'warning'
    // or we can allow custom colors via sx.
    // However, styled components can use props. 
    // We'll use the 'color' prop if it's a hex/string, otherwise default logic.
    
    const baseColor = customColor === 'error' ? '#dc2626' : 
                      customColor === 'primary' ? theme.palette.primary.main :
                      customColor === 'secondary' ? theme.palette.secondary.main :
                      customColor === 'success' ? '#10b981' :
                      customColor === 'warning' ? '#f59e0b' :
                      customColor || '#dc2626';

    return {
        border: `1px solid ${alpha(baseColor, 0.4)}`,
        color: baseColor,
        borderRadius: '3px',
        padding: '3px 16px',
        height: '34px',
        fontWeight: 500,
        textTransform: 'none',
        fontSize: '13px',
        transition: 'all 0.3s ease',
        '&:hover': {
            backgroundColor: alpha(baseColor, 0.05),
            borderColor: baseColor,
            color: baseColor,
        },
    };
});

export default OutlineButton;