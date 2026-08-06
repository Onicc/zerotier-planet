import { useQuery } from '@tanstack/react-query';
import { consoleApi } from '@/api/console';
import { queryKeys } from '@/api/query';

const liveQueryOptions = {
  refetchInterval: 12_000,
  refetchIntervalInBackground: false,
};

export function useOverviewQuery() {
  return useQuery({ queryKey: queryKeys.overview, queryFn: consoleApi.overview, ...liveQueryOptions });
}

export function useControllerQuery() {
  return useQuery({ queryKey: queryKeys.controller, queryFn: consoleApi.controller, ...liveQueryOptions });
}

export function useNetworkQuery(nwid: string) {
  return useQuery({
    queryKey: queryKeys.network(nwid),
    queryFn: () => consoleApi.network(nwid),
    enabled: Boolean(nwid),
    ...liveQueryOptions,
  });
}
