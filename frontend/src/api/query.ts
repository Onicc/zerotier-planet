import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 8_000,
      retry: (failureCount, error) => {
        const status = (error as { status?: number }).status;
        return status === 401 ? false : failureCount < 1;
      },
      refetchOnWindowFocus: true,
    },
    mutations: { retry: false },
  },
});

export const queryKeys = {
  overview: ['overview'] as const,
  controller: ['controller'] as const,
  network: (nwid: string) => ['network', nwid] as const,
};
