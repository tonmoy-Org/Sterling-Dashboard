import { styled } from '@mui/material/styles';
import TextareaAutosize from '@mui/material/TextareaAutosize';

const StyledTextarea = styled((props) => (
    <TextareaAutosize {...props}  maxRows={4} minRows={4} />
))(({ theme }) => ({
    width: '100%',
    padding: '6px 10px',
    fontSize: '0.875rem',
    fontFamily: theme.typography.fontFamily,
    borderRadius: '3px',
    border: '1px solid rgba(0, 0, 0, 0.23)',
    resize: 'vertical',
    boxSizing: 'border-box',

    '&:hover': {
        borderColor: '#1976d2',
    },

    '&:focus': {
        outline: 'none',
        borderColor: '#1976d2',
        borderWidth: '1px',
    },

    '&::placeholder': {
        color: theme.palette.text.secondary,
    },
}));

export default StyledTextarea;
