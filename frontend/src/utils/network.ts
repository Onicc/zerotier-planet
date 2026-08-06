export interface ParsedIpv4Cidr {
  network: number;
  broadcast: number;
  prefix: number;
  normalized: string;
}

export interface DefaultPool {
  cidr: string;
  poolStart: string;
  poolEnd: string;
}

export const MTU_MIN = 1280;
export const MTU_MAX = 10000;
export const FALLBACK_CIDR = '10.147.17.0/24';

export function parseIpv4(value: string): number | null {
  const parts = String(value || '').trim().split('.');
  if (parts.length !== 4) return null;
  let parsed = 0;
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return null;
    const number = Number(part);
    if (number < 0 || number > 255) return null;
    parsed = (parsed << 8) + number;
  }
  return parsed >>> 0;
}

export function formatIpv4(value: number): string {
  return [
    (value >>> 24) & 255,
    (value >>> 16) & 255,
    (value >>> 8) & 255,
    value & 255,
  ].join('.');
}

export function parseIpv4Cidr(cidr: string): ParsedIpv4Cidr | null {
  const [address, prefixText] = String(cidr || '').trim().split('/');
  const prefix = Number(prefixText);
  const ip = parseIpv4(address);
  if (ip === null || !Number.isInteger(prefix) || prefix < 1 || prefix > 30) return null;
  const mask = (0xffffffff << (32 - prefix)) >>> 0;
  const network = (ip & mask) >>> 0;
  const broadcast = (network | (~mask >>> 0)) >>> 0;
  return { network, broadcast, prefix, normalized: `${formatIpv4(network)}/${prefix}` };
}

export function parseIpv4RouteCidr(cidr: string): string | null {
  const [address, prefixText] = String(cidr || '').trim().split('/');
  const prefix = Number(prefixText);
  const ip = parseIpv4(address);
  if (ip === null || !Number.isInteger(prefix) || prefix < 0 || prefix > 32) return null;
  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  return `${formatIpv4((ip & mask) >>> 0)}/${prefix}`;
}

export function defaultPoolForCidr(cidr: string): DefaultPool | null {
  const parsed = parseIpv4Cidr(cidr);
  if (!parsed) return null;
  const usableStart = parsed.network + 1;
  const usableEnd = parsed.broadcast - 1;
  if (usableEnd < usableStart) return null;
  const usableCount = usableEnd - usableStart + 1;
  const start = usableCount <= 16 ? usableStart : usableStart + 9;
  const end = usableCount <= 16 ? usableEnd : usableEnd - 5;
  return {
    cidr: parsed.normalized,
    poolStart: formatIpv4(start >>> 0),
    poolEnd: formatIpv4(end >>> 0),
  };
}

export function poolRangeError(cidr: string, poolStart: string, poolEnd: string): string {
  const parsed = parseIpv4Cidr(cidr);
  const start = parseIpv4(poolStart);
  const end = parseIpv4(poolEnd);
  if (!parsed || start === null || end === null) return 'validation.poolIp';
  if (start > end) return 'validation.poolOrder';
  if (start <= parsed.network || end >= parsed.broadcast) return 'validation.poolRange';
  return '';
}

export function isLikelyIpAddress(value: string): boolean {
  const normalized = value.trim();
  if (parseIpv4(normalized) !== null) return true;
  if (!normalized.includes(':')) return false;
  try {
    new URL(`http://[${normalized}]/`);
    return true;
  } catch {
    return false;
  }
}

export function validateMtu(value: unknown): number {
  const raw = String(value ?? '').trim();
  if (!/^\d+$/.test(raw)) throw new Error('validation.mtu');
  const mtu = Number(raw);
  if (!Number.isInteger(mtu) || mtu < MTU_MIN || mtu > MTU_MAX) throw new Error('validation.mtu');
  return mtu;
}
