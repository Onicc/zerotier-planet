import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { App, ConfigProvider, theme as antdTheme, type ThemeConfig } from 'antd';
import type { ThemeMode } from '@/types/api';

interface ThemeContextValue {
  mode: ThemeMode;
  isDark: boolean;
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function systemDark() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('ztp_theme');
    return saved === 'light' || saved === 'dark' || saved === 'system' ? saved : 'system';
  });
  const [systemIsDark, setSystemIsDark] = useState(systemDark);
  const isDark = mode === 'dark' || (mode === 'system' && systemIsDark);

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const update = () => setSystemIsDark(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    localStorage.setItem('ztp_theme', mode);
    document.documentElement.dataset.theme = isDark ? 'dark' : 'light';
  }, [mode, isDark]);

  const themeConfig = useMemo<ThemeConfig>(() => ({
    algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
    token: {
      colorPrimary: '#2563eb',
      colorSuccess: '#0f9f6e',
      colorWarning: '#d97706',
      colorError: '#dc2626',
      colorInfo: '#2563eb',
      colorBgLayout: isDark ? '#0b1220' : '#f3f6fa',
      colorBgContainer: isDark ? '#111b2c' : '#ffffff',
      colorBgElevated: isDark ? '#172235' : '#ffffff',
      borderRadius: 10,
      borderRadiusLG: 14,
      fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    },
    components: {
      Layout: { headerBg: 'transparent', siderBg: isDark ? '#08111f' : '#0b1424', bodyBg: 'transparent' },
      Menu: { darkItemBg: '#0b1424', darkSubMenuItemBg: '#07101d', darkItemSelectedBg: '#1d4ed8' },
      Table: { headerBg: isDark ? '#152136' : '#f7f9fc' },
      Card: { headerBg: 'transparent' },
    },
  }), [isDark]);

  const value = useMemo(() => ({ mode, isDark, setMode }), [mode, isDark]);
  return (
    <ThemeContext.Provider value={value}>
      <ConfigProvider theme={themeConfig}>
        <App>{children}</App>
      </ConfigProvider>
    </ThemeContext.Provider>
  );
}

export function useThemeMode() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useThemeMode must be used inside ThemeProvider');
  return context;
}
