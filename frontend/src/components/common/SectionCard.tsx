import type { ReactNode } from 'react';
import { Card } from 'antd';

export function SectionCard({ title, extra, children, className = '' }: { title?: ReactNode; extra?: ReactNode; children: ReactNode; className?: string }) {
  return <Card className={`section-card ${className}`} title={title} extra={extra} bordered={false}>{children}</Card>;
}
