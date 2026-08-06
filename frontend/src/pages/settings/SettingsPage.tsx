import { LockOutlined, SafetyCertificateOutlined, TranslationOutlined } from '@ant-design/icons';
import { Alert, App, Button, Card, Col, Descriptions, Form, Input, Radio, Row, Segmented } from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '@/components/common/PageHeader';
import { SectionCard } from '@/components/common/SectionCard';
import { useAuth } from '@/auth/AuthProvider';
import { useOverviewQuery } from '@/hooks/useConsoleQueries';
import { useThemeMode } from '@/theme/ThemeProvider';

function validPassword(value: string) { return value.length >= 8 && /[A-Za-z]/.test(value) && /\d/.test(value); }

export function SettingsPage() {
  const { t, i18n } = useTranslation(); const { message, modal } = App.useApp(); const auth = useAuth(); const theme = useThemeMode(); const overview = useOverviewQuery(); const [form] = Form.useForm(); const [pending, setPending] = useState(false);
  const submit = async (values: { password: string; confirm: string }) => {
    if (values.password !== values.confirm) { void message.error(t('auth.invalidPair')); return; }
    const confirmed = await new Promise<boolean>((resolve) => modal.confirm({ title: t('settings.resetPassword'), content: t('settings.resetConfirm'), okText: t('settings.resetPassword'), okButtonProps: { danger: true }, onOk: () => resolve(true), onCancel: () => resolve(false) }));
    if (!confirmed) return; setPending(true);
    try { await auth.resetPassword(values.password); form.resetFields(); void message.success(t('message.passwordReset')); } catch (error) { void message.error(error instanceof Error ? error.message : String(error)); } finally { setPending(false); }
  };
  return <div className="page-stack"><PageHeader title={t('page.settingsTitle')} subtitle={t('page.settingsSubtitle')} eyebrow={t('common.settings')} />
    <Row gutter={[16, 16]}><Col xs={24} xl={12}><SectionCard title={<><SafetyCertificateOutlined /> {t('settings.instance')}</>}><Descriptions column={1} items={[
      { key: 'url', label: t('overview.publicUrl'), children: overview.data?.publicUrl || '—' }, { key: 'planet', label: t('overview.planet'), children: t(overview.data?.hasPlanet ? 'common.ready' : 'common.missing') },
      { key: 'session', label: t('settings.session'), children: `${auth.username} · ${t('settings.sessionActive')}` }, { key: 'ttl', label: t('overview.ttl'), children: `${Math.round((overview.data?.linkTtlSeconds || 600) / 60)} min` },
    ]} /></SectionCard></Col>
    <Col xs={24} xl={12}><SectionCard title={<><TranslationOutlined /> {t('settings.appearance')}</>}><div className="preference-group"><label>{t('settings.theme')}</label><Radio.Group value={theme.mode} onChange={(event) => theme.setMode(event.target.value)} optionType="button" buttonStyle="solid" options={[{ label: t('settings.light'), value: 'light' }, { label: t('settings.dark'), value: 'dark' }, { label: t('settings.system'), value: 'system' }]} /></div><div className="preference-group"><label>{t('settings.language')}</label><Segmented value={i18n.language} onChange={(value) => void i18n.changeLanguage(String(value))} options={[{ label: 'English', value: 'en' }, { label: '中文', value: 'zh-CN' }]} /></div></SectionCard></Col>
    <Col xs={24}><Card bordered={false} className="section-card security-card" title={<><LockOutlined /> {t('settings.security')}</>}><Alert type="warning" showIcon message={t('settings.resetCopy')} /><Form form={form} layout="vertical" onFinish={(values) => void submit(values)} className="password-form"><Form.Item name="password" label={t('auth.newPassword')} extra={t('auth.policy')} rules={[{ required: true, message: t('validation.required') }, { validator: (_, value) => !value || validPassword(value) ? Promise.resolve() : Promise.reject(new Error(t('auth.policy'))) }]}><Input.Password autoComplete="new-password" /></Form.Item><Form.Item name="confirm" label={t('auth.confirmPassword')} rules={[{ required: true, message: t('validation.required') }]}><Input.Password autoComplete="new-password" /></Form.Item><Button danger type="primary" htmlType="submit" loading={pending}>{t('settings.resetPassword')}</Button></Form></Card></Col></Row>
  </div>;
}
