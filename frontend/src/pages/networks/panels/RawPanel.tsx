import { useTranslation } from 'react-i18next';
import { CodeBlock } from '@/components/common/CodeBlock';
import { SectionCard } from '@/components/common/SectionCard';
import type { NetworkBundle } from '@/types/api';

export function RawPanel({ bundle }: { bundle: NetworkBundle }) {
  const { t } = useTranslation(); const code = JSON.stringify(bundle.network, null, 2);
  return <SectionCard className="raw-card" title={t('networks.rawTitle')}><CodeBlock code={code} label="JSON" /></SectionCard>;
}
