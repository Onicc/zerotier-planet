import {
  BookOutlined, DashboardOutlined, DeploymentUnitOutlined, DownloadOutlined, GlobalOutlined,
  LogoutOutlined, MenuFoldOutlined, MenuUnfoldOutlined, MoonOutlined, SettingOutlined, SunOutlined,
  TranslationOutlined, UserOutlined,
} from '@ant-design/icons';
import { App, Button, Drawer, Dropdown, Grid, Layout, Menu, Space, Tooltip } from 'antd';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Outlet, useLocation, useNavigate } from 'react-router';
import { useAuth } from '@/auth/AuthProvider';
import { useThemeMode } from '@/theme/ThemeProvider';

const { Sider, Content } = Layout;

export function ConsoleLayout() {
  const { t, i18n } = useTranslation();
  const { message } = App.useApp();
  const location = useLocation();
  const navigate = useNavigate();
  const auth = useAuth();
  const theme = useThemeMode();
  const screens = Grid.useBreakpoint();
  const mobile = !screens.md;
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('ztp_sidebar_collapsed') === '1');
  const [drawerOpen, setDrawerOpen] = useState(false);

  const selected = location.pathname.startsWith('/networks') ? '/networks' : `/${location.pathname.split('/')[1] || 'overview'}`;
  const menuItems = useMemo(() => [
    { key: '/overview', icon: <DashboardOutlined />, label: t('common.overview') },
    { key: '/networks', icon: <GlobalOutlined />, label: t('common.networks') },
    { key: '/delivery', icon: <DownloadOutlined />, label: t('common.delivery') },
    { key: '/guide', icon: <BookOutlined />, label: t('common.guide') },
    { key: '/settings', icon: <SettingOutlined />, label: t('common.settings') },
  ], [t]);

  const navigateTo = (key: string) => { navigate(key); setDrawerOpen(false); };
  const changeCollapsed = () => {
    const next = !collapsed; setCollapsed(next); localStorage.setItem('ztp_sidebar_collapsed', next ? '1' : '0');
  };

  const sidebar = (
    <div className="sidebar-inner">
      <button className="sidebar-brand" type="button" onClick={() => navigateTo('/overview')}>
        <img src="/assets/logo.svg" alt="" />
        {!collapsed && <span><strong>{t('common.appName')}</strong><small>{t('common.console')}</small></span>}
      </button>
      <div className="sidebar-section-label">{!collapsed && t('nav.operations')}</div>
      <Menu theme="dark" mode="inline" selectedKeys={[selected]} items={menuItems} inlineCollapsed={collapsed && !mobile} onClick={({ key }) => navigateTo(String(key))} />
      <div className="sidebar-account">
        <span className="sidebar-avatar"><UserOutlined /></span>
        {!collapsed && <span><small>{t('settings.sessionActive')}</small><strong>{auth.username}</strong></span>}
      </div>
    </div>
  );

  return (
    <Layout className="console-layout">
      {!mobile && <Sider width={252} collapsedWidth={76} collapsed={collapsed} className="console-sidebar" trigger={null}>{sidebar}</Sider>}
      {mobile && <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} placement="left" width={280} styles={{ body: { padding: 0, background: '#0b1424' } }}>{sidebar}</Drawer>}
      <Layout>
        <header className="console-topbar">
          <Space>
            <Button type="text" icon={mobile ? <MenuUnfoldOutlined /> : collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => mobile ? setDrawerOpen(true) : changeCollapsed()} aria-label="Menu" />
            <span className="topbar-context"><DeploymentUnitOutlined /> {t('common.console')}</span>
          </Space>
          <Space size={4}>
            <Tooltip title={theme.isDark ? t('settings.light') : t('settings.dark')}>
              <Button type="text" shape="circle" icon={theme.isDark ? <SunOutlined /> : <MoonOutlined />}
                onClick={() => theme.setMode(theme.isDark ? 'light' : 'dark')} />
            </Tooltip>
            <Dropdown menu={{ items: [
              { key: 'en', label: 'English' }, { key: 'zh-CN', label: '中文' },
            ], selectedKeys: [i18n.language], onClick: ({ key }) => void i18n.changeLanguage(key) }}>
              <Button type="text" shape="circle" icon={<TranslationOutlined />} aria-label={t('settings.language')} />
            </Dropdown>
            <Tooltip title={t('common.logout')}>
              <Button type="text" shape="circle" icon={<LogoutOutlined />} onClick={() => void auth.logout().catch((error) => void message.error(error.message))} />
            </Tooltip>
          </Space>
        </header>
        <Content className="console-content"><Outlet /></Content>
      </Layout>
    </Layout>
  );
}
