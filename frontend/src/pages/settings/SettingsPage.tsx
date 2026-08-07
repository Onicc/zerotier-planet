import { LockOutlined, SafetyCertificateOutlined, TranslationOutlined } from '@ant-design/icons';
import { Alert, App, Button, Form, Input, Tooltip } from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/auth/AuthProvider';
import { AppearanceControls } from '@/components/common/AppearanceControls';
import { CopyButton } from '@/components/common/CopyButton';
import { PageHeader } from '@/components/common/PageHeader';
import { SectionCard } from '@/components/common/SectionCard';
import { useOverviewQuery } from '@/hooks/useConsoleQueries';

function validPassword(value: string) { return value.length >= 8 && /[A-Za-z]/.test(value) && /\d/.test(value); }

export function SettingsPage() {
  const { t } = useTranslation();
  const { message, modal } = App.useApp();
  const auth = useAuth();
  const overview = useOverviewQuery();
  const [form] = Form.useForm();
  const [pending, setPending] = useState(false);
  const publicUrl = overview.data?.publicUrl || '';
  const submit = async (values: { password: string; confirm: string }) => {
    if (values.password !== values.confirm) { void message.error(t('auth.invalidPair')); return; }
    const confirmed = await new Promise<boolean>((resolve) => modal.confirm({ title: t('settings.resetPassword'), content: t('settings.resetConfirm'), okText: t('settings.resetPassword'), okButtonProps: { danger: true }, onOk: () => resolve(true), onCancel: () => resolve(false) }));
    if (!confirmed) return;
    setPending(true);
    try { await auth.resetPassword(values.password); form.resetFields(); void message.success(t('message.passwordReset')); } catch (error) { void message.error(error instanceof Error ? error.message : String(error)); } finally { setPending(false); }
  };

  return <div className="page-stack"><PageHeader title={t('page.settingsTitle')} subtitle={t('page.settingsSubtitle')} eyebrow={t('common.settings')} />
    <div className="settings-grid">
      <SectionCard title={<><SafetyCertificateOutlined /> {t('settings.instance')}</>}>
        <dl className="instance-detail-list settings-detail-list">
          <div><dt>{t('overview.publicUrl')}</dt><dd><Tooltip title={publicUrl}><span className="breakable-value">{publicUrl || '—'}</span></Tooltip>{publicUrl && <CopyButton text={publicUrl} type="text" size="small" aria-label={t('common.copy')} />}</dd></div>
          <div><dt>{t('overview.planet')}</dt><dd>{t(overview.data?.hasPlanet ? 'common.ready' : 'common.missing')}</dd></div>
          <div><dt>{t('settings.session')}</dt><dd className="breakable-value">{auth.username} · {t('settings.sessionActive')}</dd></div>
          <div><dt>{t('overview.ttl')}</dt><dd className="numeric-value">{Math.round((overview.data?.linkTtlSeconds || 600) / 60)} min</dd></div>
        </dl>
      </SectionCard>
      <SectionCard title={<><TranslationOutlined /> {t('settings.appearance')}</>}>
        <div className="preference-group"><label>{t('settings.theme')}</label><AppearanceControls kind="theme" block /></div>
        <div className="preference-group"><label>{t('settings.language')}</label><AppearanceControls kind="language" block /></div>
      </SectionCard>
    </div>
    <SectionCard className="security-card" title={<><LockOutlined /> {t('settings.security')}</>}><div className="security-content"><Alert type="warning" showIcon message={t('settings.resetCopy')} /><Form form={form} layout="vertical" onFinish={(values) => void submit(values)} className="password-form"><Form.Item name="password" label={t('auth.newPassword')} extra={t('auth.policy')} rules={[{ required: true, message: t('validation.required') }, { validator: (_, value) => !value || validPassword(value) ? Promise.resolve() : Promise.reject(new Error(t('auth.policy'))) }]}><Input.Password autoComplete="new-password" /></Form.Item><Form.Item name="confirm" label={t('auth.confirmPassword')} dependencies={['password']} rules={[{ required: true, message: t('validation.required') }, ({ getFieldValue }) => ({ validator: (_, value) => !value || value === getFieldValue('password') ? Promise.resolve() : Promise.reject(new Error(t('auth.invalidPair'))) })]}><Input.Password autoComplete="new-password" /></Form.Item><div className="form-actions"><Button danger type="primary" htmlType="submit" loading={pending}>{t('settings.resetPassword')}</Button></div></Form></div></SectionCard>
  </div>;
}
