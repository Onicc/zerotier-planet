export type Language = 'en' | 'zh-CN';
export type ThemeMode = 'light' | 'dark' | 'system';

export interface AuthState {
  username: string;
  authenticated: boolean;
  mustChangePassword: boolean;
  passwordChangeRequired?: boolean;
  sessionTtlSeconds: number;
}

export interface PublicStatus {
  service: string;
  fileServerPort: string;
  publicUrl: string;
  integratedController: boolean;
  auth: AuthState;
}

export interface DownloadableFile {
  name: string;
  type: string;
  size: number;
  updatedAt?: string;
}

export interface Overview {
  service: string;
  publicUrl: string;
  zeroTierPort: string;
  fileServerPort: string;
  linkTtlSeconds: number;
  maxLinkTtlSeconds?: number;
  hasPlanet: boolean;
  files: DownloadableFile[];
}

export interface ControllerInfo {
  address: string;
  online: boolean;
  tcpFallbackActive?: boolean;
  version?: string;
}

export interface NetworkRoute {
  target: string;
  via: string | null;
}

export interface IpPool {
  ipRangeStart: string;
  ipRangeEnd: string;
}

export interface NetworkDns {
  domain: string;
  servers: string[];
}

export interface NetworkSummary {
  nwid: string;
  id?: string;
  name: string;
  private: boolean;
  mtu?: number;
  memberCount?: number;
  authorizedMemberCount?: number;
  routes?: NetworkRoute[];
  ipAssignmentPools?: IpPool[];
  v4AssignMode?: { zt?: boolean };
  v6AssignMode?: { '6plane'?: boolean; rfc4193?: boolean; zt?: boolean };
  dns?: NetworkDns;
  [key: string]: unknown;
}

export interface PeerInfo {
  latency?: number;
}

export type PeerState = 'controller' | 'online' | 'relay' | 'offline' | 'error';

export interface Member {
  id?: string;
  address?: string;
  name?: string;
  authorized?: boolean;
  activeBridge?: boolean;
  noAutoAssign?: boolean;
  peerState?: PeerState;
  peer?: PeerInfo | null;
  ipAssignments?: string[];
  error?: string;
  [key: string]: unknown;
}

export interface NetworkProfile {
  managedRouteTarget?: string;
  managedPoolStart?: string;
  managedPoolEnd?: string;
  updatedAt?: string;
}

export interface NetworkBundle {
  network: NetworkSummary;
  members: Member[];
  controller: ControllerInfo;
  profile: NetworkProfile;
}

export interface ControllerStatus {
  status: ControllerInfo;
  networks: NetworkSummary[];
  controllerPort: string;
}

export interface AuthSessionPayload {
  token: string;
  username: string;
  mustChangePassword: boolean;
  sessionTtlSeconds: number;
}

export interface SignedLink {
  path: string;
  url: string;
  expiresIn: number;
  file: string;
}
