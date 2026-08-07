import { ArrowLeftOutlined, CopyOutlined, ReloadOutlined } from '@ant-design/icons';
import { Button, Card, Space, Tabs } from 'antd';
import { useTranslation } from 'react-i18next';
import { Navigate, Route, Routes, useLocation, useNavigate, useParams } from 'react-router';
import { EmptyState, ErrorState, LoadingState } from '@/components/common/AsyncState';
import { StatusBadge } from '@/components/common/StatusBadge';
import { useNetworkQuery } from '@/hooks/useConsoleQueries';
import { MembersPanel } from './panels/MembersPanel';
import { ConfigurationPanel } from './panels/ConfigurationPanel';
import { RoutesPanel } from './panels/RoutesPanel';
import { DnsPanel } from './panels/DnsPanel';
import { RawPanel } from './panels/RawPanel';

export function NetworkDetailPage() {
  const { t } = useTranslation();
  const { nwid = '' } = useParams();
  const query = useNetworkQuery(nwid);
  const navigate = useNavigate();
  const location = useLocation();
  if (query.isLoading) return <LoadingState rows={12} />;
  if (query.error) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;
  if (!query.data?.network) return <EmptyState title={t('common.unavailable')} />;
  const network = query.data.network;
  const tab = location.pathname.split('/').at(-1) || 'members';
  const tabs = [
    { key: 'members', label: t('networks.memberTab') }, { key: 'configuration', label: t('networks.basicsTab') },
    { key: 'routes', label: t('networks.routesTab') }, { key: 'dns', label: t('networks.dnsTab') }, { key: 'raw', label: t('networks.rawTab') },
  ];
  return (
    <div className="page-stack network-detail-page">
      <div className="network-detail-header">
        <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate('/networks')}>{t('common.networks')}</Button>
        <div className="network-title-row"><div className="network-title-copy"><Space wrap><h1>{network.name || nwid}</h1><StatusBadge tone={network.private ? 'success' : 'warning'} label={t(network.private ? 'common.private' : 'common.public')} /></Space><button type="button" className="copy-id" aria-label={`${t('common.copy')} ${nwid}`} onClick={() => void navigator.clipboard.writeText(nwid)}><code>{nwid}</code><CopyOutlined /></button></div>
          <div className="network-detail-actions"><span className="network-summary-line">{t('networks.selectedSummary', { members: query.data.members.length, routes: network.routes?.length || 0, pools: network.ipAssignmentPools?.length || 0 })}</span><Button icon={<ReloadOutlined />} loading={query.isFetching} onClick={() => void query.refetch()}>{t('common.refresh')}</Button></div></div>
      </div>
      <Card bordered={false} className="network-tabs-card"><Tabs activeKey={tabs.some((item) => item.key === tab) ? tab : 'members'} items={tabs} onChange={(key) => navigate(`/networks/${nwid}/${key}`)} /></Card>
      <Routes>
        <Route index element={<Navigate to="members" replace />} />
        <Route path="members" element={<MembersPanel bundle={query.data} />} />
        <Route path="configuration" element={<ConfigurationPanel bundle={query.data} />} />
        <Route path="routes" element={<RoutesPanel bundle={query.data} />} />
        <Route path="dns" element={<DnsPanel bundle={query.data} />} />
        <Route path="raw" element={<RawPanel bundle={query.data} />} />
        <Route path="*" element={<Navigate to="members" replace />} />
      </Routes>
    </div>
  );
}
