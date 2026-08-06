import { describe, expect, it } from 'vitest';
import {
  defaultPoolForCidr,
  parseIpv4,
  parseIpv4Cidr,
  parseIpv4RouteCidr,
  poolRangeError,
  validateMtu,
} from './network';

describe('network utilities', () => {
  it('normalizes IPv4 CIDRs', () => {
    expect(parseIpv4Cidr('10.147.17.33/24')?.normalized).toBe('10.147.17.0/24');
    expect(parseIpv4RouteCidr('10.0.0.8/8')).toBe('10.0.0.0/8');
    expect(parseIpv4RouteCidr('0.0.0.0/0')).toBe('0.0.0.0/0');
  });

  it('calculates a useful default pool', () => {
    expect(defaultPoolForCidr('10.147.17.0/24')).toEqual({
      cidr: '10.147.17.0/24',
      poolStart: '10.147.17.10',
      poolEnd: '10.147.17.249',
    });
  });

  it('validates pool boundaries', () => {
    expect(poolRangeError('10.0.0.0/24', '10.0.0.10', '10.0.0.20')).toBe('');
    expect(poolRangeError('10.0.0.0/24', '10.0.0.20', '10.0.0.10')).toBe('validation.poolOrder');
    expect(poolRangeError('10.0.0.0/24', '10.0.0.0', '10.0.0.20')).toBe('validation.poolRange');
    expect(parseIpv4('999.1.1.1')).toBeNull();
  });

  it('validates MTU bounds', () => {
    expect(validateMtu('2800')).toBe(2800);
    expect(() => validateMtu('1279')).toThrow('validation.mtu');
    expect(() => validateMtu('abc')).toThrow('validation.mtu');
  });
});
