import { LockOutlined, SafetyCertificateOutlined, UserOutlined } from '@ant-design/icons';
import { Alert, App, Button, Form, Input, Segmented, Spin } from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from './AuthProvider';

function validPassword(value: string) {
  return value.length >= 8 && /[A-Za-z]/.test(value) && /\d/.test(value);
}

export function AuthPage() {
  const { t, i18n } = useTranslation();
  const { message } = App.useApp();
  const auth = useAuth();
  const [loginForm] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  if (auth.checking) return <div className="auth-loading"><Spin size="large" /></div>;

  const submitLogin = async (values: { username: string; password: string }) => {
    setPending(true); setError('');
    try { await auth.login(values.username, values.password); }
    catch (caught) { setError(caught instanceof Error ? caught.message : String(caught)); }
    finally { setPending(false); }
  };

  const submitPassword = async (values: { currentPassword: string; newPassword: string; confirmPassword: string }) => {
    if (values.newPassword !== values.confirmPassword) { setError(t('auth.invalidPair')); return; }
    if (!validPassword(values.newPassword)) { setError(t('auth.policy')); return; }
    setPending(true); setError('');
    try {
      await auth.changePassword(values.currentPassword, values.newPassword);
      void message.success(t('message.saved'));
    } catch (caught) { setError(caught instanceof Error ? caught.message : String(caught)); }
    finally { setPending(false); }
  };

  return (
    <main className="auth-page">
      <section className="auth-brand-panel" aria-label={t('auth.brandTitle')}>
        <div className="auth-brand-head"><img src="/assets/logo.svg" alt="" /><strong>{t('common.appName')}</strong></div>
        <div className="auth-brand-content">
          <span className="auth-kicker">{t('common.console')}</span>
          <h1>{t('auth.brandTitle')}</h1>
          <p>{t('auth.brandCopy')}</p>
          <div className="auth-trust-list">
            <span><SafetyCertificateOutlined /> {t('auth.selfHosted')}</span>
            <span><LockOutlined /> {t('auth.temporaryLinks')}</span>
            <span><UserOutlined /> {t('auth.authorization')}</span>
          </div>
        </div>
        <div className="auth-orbit" aria-hidden="true"><i /><i /><i /><i /></div>
      </section>
      <section className="auth-form-panel">
        <div className="auth-form-toolbar">
          <Segmented size="small" value={i18n.language} onChange={(value) => void i18n.changeLanguage(String(value))}
            options={[{ label: 'EN', value: 'en' }, { label: '中文', value: 'zh-CN' }]} />
        </div>
        <div className="auth-form-wrap">
          <div className="auth-mobile-brand"><img src="/assets/logo.svg" alt="" /><span>{t('common.appName')}</span></div>
          <span className="auth-kicker">{auth.mustChangePassword ? t('auth.updatePassword') : t('auth.signIn')}</span>
          <h2>{auth.mustChangePassword ? t('auth.firstTitle') : t('auth.title')}</h2>
          <p>{auth.mustChangePassword ? t('auth.firstSubtitle') : t('auth.subtitle')}</p>
          {error && <Alert type="error" showIcon message={error} />}
          {auth.mustChangePassword ? (
            <Form form={passwordForm} layout="vertical" requiredMark={false} onFinish={(values) => void submitPassword(values)}>
              <Form.Item name="currentPassword" label={t('auth.currentPassword')} rules={[{ required: true, message: t('validation.required') }]}>
                <Input.Password size="large" prefix={<LockOutlined />} autoComplete="current-password" />
              </Form.Item>
              <Form.Item name="newPassword" label={t('auth.newPassword')} rules={[{ required: true, message: t('validation.required') }]} extra={t('auth.policy')}>
                <Input.Password size="large" prefix={<LockOutlined />} autoComplete="new-password" />
              </Form.Item>
              <Form.Item name="confirmPassword" label={t('auth.confirmPassword')} rules={[{ required: true, message: t('validation.required') }]}>
                <Input.Password size="large" prefix={<LockOutlined />} autoComplete="new-password" />
              </Form.Item>
              <Button htmlType="submit" type="primary" size="large" block loading={pending}>{t('auth.updatePassword')}</Button>
            </Form>
          ) : (
            <Form form={loginForm} layout="vertical" requiredMark={false} initialValues={{ username: auth.username || 'admin' }} onFinish={(values) => void submitLogin(values)}>
              <Form.Item name="username" label={t('auth.username')} rules={[{ required: true, message: t('validation.required') }]}>
                <Input size="large" prefix={<UserOutlined />} autoComplete="username" />
              </Form.Item>
              <Form.Item name="password" label={t('auth.password')} rules={[{ required: true, message: t('validation.required') }]}>
                <Input.Password size="large" prefix={<LockOutlined />} autoComplete="current-password" autoFocus />
              </Form.Item>
              <Button htmlType="submit" type="primary" size="large" block loading={pending}>{t('auth.signIn')}</Button>
            </Form>
          )}
        </div>
      </section>
    </main>
  );
}
