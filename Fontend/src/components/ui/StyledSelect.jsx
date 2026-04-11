import { Select, styled } from '@mui/material';

const StyledSelect = styled(Select)(({ theme }) => ({
    borderRadius: '2px',

    '& .MuiOutlinedInput-notchedOutline': {
        borderColor: theme.palette.grey[400],
    },

    '&:hover .MuiOutlinedInput-notchedOutline': {
        borderColor: '#1976d2',
    },

    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
        borderColor: '#1976d2',
        borderWidth: '1px',
    },

    '& .MuiSelect-select': {
        fontSize: '0.8rem',
        padding: '6px 12px',
        backgroundColor: theme.palette.background.paper,
    },
}));

export default StyledSelect;
