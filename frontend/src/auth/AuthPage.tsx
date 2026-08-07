import {
  ApiOutlined,
  DeploymentUnitOutlined,
  DownloadOutlined,
  LockOutlined,
  SafetyCertificateOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { Alert, App, Button, Form, Input, Spin } from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AppearanceControls } from '@/components/common/AppearanceControls';
import { useAuth } from './AuthProvider';

function validPassword(value: string) {
  return value.length >= 8 && /[A-Za-z]/.test(value) && /\d/.test(value);
}

export function AuthPage() {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const auth = useAuth();
  const [loginForm] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  if (auth.checking) {
    return <div className="auth-loading"><Spin size="large" /></div>;
  }

  const submitLogin = async (values: { username: string; password: string }) => {
    setPending(true);
    setError('');
    try {
      await auth.login(values.username, values.password);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setPending(false);
    }
  };

  const submitPassword = async (values: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  }) => {
    if (values.newPassword !== values.confirmPassword) {
      setError(t('auth.invalidPair'));
      return;
    }
    if (!validPassword(values.newPassword)) {
      setError(t('auth.policy'));
      return;
    }

    setPending(true);
    setError('');
    try {
      await auth.changePassword(values.currentPassword, values.newPassword);
      void message.success(t('message.saved'));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setPending(false);
    }
  };

  const capabilities = [
    {
      icon: <DeploymentUnitOutlined />,
      title: t('auth.planetTitle'),
      copy: t('auth.planetCopy'),
    },
    {
      icon: <ApiOutlined />,
      title: t('auth.controllerTitle'),
      copy: t('auth.controllerCopy'),
    },
    {
      icon: <DownloadOutlined />,
      title: t('auth.deliveryTitle'),
      copy: t('auth.deliveryCopy'),
    },
  ];

  const isFirstSignIn = auth.mustChangePassword;

  return (
    <main className="auth-page">
      <section className="auth-brand-panel" aria-labelledby="auth-brand-title">
        <div className="auth-brand-head">
          <img src="/assets/logo.svg" alt="" />
          <div>
            <strong>{t('common.appName')}</strong>
            <small>{t('auth.unifiedConsole')}</small>
          </div>
        </div>

        <div className="auth-brand-content">
          <span className="auth-kicker">{t('auth.unifiedConsole')}</span>
          <h2 id="auth-brand-title">{t('auth.brandTitle')}</h2>
          <p>{t('auth.brandCopy')}</p>

          <div className="auth-capability-list">
            {capabilities.map((capability) => (
              <div className="auth-capability-item" key={capability.title}>
                <span className="auth-capability-icon" aria-hidden="true">
                  {capability.icon}
                </span>
                <div>
                  <h3>{capability.title}</h3>
                  <p>{capability.copy}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="auth-orbit" aria-hidden="true"><i /><i /><i /><i /></div>
      </section>

      <section className="auth-form-panel" aria-labelledby="auth-form-title">
        <div className="auth-form-toolbar">
          <AppearanceControls kind="theme" compact />
          <AppearanceControls kind="language" compact />
        </div>

        <div className="auth-form-wrap">
          <div className="auth-mobile-brand">
            <img src="/assets/logo.svg" alt="" />
            <div>
              <strong>{t('common.appName')}</strong>
              <small>{t('auth.unifiedConsole')}</small>
            </div>
          </div>

          <span className={`auth-state-label${isFirstSignIn ? ' auth-state-label-first' : ''}`}>
            {isFirstSignIn ? <LockOutlined /> : <UserOutlined />}
            {isFirstSignIn ? t('auth.firstAccess') : t('auth.adminAccess')}
          </span>
          <h1 id="auth-form-title">
            {isFirstSignIn ? t('auth.firstTitle') : t('auth.title')}
          </h1>
          <p className="auth-form-subtitle">
            {isFirstSignIn ? t('auth.firstSubtitle') : t('auth.subtitle')}
          </p>

          {error && <Alert type="error" showIcon message={error} />}

          {isFirstSignIn ? (
            <Form
              form={passwordForm}
              className="auth-form"
              layout="vertical"
              requiredMark={false}
              onFinish={(values) => void submitPassword(values)}
            >
              <Form.Item
                name="currentPassword"
                label={t('auth.currentPassword')}
                rules={[{ required: true, message: t('validation.required') }]}
              >
                <Input.Password
                  size="large"
                  prefix={<LockOutlined />}
                  autoComplete="current-password"
                />
              </Form.Item>
              <Form.Item
                name="newPassword"
                label={t('auth.newPassword')}
                rules={[{ required: true, message: t('validation.required') }]}
                extra={t('auth.policy')}
              >
                <Input.Password
                  size="large"
                  prefix={<LockOutlined />}
                  autoComplete="new-password"
                />
              </Form.Item>
              <Form.Item
                name="confirmPassword"
                label={t('auth.confirmPassword')}
                rules={[{ required: true, message: t('validation.required') }]}
              >
                <Input.Password
                  size="large"
                  prefix={<LockOutlined />}
                  autoComplete="new-password"
                />
              </Form.Item>
              <Button htmlType="submit" type="primary" size="large" block loading={pending}>
                {t('auth.updatePassword')}
              </Button>
            </Form>
          ) : (
            <Form
              form={loginForm}
              className="auth-form"
              layout="vertical"
              requiredMark={false}
              initialValues={{ username: auth.username || 'admin' }}
              onFinish={(values) => void submitLogin(values)}
            >
              <Form.Item
                name="username"
                label={t('auth.username')}
                rules={[{ required: true, message: t('validation.required') }]}
              >
                <Input size="large" prefix={<UserOutlined />} autoComplete="username" />
              </Form.Item>
              <Form.Item
                name="password"
                label={t('auth.password')}
                rules={[{ required: true, message: t('validation.required') }]}
              >
                <Input.Password
                  size="large"
                  prefix={<LockOutlined />}
                  autoComplete="current-password"
                  autoFocus
                />
              </Form.Item>
              <Button htmlType="submit" type="primary" size="large" block loading={pending}>
                {t('auth.signIn')}
              </Button>
            </Form>
          )}

          <div className="auth-security-note">
            <SafetyCertificateOutlined aria-hidden="true" />
            <span>{isFirstSignIn ? t('auth.firstSecurityNote') : t('auth.securityNote')}</span>
          </div>
        </div>
      </section>
    </main>
  );
}
