import { TextField, styled } from '@mui/material';

const StyledTextField = styled(TextField)(({ theme }) => ({
    "& .MuiOutlinedInput-root": {
        height: "34px",
        borderRadius: "2px",
        display: "flex",
        alignItems: "center",

        "& input": {
            padding: "6px 10px",
            height: "100%",
            boxSizing: "border-box",
        },

        "&:hover fieldset": {
            borderColor: "#1976d2",
        },
        "&.Mui-focused fieldset": {
            borderColor: "#1976d2",
            borderWidth: "1px",
        },
    },
    backgroundColor: theme.palette.background.paper,
}));

export default StyledTextField;
