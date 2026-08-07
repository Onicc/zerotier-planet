import type { ReactNode } from 'react';
import { Card } from 'antd';

interface StatCardProps {
  label: string;
  value: ReactNode;
  icon: ReactNode;
  tone?: 'default' | 'success' | 'warning' | 'danger';
  detail?: ReactNode;
  compact?: boolean;
}

export function StatCard({ label, value, icon, tone = 'default', detail, compact = true }: StatCardProps) {
  return (
    <Card className={`stat-card stat-${tone}${compact ? ' stat-card-compact' : ''}`} bordered={false}>
      <div className="stat-icon" aria-hidden="true">{icon}</div>
      <div className="stat-copy">
        <span>{label}</span>
        <strong>{value}</strong>
        {detail && <small>{detail}</small>}
      </div>
    </Card>
  );
}
