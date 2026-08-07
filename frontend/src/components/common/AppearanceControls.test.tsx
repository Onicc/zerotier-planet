import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import i18n from '@/i18n';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { AppearanceControls } from './AppearanceControls';

function renderControls() {
  return render(<ThemeProvider><AppearanceControls kind="theme" block /><AppearanceControls kind="language" block /></ThemeProvider>);
}

describe('AppearanceControls', () => {
  afterEach(cleanup);

  beforeEach(async () => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    await i18n.changeLanguage('en');
  });

  it('persists the selected theme', () => {
    renderControls();

    fireEvent.click(screen.getByText('Dark'));

    expect(localStorage.getItem('ztp_theme')).toBe('dark');
    expect(document.documentElement.dataset.theme).toBe('dark');
  });

  it('uses the same segmented interaction for language', async () => {
    renderControls();

    fireEvent.click(screen.getByText('中文'));

    expect(i18n.language).toBe('zh-CN');
    expect(localStorage.getItem('ztp_lang')).toBe('zh-CN');
  });
});
