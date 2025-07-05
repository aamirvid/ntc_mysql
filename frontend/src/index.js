// src/index.js
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import './styles/main.css'; // Your custom global styles, optional
import App from './App';
import reportWebVitals from './reportWebVitals';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { ThemeModeProvider } from './ThemeModeContext';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <ThemeModeProvider>
      {(theme) => (
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <App />
        </ThemeProvider>
      )}
    </ThemeModeProvider>
  </React.StrictMode>
);

reportWebVitals();
