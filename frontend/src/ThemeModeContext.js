// src/ThemeModeContext.js
import React, { createContext, useContext, useMemo, useState, useEffect } from 'react';
import { getTheme } from './theme';

const ThemeModeContext = createContext();

export function ThemeModeProvider({ children }) {
  const [mode, setMode] = useState('light');
  const theme = useMemo(() => getTheme(mode), [mode]);
  const toggleMode = () => setMode((m) => (m === 'light' ? 'dark' : 'light'));

  // ---- CRITICAL: toggle class on body so .dark CSS works everywhere! ----
  useEffect(() => {
    document.body.classList.toggle('dark', mode === 'dark');
  }, [mode]);

  return (
    <ThemeModeContext.Provider value={{ mode, toggleMode }}>
      {children(theme)}
    </ThemeModeContext.Provider>
  );
}

export function useThemeMode() {
  return useContext(ThemeModeContext);
}
