import { DeleteOutlined, PlusOutlined, SearchOutlined } from '@ant-design/icons';
import { App, Button, Card, Form, Input, Modal, Select, Space, Switch, Table, Tag, Tooltip } from 'antd';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation } from '@tanstack/react-query';
import { consoleApi } from '@/api/console';
import { queryClient, queryKeys } from '@/api/query';
import { StatusBadge } from '@/components/common/StatusBadge';
import type { Member, NetworkBundle } from '@/types/api';
import { memberId } from '@/utils/format';
import { isLikelyIpAddress } from '@/utils/network';

export function MembersPanel({ bundle }: { bundle: NetworkBundle }) {
  const { t } = useTranslation();
  const { message, modal } = App.useApp();
  const nwid = bundle.network.nwid;
  const [search, setSearch] = useState('');
  const [authorization, setAuthorization] = useState('all');
  const [connectivity, setConnectivity] = useState('all');
  const [ipMember, setIpMember] = useState<Member | null>(null);
  const [ipForm] = Form.useForm();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: queryKeys.network(nwid) });

  const patch = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<Member> }) => consoleApi.patchMember(nwid, id, body),
    onSuccess: async () => { await invalidate(); void message.success(t('message.updated')); },
    onError: (error) => { void invalidate(); void message.error(error.message); },
  });
  const addIp = useMutation({
    mutationFn: ({ id, ip }: { id: string; ip: string }) => consoleApi.addMemberIp(nwid, id, ip),
    onSuccess: async () => { await invalidate(); setIpMember(null); ipForm.resetFields(); void message.success(t('message.saved')); },
    onError: (error) => void message.error(error.message),
  });
  const removeIp = useMutation({
    mutationFn: ({ id, index }: { id: string; index: number }) => consoleApi.removeMemberIp(nwid, id, index),
    onSuccess: async () => { await invalidate(); void message.success(t('message.removed')); },
    onError: (error) => void message.error(error.message),
  });
  const removeMember = useMutation({
    mutationFn: (id: string) => consoleApi.deleteMember(nwid, id),
    onSuccess: async () => { await invalidate(); void message.success(t('message.removed')); },
    onError: (error) => void message.error(error.message),
  });

  const members = useMemo(() => bundle.members.filter((member) => {
    const id = memberId(member);
    const text = search.toLowerCase().trim();
    const matchesText = !text || member.name?.toLowerCase().includes(text) || id.toLowerCase().includes(text) || member.ipAssignments?.some((ip) => ip.toLowerCase().includes(text));
    const matchesAuth = authorization === 'all' || (authorization === 'authorized' ? member.authorized : !member.authorized);
    const matchesConnectivity = connectivity === 'all' || member.peerState === connectivity;
    return matchesText && matchesAuth && matchesConnectivity;
  }).sort((a, b) => Number(a.authorized) - Number(b.authorized) || String(a.name || memberId(a)).localeCompare(String(b.name || memberId(b)))), [bundle.members, search, authorization, connectivity]);

  const confirmRemove = (member: Member) => modal.confirm({
    title: t('networks.deleteMemberTitle'), content: t('networks.deleteMemberBody'), okText: t('common.remove'), okButtonProps: { danger: true },
    onOk: () => removeMember.mutateAsync(memberId(member)),
  });

  return (
    <Card bordered={false} className="section-card">
      <div className="table-toolbar">
        <Input allowClear prefix={<SearchOutlined />} value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t('networks.memberSearch')} />
        <Select value={authorization} onChange={setAuthorization} options={[{ value: 'all', label: t('common.all') }, { value: 'authorized', label: t('networks.authorized') }, { value: 'pending', label: t('networks.pending') }]} />
        <Select value={connectivity} onChange={setConnectivity} options={[{ value: 'all', label: t('common.all') }, { value: 'online', label: t('common.online') }, { value: 'relay', label: t('common.relay') }, { value: 'offline', label: t('common.offline') }]} />
        <span className="table-count">{members.length} / {bundle.members.length}</span>
      </div>
      <Table rowKey={(member) => memberId(member)} dataSource={members} scroll={{ x: 1000 }} pagination={{ pageSize: 20, hideOnSinglePage: true }} locale={{ emptyText: t('networks.noMembers') }}
        columns={[
          { title: t('common.name'), dataIndex: 'name', width: 210, fixed: 'left', render: (value: string, member) => <Input defaultValue={value} disabled={patch.isPending && patch.variables?.id === memberId(member)} placeholder={t('networks.friendlyName')} onPressEnter={(event) => event.currentTarget.blur()} onBlur={(event) => { const name = event.target.value.trim(); if (name !== (value || '')) patch.mutate({ id: memberId(member), body: { name } }); }} /> },
          { title: t('common.status'), width: 130, fixed: 'left', render: (_, member) => <StatusBadge dot tone={member.peerState === 'online' || member.peerState === 'controller' ? 'success' : member.peerState === 'relay' ? 'warning' : member.peerState === 'error' ? 'error' : 'default'} label={t(`common.${member.peerState === 'controller' ? 'controller' : member.peerState || 'offline'}`)} /> },
          { title: t('networks.memberId'), width: 150, render: (_, member) => <code className="member-id">{memberId(member)}</code> },
          { title: t('networks.authorization'), width: 130, render: (_, member) => <Switch checked={Boolean(member.authorized)} loading={patch.isPending && patch.variables?.id === memberId(member)} checkedChildren={t('common.yes')} unCheckedChildren={t('common.no')} onChange={(authorized) => patch.mutate({ id: memberId(member), body: { authorized } })} /> },
          { title: t('networks.bridge'), width: 90, render: (_, member) => <Switch size="small" checked={Boolean(member.activeBridge)} loading={patch.isPending && patch.variables?.id === memberId(member)} onChange={(activeBridge) => patch.mutate({ id: memberId(member), body: { activeBridge } })} /> },
          { title: t('networks.ipAssignments'), minWidth: 300, render: (_, member) => <Space size={[4, 4]} wrap>{member.ipAssignments?.map((ip, index) => <Tag key={`${ip}-${index}`} closable={!removeIp.isPending} onClose={(event) => { event.preventDefault(); removeIp.mutate({ id: memberId(member), index }); }}>{ip}</Tag>)}<Button size="small" type="dashed" icon={<PlusOutlined />} disabled={addIp.isPending || removeIp.isPending} onClick={() => setIpMember(member)}>{t('common.add')}</Button></Space> },
          { title: '', width: 55, fixed: 'right', render: (_, member) => <Tooltip title={t('common.remove')}><Button type="text" danger aria-label={`${t('common.remove')} ${member.name || memberId(member)}`} icon={<DeleteOutlined />} loading={removeMember.isPending && removeMember.variables === memberId(member)} onClick={() => confirmRemove(member)} /></Tooltip> },
        ]} />
      <Modal open={Boolean(ipMember)} title={t('networks.addIp')} onCancel={() => setIpMember(null)} okText={t('common.add')} confirmLoading={addIp.isPending}
        onOk={() => void ipForm.validateFields().then(({ ip }) => addIp.mutate({ id: memberId(ipMember || {}), ip }))}>
        <Form form={ipForm} layout="vertical"><Form.Item name="ip" label="IP" rules={[{ required: true, message: t('validation.required') }, { validator: (_, value) => !value || isLikelyIpAddress(value) ? Promise.resolve() : Promise.reject(new Error(t('validation.ip'))) }, { validator: (_, value) => !ipMember?.ipAssignments?.includes(value) ? Promise.resolve() : Promise.reject(new Error(t('validation.duplicateIp'))) }]}><Input autoFocus /></Form.Item></Form>
      </Modal>
    </Card>
  );
}
