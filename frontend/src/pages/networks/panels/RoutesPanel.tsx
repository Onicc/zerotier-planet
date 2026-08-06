import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { App, Button, Card, Col, Form, Input, List, Modal, Row, Space } from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation } from '@tanstack/react-query';
import { consoleApi } from '@/api/console';
import { queryClient, queryKeys } from '@/api/query';
import { StatusBadge } from '@/components/common/StatusBadge';
import type { IpPool, NetworkBundle, NetworkRoute } from '@/types/api';
import { parseIpv4, parseIpv4RouteCidr } from '@/utils/network';
import { managedPool, managedRoute } from './panelUtils';

export function RoutesPanel({ bundle }: { bundle: NetworkBundle }) {
  const { t } = useTranslation(); const { message, modal } = App.useApp();
  const nwid = bundle.network.nwid; const [routeOpen, setRouteOpen] = useState(false); const [poolOpen, setPoolOpen] = useState(false);
  const [routeForm] = Form.useForm(); const [poolForm] = Form.useForm(); const managedRouteItem = managedRoute(bundle); const managedPoolItem = managedPool(bundle);
  const refresh = () => queryClient.invalidateQueries({ queryKey: queryKeys.network(nwid) });
  const mutation = useMutation({ mutationFn: async ({ kind, value }: { kind: string; value: any }) => {
    if (kind === 'add-route') return consoleApi.addRoute(nwid, value); if (kind === 'remove-route') return consoleApi.removeRoute(nwid, value);
    if (kind === 'add-pool') return consoleApi.addPool(nwid, value); return consoleApi.removePool(nwid, value);
  }, onSuccess: async () => { await refresh(); setRouteOpen(false); setPoolOpen(false); routeForm.resetFields(); poolForm.resetFields(); void message.success(t('message.saved')); }, onError: (error) => void message.error(error.message) });
  const confirm = (kind: string, value: NetworkRoute | IpPool | string) => modal.confirm({ title: t('common.remove'), content: t(kind === 'remove-route' ? 'networks.routes' : 'networks.pools'), okButtonProps: { danger: true }, onOk: () => mutation.mutateAsync({ kind, value }) });
  return <Row gutter={[16, 16]}><Col xs={24} xl={12}><Card bordered={false} className="section-card" title={t('networks.routes')} extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => setRouteOpen(true)}>{t('networks.addRoute')}</Button>}>
    <List dataSource={bundle.network.routes || []} locale={{ emptyText: t('networks.noRoutes') }} renderItem={(route) => <List.Item actions={[<Button key="remove" type="text" danger icon={<DeleteOutlined />} onClick={() => confirm('remove-route', route.target)} />]}><List.Item.Meta title={<Space>{route.target}{managedRouteItem?.target === route.target && !route.via && <StatusBadge tone="success" label={t('networks.managed')} />}</Space>} description={route.via ? t('networks.via', { gateway: route.via }) : t('networks.localRoute')} /></List.Item>} />
  </Card></Col><Col xs={24} xl={12}><Card bordered={false} className="section-card" title={t('networks.pools')} extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => setPoolOpen(true)}>{t('networks.addPool')}</Button>}>
    <List dataSource={bundle.network.ipAssignmentPools || []} locale={{ emptyText: t('networks.noPools') }} renderItem={(pool) => <List.Item actions={[<Button key="remove" type="text" danger icon={<DeleteOutlined />} onClick={() => confirm('remove-pool', pool)} />]}><List.Item.Meta title={<Space><code>{pool.ipRangeStart} — {pool.ipRangeEnd}</code>{managedPoolItem?.ipRangeStart === pool.ipRangeStart && managedPoolItem.ipRangeEnd === pool.ipRangeEnd && <StatusBadge tone="success" label={t('networks.managed')} />}</Space>} /></List.Item>} />
  </Card></Col>
    <Modal title={t('networks.addRoute')} open={routeOpen} onCancel={() => setRouteOpen(false)} okText={t('common.add')} confirmLoading={mutation.isPending} onOk={() => void routeForm.validateFields().then((values) => mutation.mutate({ kind: 'add-route', value: { target: parseIpv4RouteCidr(values.target), via: values.via?.trim() || null } }))}>
      <Form form={routeForm} layout="vertical"><Form.Item name="target" label={t('networks.routeTarget')} rules={[{ validator: (_, value) => parseIpv4RouteCidr(value) ? Promise.resolve() : Promise.reject(new Error(t('validation.route'))) }]}><Input autoFocus placeholder="10.147.17.0/24" /></Form.Item><Form.Item name="via" label={t('networks.gateway')} extra={t('networks.gatewayHint')}><Input /></Form.Item></Form>
    </Modal>
    <Modal title={t('networks.addPool')} open={poolOpen} onCancel={() => setPoolOpen(false)} okText={t('common.add')} confirmLoading={mutation.isPending} onOk={() => void poolForm.validateFields().then((values) => mutation.mutate({ kind: 'add-pool', value: { ipRangeStart: values.start, ipRangeEnd: values.end } }))}>
      <Form form={poolForm} layout="vertical"><Form.Item name="start" label={t('networks.poolStart')} rules={[{ validator: (_, value) => parseIpv4(value) !== null ? Promise.resolve() : Promise.reject(new Error(t('validation.poolIp'))) }]}><Input autoFocus /></Form.Item><Form.Item name="end" label={t('networks.poolEnd')} dependencies={['start']} rules={[{ validator: (_, value) => { const start = parseIpv4(poolForm.getFieldValue('start')); const end = parseIpv4(value); return start !== null && end !== null && start <= end ? Promise.resolve() : Promise.reject(new Error(t('validation.poolOrder'))); } }]}><Input /></Form.Item></Form>
    </Modal>
  </Row>;
}
