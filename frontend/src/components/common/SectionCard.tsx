import type { ReactNode } from 'react';
import { Card } from 'antd';

interface SectionCardProps {
  title?: ReactNode;
  extra?: ReactNode;
  children: ReactNode;
  className?: string;
  compact?: boolean;
  fill?: boolean;
}

export function SectionCard({ title, extra, children, className = '', compact = false, fill = false }: SectionCardProps) {
  const classes = ['section-card', compact && 'section-card-compact', fill && 'section-card-fill', className].filter(Boolean).join(' ');
  return <Card className={classes} title={title} extra={extra} bordered={false}>{children}</Card>;
}
