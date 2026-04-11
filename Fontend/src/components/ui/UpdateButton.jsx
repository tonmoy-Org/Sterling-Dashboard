import { alpha, Button, styled } from '@mui/material';

const UpdateButton = styled(Button)(({ theme }) => ({
    color: '#fff',
    backgroundColor: '#ed6c02',
    '&:hover': {
        backgroundColor: alpha('#ed6c02', 0.9),
    },
    padding: '6px 16px',
    height: '34px',
    fontWeight: 500,
    fontSize: '0.85rem',
    textTransform: 'none',
    '&:disabled': {
        backgroundColor: theme.palette.grey[300],
        color: theme.palette.grey[500],
    },
}));

export default UpdateButton;
