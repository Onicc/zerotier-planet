import { App } from 'antd';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '@/i18n';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { AuthPage } from './AuthPage';

const { authState } = vi.hoisted(() => ({
  authState: {
    checking: false,
    authenticated: false,
    mustChangePassword: false,
    username: 'admin',
    login: vi.fn(),
    changePassword: vi.fn(),
    resetPassword: vi.fn(),
    logout: vi.fn(),
  },
}));

vi.mock('./AuthProvider', () => ({
  useAuth: () => authState,
}));

function renderPage() {
  return render(
    <ThemeProvider>
      <App>
        <AuthPage />
      </App>
    </ThemeProvider>,
  );
}

describe('AuthPage', () => {
  beforeEach(async () => {
    authState.mustChangePassword = false;
    authState.username = 'admin';
    authState.login.mockReset();
    authState.changePassword.mockReset();
    authState.login.mockResolvedValue(undefined);
    authState.changePassword.mockResolvedValue(undefined);
    localStorage.clear();
    await i18n.changeLanguage('en');
  });

  afterEach(cleanup);

  it('presents administrator access and submits the configured credentials', async () => {
    renderPage();

    expect(screen.getByRole('heading', { level: 1, name: 'Sign in to ZeroTier Planet' })).toBeVisible();
    expect(screen.getByText('Use the administrator credentials configured for this deployment.')).toBeVisible();
    expect(screen.getByText('Embedded controller')).toBeVisible();

    fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'operator' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'secret123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in to console' }));

    await waitFor(() => expect(authState.login).toHaveBeenCalledWith('operator', 'secret123'));
  });

  it('requires matching policy-compliant passwords on first sign-in', async () => {
    authState.mustChangePassword = true;
    renderPage();

    expect(screen.getByRole('heading', { level: 1, name: 'Set a new administrator password' })).toBeVisible();
    expect(screen.getByText('Replace the initial password before accessing the console.')).toBeVisible();

    fireEvent.change(screen.getByLabelText('Current password'), { target: { value: 'initial123' } });
    fireEvent.change(screen.getByLabelText('New password'), { target: { value: 'newpass123' } });
    fireEvent.change(screen.getByLabelText('Confirm new password'), { target: { value: 'different123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Set password and continue' }));

    expect(await screen.findByText('The new passwords do not match.')).toBeVisible();
    expect(authState.changePassword).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText('New password'), { target: { value: 'short1' } });
    fireEvent.change(screen.getByLabelText('Confirm new password'), { target: { value: 'short1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Set password and continue' }));

    expect(await screen.findByText('Use at least 8 characters and include both letters and numbers.')).toBeVisible();
    expect(authState.changePassword).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText('New password'), { target: { value: 'newpass123' } });
    fireEvent.change(screen.getByLabelText('Confirm new password'), { target: { value: 'newpass123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Set password and continue' }));

    await waitFor(() => expect(authState.changePassword).toHaveBeenCalledWith('initial123', 'newpass123'));
  });

  it('prevents repeat submission while authentication is pending', async () => {
    let resolveLogin: (() => void) | undefined;
    authState.login.mockImplementationOnce(() => new Promise<void>((resolve) => {
      resolveLogin = resolve;
    }));
    renderPage();

    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'secret123' } });
    const submit = screen.getByRole('button', { name: 'Sign in to console' });
    fireEvent.click(submit);

    await waitFor(() => expect(submit).toHaveClass('ant-btn-loading'));
    fireEvent.click(submit);
    expect(authState.login).toHaveBeenCalledTimes(1);

    resolveLogin?.();
    await waitFor(() => expect(submit).not.toHaveClass('ant-btn-loading'));
  });

  it('shows authentication errors and returns the submit button to its ready state', async () => {
    authState.login.mockRejectedValueOnce(new Error('Invalid administrator credentials'));
    renderPage();

    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'wrong123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in to console' }));

    expect(await screen.findByText('Invalid administrator credentials')).toBeVisible();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Sign in to console' })).toBeEnabled());
  });

  it('uses project-specific authentication terminology in Chinese', async () => {
    await i18n.changeLanguage('zh-CN');
    renderPage();

    expect(screen.getByRole('heading', { level: 1, name: '登录 ZeroTier Planet 控制台' })).toBeVisible();
    expect(screen.getByText('统一控制台', { selector: '.auth-kicker' })).toBeVisible();
    expect(screen.getByText('临时客户端分发')).toBeVisible();
    expect(screen.queryByText('登录私有控制平面')).not.toBeInTheDocument();
  });
});
