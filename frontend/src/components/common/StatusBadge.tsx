import { Badge, Tag } from 'antd';

interface StatusBadgeProps {
  label: string;
  tone?: 'success' | 'warning' | 'error' | 'default' | 'processing';
  dot?: boolean;
}

export function StatusBadge({ label, tone = 'default', dot = false }: StatusBadgeProps) {
  if (dot) return <Badge status={tone === 'error' ? 'error' : tone} text={label} />;
  const color = tone === 'success' ? 'green' : tone === 'warning' ? 'gold' : tone === 'error' ? 'red' : tone === 'processing' ? 'blue' : 'default';
  return <Tag color={color}>{label}</Tag>;
}
