import type { NetworkBundle } from '@/types/api';

export function managedRoute(bundle: NetworkBundle) {
  const target = bundle.profile?.managedRouteTarget;
  return bundle.network.routes?.find((route) => target ? route.target === target && !route.via : !route.via) || null;
}

export function managedPool(bundle: NetworkBundle) {
  const { managedPoolStart, managedPoolEnd } = bundle.profile || {};
  return bundle.network.ipAssignmentPools?.find((pool) => managedPoolStart
    ? pool.ipRangeStart === managedPoolStart && pool.ipRangeEnd === managedPoolEnd
    : true) || null;
}
