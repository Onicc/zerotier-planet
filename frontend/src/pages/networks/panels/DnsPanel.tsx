import { App, Button, Form, Input } from 'antd';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation } from '@tanstack/react-query';
import { consoleApi } from '@/api/console';
import { queryClient, queryKeys } from '@/api/query';
import { SectionCard } from '@/components/common/SectionCard';
import type { NetworkBundle } from '@/types/api';
import { isLikelyIpAddress } from '@/utils/network';

export function DnsPanel({ bundle }: { bundle: NetworkBundle }) {
  const { t } = useTranslation(); const { message } = App.useApp(); const [form] = Form.useForm(); const nwid = bundle.network.nwid;
  useEffect(() => form.setFieldsValue({ domain: bundle.network.dns?.domain || '', servers: bundle.network.dns?.servers?.join('\n') || '' }), [bundle, form]);
  const mutation = useMutation({ mutationFn: (values: { domain: string; servers: string }) => consoleApi.saveDns(nwid, { domain: values.domain.trim(), servers: values.servers.split('\n').map((item) => item.trim()).filter(Boolean) }), onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: queryKeys.network(nwid) }); void message.success(t('message.saved')); }, onError: (error) => void message.error(error.message) });
  return <SectionCard className="form-card-narrow" title={t('networks.dnsTitle')}><Form form={form} layout="vertical" onFinish={(values) => mutation.mutate(values)}><Form.Item name="domain" label={t('networks.domain')}><Input placeholder="corp.example" /></Form.Item><Form.Item name="servers" label={t('networks.servers')} extra={t('networks.serversHint')} rules={[{ validator: (_, value) => !value || value.split('\n').map((item: string) => item.trim()).filter(Boolean).every(isLikelyIpAddress) ? Promise.resolve() : Promise.reject(new Error(t('validation.ip'))) }]}><Input.TextArea rows={7} placeholder={'10.88.0.2\nfd00::53'} /></Form.Item><div className="form-actions"><Button htmlType="submit" type="primary" loading={mutation.isPending}>{t('common.save')}</Button></div></Form></SectionCard>;
}
