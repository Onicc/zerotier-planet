import { GlobalOutlined, MoonOutlined, SunOutlined } from '@ant-design/icons';
import { Segmented } from 'antd';
import { useTranslation } from 'react-i18next';
import { useThemeMode } from '@/theme/ThemeProvider';

interface AppearanceControlsProps {
  kind: 'theme' | 'language';
  compact?: boolean;
  block?: boolean;
}

export function AppearanceControls({ kind, compact = false, block = false }: AppearanceControlsProps) {
  const { t, i18n } = useTranslation();
  const theme = useThemeMode();

  if (kind === 'theme') {
    return (
      <Segmented
        block={block}
        className={`appearance-control${compact ? ' appearance-control-compact' : ''}`}
        value={theme.mode}
        onChange={(value) => theme.setMode(value as 'light' | 'dark' | 'system')}
        options={[
          { label: compact ? <SunOutlined /> : t('settings.light'), value: 'light', icon: compact ? undefined : <SunOutlined /> },
          { label: compact ? <MoonOutlined /> : t('settings.dark'), value: 'dark', icon: compact ? undefined : <MoonOutlined /> },
          { label: compact ? <GlobalOutlined /> : t('settings.system'), value: 'system', icon: compact ? undefined : <GlobalOutlined /> },
        ]}
        aria-label={t('settings.theme')}
      />
    );
  }

  return (
    <Segmented
      block={block}
      className={`appearance-control${compact ? ' appearance-control-compact' : ''}`}
      value={i18n.language}
      onChange={(value) => void i18n.changeLanguage(String(value))}
      options={[
        { label: compact ? 'EN' : 'English', value: 'en' },
        { label: '中文', value: 'zh-CN' },
      ]}
      aria-label={t('settings.language')}
    />
  );
}
