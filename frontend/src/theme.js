// src/theme.js
import { createTheme } from '@mui/material/styles';

export function getTheme(mode = 'light') {
  return createTheme({
    palette: {
      mode,
      ...(mode === 'light'
        ? {
            primary: { main: '#1c92d2' },
            background: { default: '#f7f7fa', paper: '#fff' },
          }
        : {
            primary: { main: '#38ef7d' },
            background: { default: '#161b22', paper: '#222b34' },
          }),
    },
    shape: { borderRadius: 16 },
    typography: {
      fontFamily: 'Inter, Roboto, Arial, sans-serif',
      h3: { fontWeight: 700 },
      h6: { fontWeight: 600 },
    },
    components: {
      MuiPaper: { styleOverrides: { root: { backgroundImage: 'none' } } },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 18,
            fontWeight: 600,
          },
        },
      },
    },
  });
}
