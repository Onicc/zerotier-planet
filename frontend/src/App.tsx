import { Navigate, Route, Routes } from 'react-router';
import { Spin } from 'antd';
import { useAuth } from '@/auth/AuthProvider';
import { AuthPage } from '@/auth/AuthPage';
import { ConsoleLayout } from '@/layout/ConsoleLayout';
import { OverviewPage } from '@/pages/overview/OverviewPage';
import { NetworksPage } from '@/pages/networks/NetworksPage';
import { NetworkDetailPage } from '@/pages/networks/NetworkDetailPage';
import { DeliveryPage } from '@/pages/delivery/DeliveryPage';
import { GuidePage } from '@/pages/guide/GuidePage';
import { SettingsPage } from '@/pages/settings/SettingsPage';

export default function AppRoot() {
  const auth = useAuth();
  if (auth.checking) return <div className="app-loading"><Spin size="large" /></div>;
  if (!auth.authenticated || auth.mustChangePassword) return <AuthPage />;
  return (
    <Routes>
      <Route element={<ConsoleLayout />}>
        <Route index element={<Navigate to="/overview" replace />} />
        <Route path="overview" element={<OverviewPage />} />
        <Route path="networks" element={<NetworksPage />} />
        <Route path="networks/:nwid/*" element={<NetworkDetailPage />} />
        <Route path="delivery" element={<DeliveryPage />} />
        <Route path="guide" element={<GuidePage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/overview" replace />} />
    </Routes>
  );
}
