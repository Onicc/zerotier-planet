export function commandQuote(value: string): string {
  return `'${String(value).replace(/'/g, `'\\''`)}'`;
}

export function formatBytes(value: number): string {
  const bytes = Number(value || 0);
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function memberId(member: { id?: string; address?: string }): string {
  return member.id || member.address || '';
}

export function shortId(value: string, head = 6, tail = 4): string {
  if (value.length <= head + tail + 3) return value;
  return `${value.slice(0, head)}…${value.slice(-tail)}`;
}

export function expiryTime(seconds: number): Date {
  return new Date(Date.now() + seconds * 1000);
}
