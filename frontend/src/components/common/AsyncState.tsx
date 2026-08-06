import type { ReactNode } from 'react';
import { Button, Empty, Result, Skeleton } from 'antd';
import { useTranslation } from 'react-i18next';

export function LoadingState({ rows = 5 }: { rows?: number }) {
  return <div className="async-state"><Skeleton active paragraph={{ rows }} /></div>;
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const { t } = useTranslation();
  const message = error instanceof Error ? error.message : String(error || t('common.unavailable'));
  return (
    <Result status="error" title={t('common.unavailable')} subTitle={message}
      extra={onRetry && <Button type="primary" onClick={onRetry}>{t('common.retry')}</Button>} />
  );
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={<div><strong>{title}</strong>{description && <p>{description}</p>}</div>}>{action}</Empty>;
}
