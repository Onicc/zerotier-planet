import { App } from 'antd';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '@/i18n';
import { NetworksPage } from './NetworksPage';

const { createNetwork } = vi.hoisted(() => ({ createNetwork: vi.fn() }));

vi.mock('@/api/console', () => ({ consoleApi: { createNetwork } }));
vi.mock('@/hooks/useConsoleQueries', () => ({
  useControllerQuery: () => ({
    data: { networks: [] },
    error: null,
    isLoading: false,
    refetch: vi.fn(),
  }),
}));

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <App>
        <MemoryRouter><NetworksPage /></MemoryRouter>
      </App>
    </QueryClientProvider>,
  );
}

describe('NetworksPage network creation', () => {
  beforeEach(() => {
    createNetwork.mockReset();
    createNetwork.mockResolvedValue({ network: { nwid: '8056c2e21c000001', name: 'Public mesh', private: false } });
  });

  afterEach(cleanup);

  it('defaults to Private and submits a selected Public network', async () => {
    renderPage();
    fireEvent.click(screen.getAllByRole('button', { name: 'Create network' })[0]);

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByRole('radio', { name: /Private/ })).toBeChecked();

    fireEvent.change(within(dialog).getByLabelText('Network name'), { target: { value: 'Public mesh' } });
    fireEvent.click(within(dialog).getByRole('radio', { name: /Public/ }));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Create' }));

    await waitFor(() => expect(createNetwork).toHaveBeenCalledWith({ name: 'Public mesh', private: false }));
  });
});
