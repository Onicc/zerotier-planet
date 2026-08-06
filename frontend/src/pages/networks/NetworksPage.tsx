import { LockOutlined, PlusOutlined, SearchOutlined, TeamOutlined, UnlockOutlined } from '@ant-design/icons';
import { App, Button, Card, Col, Form, Input, Modal, Radio, Row, Segmented, Select, Space, Tag } from 'antd';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { useMutation } from '@tanstack/react-query';
import { consoleApi } from '@/api/console';
import { queryClient, queryKeys } from '@/api/query';
import { EmptyState, ErrorState, LoadingState } from '@/components/common/AsyncState';
import { PageHeader } from '@/components/common/PageHeader';
import { StatusBadge } from '@/components/common/StatusBadge';
import { useControllerQuery } from '@/hooks/useConsoleQueries';

export function NetworksPage() {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const navigate = useNavigate();
  const query = useControllerQuery();
  const [search, setSearch] = useState('');
  const [privacy, setPrivacy] = useState<'all' | 'private' | 'public'>('all');
  const [sort, setSort] = useState<'name' | 'members'>('name');
  const [createOpen, setCreateOpen] = useState(false);
  const [form] = Form.useForm();

  const createMutation = useMutation({
    mutationFn: (name: string) => consoleApi.createNetwork(name),
    onSuccess: async (payload) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.controller });
      setCreateOpen(false); form.resetFields(); void message.success(t('message.created'));
      navigate(`/networks/${payload.network.nwid}/configuration`);
    },
    onError: (error) => void message.error(error.message),
  });

  const networks = useMemo(() => [...(query.data?.networks || [])].filter((network) => {
    const text = search.trim().toLowerCase();
    const matchesSearch = !text || network.name?.toLowerCase().includes(text) || network.nwid.toLowerCase().includes(text);
    const matchesPrivacy = privacy === 'all' || (privacy === 'private' ? network.private : !network.private);
    return matchesSearch && matchesPrivacy;
  }).sort((a, b) => sort === 'members'
    ? Number(b.memberCount || 0) - Number(a.memberCount || 0)
    : String(a.name || a.nwid).localeCompare(String(b.name || b.nwid))), [query.data, search, privacy, sort]);

  if (query.isLoading) return <LoadingState rows={10} />;
  if (query.error) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;

  return (
    <div className="page-stack">
      <PageHeader title={t('page.networksTitle')} subtitle={t('page.networksSubtitle')} eyebrow={t('common.networks')}
        actions={<Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>{t('networks.createNetwork')}</Button>} />
      <Card className="filter-bar" bordered={false}>
        <Input allowClear prefix={<SearchOutlined />} value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t('networks.searchPlaceholder')} />
        <Segmented value={privacy} onChange={(value) => setPrivacy(value as typeof privacy)} options={[
          { label: t('common.all'), value: 'all' }, { label: t('common.private'), value: 'private' }, { label: t('common.public'), value: 'public' },
        ]} />
        <Select value={sort} onChange={setSort} options={[{ label: t('networks.sortName'), value: 'name' }, { label: t('networks.sortMembers'), value: 'members' }]} />
      </Card>
      {!networks.length ? <Card bordered={false}><EmptyState title={query.data?.networks.length ? t('common.none') : t('networks.empty')} description={t('networks.emptyCopy')}
        action={!query.data?.networks.length && <Button type="primary" onClick={() => setCreateOpen(true)}>{t('networks.createNetwork')}</Button>} /></Card> :
        <Row gutter={[16, 16]}>{networks.map((network) => <Col xs={24} md={12} xl={8} key={network.nwid}>
          <button className="network-card-button" type="button" onClick={() => navigate(`/networks/${network.nwid}/members`)}>
            <Card bordered={false} className="network-card">
              <div className="network-card-head"><span className={`network-lock ${network.private ? 'private' : 'public'}`}>{network.private ? <LockOutlined /> : <UnlockOutlined />}</span><StatusBadge tone={network.private ? 'success' : 'warning'} label={t(network.private ? 'common.private' : 'common.public')} /></div>
              <h3>{network.name || network.nwid}</h3><code>{network.nwid}</code>
              <div className="network-card-stats"><span><TeamOutlined /><strong>{network.memberCount || 0}</strong><small>{t('overview.members')}</small></span><span><strong>{network.routes?.length || 0}</strong><small>{t('overview.routes')}</small></span><span><strong>{network.ipAssignmentPools?.length || 0}</strong><small>{t('overview.pools')}</small></span></div>
              <Space wrap>{Number(network.memberCount || 0) > Number(network.authorizedMemberCount ?? network.memberCount ?? 0) && <Tag color="gold">{Number(network.memberCount || 0) - Number(network.authorizedMemberCount ?? network.memberCount ?? 0)} {t('networks.pending')}</Tag>}<Tag>{network.mtu || 2800} MTU</Tag></Space>
            </Card>
          </button>
        </Col>)}</Row>}
      <Modal title={t('networks.createNetwork')} open={createOpen} onCancel={() => setCreateOpen(false)} okText={t('common.create')} confirmLoading={createMutation.isPending}
        onOk={() => void form.validateFields().then(({ name }) => createMutation.mutate(name))}>
        <Form form={form} layout="vertical"><Form.Item name="name" label={t('networks.newName')} rules={[{ required: true, whitespace: true, message: t('validation.required') }]}><Input autoFocus maxLength={128} /></Form.Item>
          <Form.Item label={t('networks.privacy')}><Radio checked disabled>{t('common.private')}</Radio></Form.Item></Form>
      </Modal>
    </div>
  );
}
