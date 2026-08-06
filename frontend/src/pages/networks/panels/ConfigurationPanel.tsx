import { DeleteOutlined, ExperimentOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import { App, Button, Card, Col, Form, Input, InputNumber, Row, Space, Switch } from 'antd';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { useMutation } from '@tanstack/react-query';
import { consoleApi } from '@/api/console';
import { queryClient, queryKeys } from '@/api/query';
import { SectionCard } from '@/components/common/SectionCard';
import type { NetworkBundle } from '@/types/api';
import { defaultPoolForCidr, FALLBACK_CIDR, MTU_MAX, MTU_MIN, poolRangeError } from '@/utils/network';
import { managedPool, managedRoute } from './panelUtils';

export function ConfigurationPanel({ bundle }: { bundle: NetworkBundle }) {
  const { t } = useTranslation();
  const { message, modal } = App.useApp();
  const navigate = useNavigate();
  const nwid = bundle.network.nwid;
  const [basicsForm] = Form.useForm();
  const [easyForm] = Form.useForm();
  const [assignForm] = Form.useForm();
  const route = managedRoute(bundle);
  const pool = managedPool(bundle);
  const defaults = defaultPoolForCidr(route?.target || FALLBACK_CIDR)!;
  const refresh = () => queryClient.invalidateQueries({ queryKey: queryKeys.network(nwid) });
  useEffect(() => {
    basicsForm.setFieldsValue({ name: bundle.network.name, mtu: bundle.network.mtu || 2800, private: bundle.network.private });
    easyForm.setFieldsValue({ cidr: route?.target || defaults.cidr, poolStart: pool?.ipRangeStart || defaults.poolStart, poolEnd: pool?.ipRangeEnd || defaults.poolEnd });
    assignForm.setFieldsValue({ ipv4: bundle.network.v4AssignMode?.zt, plane: bundle.network.v6AssignMode?.['6plane'], rfc: bundle.network.v6AssignMode?.rfc4193, zt: bundle.network.v6AssignMode?.zt });
  }, [bundle, basicsForm, easyForm, assignForm, route?.target, pool?.ipRangeStart, pool?.ipRangeEnd, defaults.cidr, defaults.poolStart, defaults.poolEnd]);

  const saveBasics = useMutation({ mutationFn: (values: { name: string; mtu: number; private: boolean }) => consoleApi.patchNetwork(nwid, values), onSuccess: async () => { await refresh(); void message.success(t('message.saved')); }, onError: (error) => void message.error(error.message) });
  const saveAssign = useMutation({ mutationFn: (values: { ipv4: boolean; plane: boolean; rfc: boolean; zt: boolean }) => consoleApi.patchNetwork(nwid, { v4AssignMode: { zt: values.ipv4 }, v6AssignMode: { '6plane': values.plane, rfc4193: values.rfc, zt: values.zt } }), onSuccess: async () => { await refresh(); void message.success(t('message.saved')); }, onError: (error) => void message.error(error.message) });
  const easy = useMutation({ mutationFn: (values: { cidr: string; poolStart: string; poolEnd: string }) => consoleApi.easySetup(nwid, { networkCIDR: values.cidr, poolStart: values.poolStart, poolEnd: values.poolEnd }), onSuccess: async () => { await refresh(); void message.success(t('message.saved')); }, onError: (error) => void message.error(error.message) });
  const remove = useMutation({ mutationFn: () => consoleApi.deleteNetwork(nwid), onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: queryKeys.controller }); navigate('/networks'); void message.success(t('message.deleted')); }, onError: (error) => void message.error(error.message) });

  const updatePoolDefaults = () => {
    const next = defaultPoolForCidr(easyForm.getFieldValue('cidr'));
    if (next) easyForm.setFieldsValue({ cidr: next.cidr, poolStart: next.poolStart, poolEnd: next.poolEnd });
  };
  const confirmDelete = () => modal.confirm({ title: t('networks.deleteNetworkTitle', { name: bundle.network.name || nwid }), content: t('networks.deleteNetworkBody'), okText: t('networks.deleteNetwork'), okButtonProps: { danger: true }, onOk: () => remove.mutateAsync() });

  return <Row gutter={[16, 16]}>
    <Col xs={24} xl={12}><SectionCard title={<><SafetyCertificateOutlined /> {t('networks.basics')}</>}><Form form={basicsForm} layout="vertical" onFinish={(values) => saveBasics.mutate(values)}>
      <Form.Item name="name" label={t('common.name')} rules={[{ required: true, whitespace: true, message: t('validation.required') }]}><Input /></Form.Item>
      <Form.Item name="mtu" label={t('networks.mtu')} rules={[{ required: true, message: t('validation.required') }, { type: 'number', min: MTU_MIN, max: MTU_MAX, message: t('validation.mtu') }]}><InputNumber min={MTU_MIN} max={MTU_MAX} style={{ width: '100%' }} /></Form.Item>
      <Form.Item><div className="switch-field"><span><strong>{t('networks.privateNetwork')}</strong><small>{t('networks.privateCopy')}</small></span><Form.Item name="private" valuePropName="checked" noStyle><Switch /></Form.Item></div></Form.Item>
      <Button htmlType="submit" type="primary" loading={saveBasics.isPending}>{t('common.save')}</Button>
    </Form></SectionCard></Col>
    <Col xs={24} xl={12}><SectionCard title={<><ExperimentOutlined /> {t('networks.easySetup')}</>}><p className="section-description">{t('networks.easyCopy')}</p><Form form={easyForm} layout="vertical" onFinish={(values) => easy.mutate(values)}>
      <Form.Item name="cidr" label={t('networks.cidr')} rules={[{ validator: (_, value) => defaultPoolForCidr(value) ? Promise.resolve() : Promise.reject(new Error(t('validation.cidr'))) }]}><Input onBlur={updatePoolDefaults} /></Form.Item>
      <Row gutter={12}><Col span={12}><Form.Item name="poolStart" label={t('networks.poolStart')}><Input /></Form.Item></Col><Col span={12}><Form.Item name="poolEnd" label={t('networks.poolEnd')} dependencies={['cidr', 'poolStart']} rules={[{ validator: () => { const values = easyForm.getFieldsValue(); const key = poolRangeError(values.cidr, values.poolStart, values.poolEnd); return key ? Promise.reject(new Error(t(key))) : Promise.resolve(); } }]}><Input /></Form.Item></Col></Row>
      <Button htmlType="submit" type="primary" loading={easy.isPending}>{t('networks.applyEasy')}</Button>
    </Form></SectionCard></Col>
    <Col xs={24} xl={12}><SectionCard title={t('networks.addressAssignment')}><Form form={assignForm} onFinish={(values) => saveAssign.mutate(values)} className="switch-form">
      {[['ipv4', 'networks.ipv4'], ['plane', 'networks.ipv6Plane'], ['rfc', 'networks.ipv6Rfc'], ['zt', 'networks.ipv6Zt']].map(([name, label]) => <Form.Item key={name}><div className="switch-field"><strong>{t(label)}</strong><Form.Item name={name} valuePropName="checked" noStyle><Switch /></Form.Item></div></Form.Item>)}
      <Button htmlType="submit" type="primary" loading={saveAssign.isPending}>{t('common.save')}</Button>
    </Form></SectionCard></Col>
    <Col xs={24} xl={12}><Card bordered={false} className="danger-card"><Space direction="vertical" size="middle"><div><h3>{t('networks.danger')}</h3><p>{t('networks.dangerCopy')}</p></div><Button danger type="primary" icon={<DeleteOutlined />} loading={remove.isPending} onClick={confirmDelete}>{t('networks.deleteNetwork')}</Button></Space></Card></Col>
  </Row>;
}
