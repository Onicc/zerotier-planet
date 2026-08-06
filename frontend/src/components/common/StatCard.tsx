import type { ReactNode } from 'react';
import { Card } from 'antd';

interface StatCardProps {
  label: string;
  value: ReactNode;
  icon: ReactNode;
  tone?: 'default' | 'success' | 'warning' | 'danger';
  detail?: ReactNode;
}

export function StatCard({ label, value, icon, tone = 'default', detail }: StatCardProps) {
  return (
    <Card className={`stat-card stat-${tone}`} bordered={false}>
      <div className="stat-icon" aria-hidden="true">{icon}</div>
      <div className="stat-copy">
        <span>{label}</span>
        <strong>{value}</strong>
        {detail && <small>{detail}</small>}
      </div>
    </Card>
  );
}
