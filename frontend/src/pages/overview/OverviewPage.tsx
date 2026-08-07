import {
  ApiOutlined, CheckCircleOutlined, CloudServerOutlined, DeploymentUnitOutlined, DownloadOutlined,
  ExclamationCircleOutlined, GlobalOutlined, SafetyCertificateOutlined, TeamOutlined,
} from '@ant-design/icons';
import { Button, Card, Progress, Space, Table, Tooltip } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { CopyButton } from '@/components/common/CopyButton';
import { ErrorState, LoadingState } from '@/components/common/AsyncState';
import { PageHeader } from '@/components/common/PageHeader';
import { SectionCard } from '@/components/common/SectionCard';
import { Sparkline } from '@/components/common/Sparkline';
import { StatCard } from '@/components/common/StatCard';
import { StatusBadge } from '@/components/common/StatusBadge';
import { useControllerQuery, useOverviewQuery } from '@/hooks/useConsoleQueries';
import { formatBytes } from '@/utils/format';

interface HistoryPoint { networks: number; members: number; pending: number }

export function OverviewPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const overviewQuery = useOverviewQuery();
  const controllerQuery = useControllerQuery();
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const overview = overviewQuery.data;
  const controller = controllerQuery.data;

  const summary = useMemo(() => (controller?.networks || []).reduce((result, network) => {
    const members = Number(network.memberCount || 0);
    const authorized = Number(network.authorizedMemberCount ?? members);
    return {
      members: result.members + members,
      authorized: result.authorized + authorized,
      pending: result.pending + Math.max(0, members - authorized),
      routes: result.routes + (network.routes?.length || 0),
      pools: result.pools + (network.ipAssignmentPools?.length || 0),
    };
  }, { members: 0, authorized: 0, pending: 0, routes: 0, pools: 0 }), [controller]);

  useEffect(() => {
    if (!controller) return;
    const point = { networks: controller.networks.length, members: summary.members, pending: summary.pending };
    const timer = window.setTimeout(() => setHistory((current) => {
      const last = current.at(-1);
      if (last && last.networks === point.networks && last.members === point.members && last.pending === point.pending) return current;
      return [...current.slice(-19), point];
    }), 0);
    return () => window.clearTimeout(timer);
  }, [controller, summary.members, summary.pending]);

  if (overviewQuery.isLoading || controllerQuery.isLoading) return <LoadingState rows={12} />;
  if (overviewQuery.error || controllerQuery.error) return <ErrorState error={overviewQuery.error || controllerQuery.error}
    onRetry={() => void Promise.all([overviewQuery.refetch(), controllerQuery.refetch()])} />;

  const readiness = [Boolean(overview?.hasPlanet), Boolean(controller?.status), Boolean(controller?.networks.length)];
  const readinessPercent = Math.round((readiness.filter(Boolean).length / readiness.length) * 100);

  return (
    <div className="page-stack">
      <PageHeader title={t('page.overviewTitle')} subtitle={t('page.overviewSubtitle')} eyebrow={t('nav.operations')}
        actions={<Space wrap><Button icon={<DownloadOutlined />} onClick={() => navigate('/delivery')}>{t('common.delivery')}</Button><Button type="primary" icon={<GlobalOutlined />} onClick={() => navigate('/networks')}>{t('common.networks')}</Button></Space>} />

      <section className="command-banner">
        <div><span>{t('overview.command')}</span><strong>{t('overview.commandCopy')}</strong></div>
        <Space wrap><StatusBadge tone={summary.pending ? 'warning' : 'success'} label={`${summary.pending} ${t('overview.pending')}`} /><StatusBadge tone="processing" label={`${controller?.networks.length || 0} ${t('common.networks')}`} /></Space>
      </section>

      <section className="stats-grid">
        <StatCard label={t('overview.planet')} value={t(overview?.hasPlanet ? 'common.ready' : 'common.missing')} icon={<DeploymentUnitOutlined />} tone={overview?.hasPlanet ? 'success' : 'danger'} detail={overview?.hasPlanet ? t('overview.planetReady') : t('overview.planetMissing')} />
        <StatCard label={t('overview.api')} value={t(controller?.status.online ? 'common.online' : 'common.available')} icon={<ApiOutlined />} tone={controller?.status ? 'success' : 'danger'} detail={controller?.status.address || '—'} />
        <StatCard label={t('overview.networkCount')} value={controller?.networks.length || 0} icon={<GlobalOutlined />} detail={`${summary.routes} ${t('overview.routes')}`} />
        <StatCard label={t('overview.members')} value={summary.members} icon={<TeamOutlined />} tone={summary.pending ? 'warning' : 'default'} detail={`${summary.authorized} ${t('overview.authorized')}`} />
      </section>

      <section className="overview-primary-grid">
        <SectionCard fill title={<><SafetyCertificateOutlined /> {t('overview.readiness')}</>}>
            <div className="readiness-score"><Progress type="circle" percent={readinessPercent} size={118} /><div className="readiness-list">
              <div>{overview?.hasPlanet ? <CheckCircleOutlined /> : <ExclamationCircleOutlined />}<span><strong>{t('overview.planet')}</strong><small>{t(overview?.hasPlanet ? 'overview.planetReady' : 'overview.planetMissing')}</small></span></div>
              <div>{controller?.status ? <CheckCircleOutlined /> : <ExclamationCircleOutlined />}<span><strong>{t('overview.api')}</strong><small>{t(controller?.status ? 'overview.controllerReady' : 'overview.controllerMissing')}</small></span></div>
              <div>{controller?.networks.length ? <CheckCircleOutlined /> : <ExclamationCircleOutlined />}<span><strong>{t('overview.networkCount')}</strong><small>{controller?.networks.length ? t('overview.networkReady', { count: controller.networks.length }) : t('overview.networkMissing')}</small></span></div>
            </div></div>
        </SectionCard>
        <SectionCard fill title={t('overview.history')} extra={<span className="section-hint">{t('overview.historyHint')}</span>}>
            {history.length < 2 ? <div className="trend-empty compact-empty">{t('overview.noHistory')}</div> : <div className="trend-grid">
              <Sparkline values={history.map((item) => item.networks)} label={t('overview.networkCount')} color="#2563eb" />
              <Sparkline values={history.map((item) => item.members)} label={t('overview.members')} color="#7c3aed" />
              <Sparkline values={history.map((item) => item.pending)} label={t('overview.pending')} color="#d97706" />
            </div>}
            <div className="sr-only"><table><caption>{t('overview.history')}</caption><thead><tr><th>{t('overview.networkCount')}</th><th>{t('overview.members')}</th><th>{t('overview.pending')}</th></tr></thead><tbody>{history.map((point, index) => <tr key={index}><td>{point.networks}</td><td>{point.members}</td><td>{point.pending}</td></tr>)}</tbody></table></div>
        </SectionCard>
      </section>

      <section className="overview-secondary-grid">
        <SectionCard title={t('overview.recent')} extra={<Button type="link" onClick={() => navigate('/networks')}>{t('common.details')}</Button>}>
            <Table size="small" pagination={false} rowKey="nwid" dataSource={controller?.networks.slice(0, 6)} onRow={(network) => ({ onClick: () => navigate(`/networks/${network.nwid}/members`) })}
              columns={[
                { title: t('common.name'), dataIndex: 'name', render: (value: string, row) => <span className="network-cell"><strong>{value || row.nwid}</strong><small>{row.nwid}</small></span> },
                { title: t('overview.members'), dataIndex: 'memberCount', align: 'right' },
                { title: t('networks.privacy'), dataIndex: 'private', align: 'right', render: (value: boolean) => <StatusBadge tone={value ? 'success' : 'warning'} label={t(value ? 'common.private' : 'common.public')} /> },
              ]} />
        </SectionCard>
        <SectionCard title={<><CloudServerOutlined /> {t('overview.instance')}</>}>
          <dl className="instance-detail-list">
            <div><dt>{t('overview.publicUrl')}</dt><dd><Tooltip title={overview?.publicUrl}><span className="breakable-value">{overview?.publicUrl || '—'}</span></Tooltip>{overview?.publicUrl && <CopyButton text={overview.publicUrl} type="text" size="small" aria-label={t('common.copy')} />}</dd></div>
            <div><dt>{t('overview.ztPort')}</dt><dd className="numeric-value">{overview?.zeroTierPort || '—'}</dd></div>
            <div><dt>{t('overview.consolePort')}</dt><dd className="numeric-value">{overview?.fileServerPort || '—'}</dd></div>
            <div><dt>{t('overview.ttl')}</dt><dd className="numeric-value">{Math.round((overview?.linkTtlSeconds || 600) / 60)} min</dd></div>
          </dl>
          <div className="file-summary">{overview?.files.map((file) => <Card size="small" key={file.name}><Tooltip title={file.name}><strong>{file.name}</strong></Tooltip><span>{formatBytes(file.size)}</span></Card>)}</div>
        </SectionCard>
      </section>
    </div>
  );
}
