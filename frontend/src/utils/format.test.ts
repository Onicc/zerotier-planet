import { describe, expect, it } from 'vitest';
import { commandQuote, formatBytes } from './format';

describe('format utilities', () => {
  it('quotes shell values safely', () => {
    expect(commandQuote("https://example.test/a'b")).toBe("'https://example.test/a'\\''b'");
  });

  it('formats file sizes', () => {
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(1536)).toBe('1.5 KB');
  });
});
