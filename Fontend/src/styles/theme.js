// theme.js or theme.ts
import { createTheme } from '@mui/material/styles';

const CustomTheme = createTheme({
  typography: {
    fontFamily: '"Public Sans", sans-serif',
    // You can also customize specific typography variants
    h1: {
      fontFamily: '"Public Sans", sans-serif',
    },
    h2: {
      fontFamily: '"Public Sans", sans-serif',
    },
    body1: {
      fontFamily: '"Public Sans", sans-serif',
    },
    // etc.
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        '@global': {
          '@font-face': {
            fontFamily: 'Public Sans',
            src: `url('https://fonts.googleapis.com/css2?family=Public+Sans:ital,wght@0,100..900;1,100..900&display=swap')`,
          },
        },
      },
    },
  },
});

export default CustomTheme;