import type {
  ControllerStatus,
  IpPool,
  Member,
  NetworkBundle,
  NetworkDns,
  NetworkRoute,
  NetworkSummary,
  Overview,
  SignedLink,
} from '@/types/api';
import { apiRequest } from './client';

const networkPath = (nwid: string) => `/api/controller/networks/${encodeURIComponent(nwid)}`;
const memberPath = (nwid: string, id: string) => `${networkPath(nwid)}/members/${encodeURIComponent(id)}`;

export const consoleApi = {
  overview: () => apiRequest<Overview>('/api/overview'),
  controller: () => apiRequest<ControllerStatus>('/api/controller/status'),
  network: (nwid: string) => apiRequest<NetworkBundle>(networkPath(nwid)),
  createNetwork: (name: string) => apiRequest<{ network: NetworkSummary }>('/api/controller/networks', {
    method: 'POST', body: { name },
  }),
  patchNetwork: (nwid: string, body: Partial<NetworkSummary>) => apiRequest<NetworkBundle>(networkPath(nwid), {
    method: 'PATCH', body,
  }),
  deleteNetwork: (nwid: string) => apiRequest<{ deleted: boolean }>(networkPath(nwid), { method: 'DELETE' }),
  easySetup: (nwid: string, body: { networkCIDR: string; poolStart: string; poolEnd: string }) =>
    apiRequest<NetworkBundle>(`${networkPath(nwid)}/easy`, { method: 'POST', body }),
  addRoute: (nwid: string, route: NetworkRoute) => apiRequest<NetworkBundle>(`${networkPath(nwid)}/routes`, {
    method: 'POST', body: route,
  }),
  removeRoute: (nwid: string, target: string) => apiRequest<NetworkBundle>(
    `${networkPath(nwid)}/routes?target=${encodeURIComponent(target)}`, { method: 'DELETE' },
  ),
  addPool: (nwid: string, pool: IpPool) => apiRequest<NetworkBundle>(`${networkPath(nwid)}/ip-pools`, {
    method: 'POST', body: pool,
  }),
  removePool: (nwid: string, pool: IpPool) => apiRequest<NetworkBundle>(
    `${networkPath(nwid)}/ip-pools?start=${encodeURIComponent(pool.ipRangeStart)}&end=${encodeURIComponent(pool.ipRangeEnd)}`,
    { method: 'DELETE' },
  ),
  patchMember: (nwid: string, id: string, body: Partial<Member>) => apiRequest<{ member: Member }>(memberPath(nwid, id), {
    method: 'PATCH', body,
  }),
  deleteMember: (nwid: string, id: string) => apiRequest<{ deleted: boolean }>(memberPath(nwid, id), { method: 'DELETE' }),
  addMemberIp: (nwid: string, id: string, ipAddress: string) => apiRequest<NetworkBundle>(`${memberPath(nwid, id)}/ip-assignments`, {
    method: 'POST', body: { ipAddress },
  }),
  removeMemberIp: (nwid: string, id: string, index: number) => apiRequest<NetworkBundle>(
    `${memberPath(nwid, id)}/ip-assignments?index=${index}`, { method: 'DELETE' },
  ),
  saveDns: (nwid: string, dns: NetworkDns) => apiRequest<NetworkBundle>(networkPath(nwid), {
    method: 'PATCH', body: { dns },
  }),
  signedLink: (type: 'download' | 'install', file: string, ttl: number) => apiRequest<SignedLink>(
    `/api/link?${new URLSearchParams({ type, file, ttl: String(ttl) })}`,
  ),
};
