import { AppleOutlined, CheckCircleOutlined, DownloadOutlined, LinuxOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import { Alert, App, Button, Card, Checkbox, Col, Result, Row, Select, Steps } from 'antd';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { consoleApi } from '@/api/console';
import { CodeBlock } from '@/components/common/CodeBlock';
import { ErrorState, LoadingState } from '@/components/common/AsyncState';
import { PageHeader } from '@/components/common/PageHeader';
import { useControllerQuery, useOverviewQuery } from '@/hooks/useConsoleQueries';
import { commandQuote, expiryTime } from '@/utils/format';

interface GeneratedCommand { value: string; expiresAt: Date }

export function DeliveryPage() {
  const { t, i18n } = useTranslation(); const { message } = App.useApp();
  const overview = useOverviewQuery(); const controller = useControllerQuery(); const [step, setStep] = useState(0);
  const [networkId, setNetworkId] = useState(''); const [includeNetwork, setIncludeNetwork] = useState(false); const [ttl, setTtl] = useState(600);
  const [pending, setPending] = useState(''); const [commands, setCommands] = useState<Record<string, GeneratedCommand>>({});
  const networks = useMemo(() => controller.data?.networks || [], [controller.data?.networks]);
  const selected = useMemo(() => networks.find((network) => network.nwid === networkId), [networks, networkId]);
  if (overview.isLoading || controller.isLoading) return <LoadingState rows={12} />;
  if (overview.error || controller.error) return <ErrorState error={overview.error || controller.error} />;
  if (!overview.data?.hasPlanet) return <Result status="warning" title={t('overview.planetMissing')} subTitle={t('delivery.planetCopy')} />;

  const generate = async (kind: 'planet' | 'linux' | 'macos') => {
    setPending(kind);
    try {
      const file = kind === 'planet' ? 'planet' : `${kind}.sh`;
      const link = await consoleApi.signedLink(kind === 'planet' ? 'download' : 'install', file, ttl);
      let value = kind === 'planet' ? `wget -O planet ${commandQuote(link.url)}` : '';
      if (kind === 'linux') value = `curl -fsSL ${commandQuote(link.url)} | ${includeNetwork && networkId ? `sudo env NETWORK_ID=${networkId} bash` : 'sudo bash'}`;
      if (kind === 'macos') value = `curl -fsSL ${commandQuote(link.url)} | ${includeNetwork && networkId ? `NETWORK_ID=${networkId} bash` : 'bash'}`;
      setCommands((current) => ({ ...current, [kind]: { value, expiresAt: expiryTime(link.expiresIn) } }));
      void message.success(t('message.generated'));
    } catch (error) { void message.error(error instanceof Error ? error.message : String(error)); }
    finally { setPending(''); }
  };
  const cards = [
    { key: 'planet', title: t('delivery.planet'), copy: t('delivery.planetCopy'), icon: <DownloadOutlined /> },
    { key: 'linux', title: t('delivery.linux'), copy: t('delivery.linuxCopy'), icon: <LinuxOutlined /> },
    { key: 'macos', title: t('delivery.macos'), copy: t('delivery.macosCopy'), icon: <AppleOutlined /> },
  ] as const;
  return <div className="page-stack"><PageHeader title={t('page.deliveryTitle')} subtitle={t('page.deliverySubtitle')} eyebrow={t('common.delivery')} />
    <Card bordered={false} className="delivery-workflow"><Steps current={step} onChange={setStep} responsive items={[{ title: t('delivery.stepNetwork') }, { title: t('delivery.stepPolicy') }, { title: t('delivery.stepGenerate') }]} />
      <div className="delivery-step-content">
        {step === 0 && <div className="delivery-policy-panel"><SafetyCertificateOutlined /><div><h2>{t('delivery.targetTitle')}</h2><p>{t('delivery.targetCopy')}</p><label>{t('delivery.network')}</label><Select allowClear value={networkId || undefined} onChange={(value) => { setNetworkId(value || ''); if (!value) setIncludeNetwork(false); }} placeholder={t('delivery.interactive')} options={networks.map((network) => ({ value: network.nwid, label: `${network.name || network.nwid} · ${network.nwid}` }))} /><Checkbox checked={includeNetwork} disabled={!networkId} onChange={(event) => setIncludeNetwork(event.target.checked)}>{t('delivery.includeNetwork')}</Checkbox></div></div>}
        {step === 1 && <div className="delivery-policy-panel"><CheckCircleOutlined /><div><h2>{t('delivery.policyTitle')}</h2><p>{t('delivery.policyCopy')}</p><label>{t('delivery.ttl')}</label><Select value={ttl} onChange={(value) => { setTtl(value); setCommands({}); }} options={[{ value: 600, label: t('delivery.ten') }, { value: 1800, label: t('delivery.thirty') }, { value: 3600, label: t('delivery.hour') }]} /></div></div>}
        {step === 2 && <><h2>{t('delivery.commandTitle')}</h2><Alert type="info" showIcon message={selected ? `${selected.name || selected.nwid} · ${includeNetwork ? t('delivery.includeNetwork') : t('delivery.interactive')}` : t('delivery.interactive')} />
          <Row gutter={[16, 16]} className="command-grid">{cards.map((card) => <Col xs={24} xl={8} key={card.key}><Card bordered={false} className="command-card"><div className="command-card-icon">{card.icon}</div><h3>{card.title}</h3><p>{card.copy}</p>
            {commands[card.key] ? <><CodeBlock code={commands[card.key].value} /><small className="expiry-label">{t('delivery.expires', { time: commands[card.key].expiresAt.toLocaleTimeString(i18n.language) })}</small></> : <div className="command-placeholder">{t('delivery.notGenerated')}</div>}
            <Button type="primary" block loading={pending === card.key} onClick={() => void generate(card.key)}>{t('common.generate')}</Button></Card></Col>)}</Row></>}
      </div>
      <div className="delivery-navigation"><Button disabled={step === 0} onClick={() => setStep((value) => value - 1)}>{t('common.back')}</Button>{step < 2 && <Button type="primary" onClick={() => setStep((value) => value + 1)}>{t('common.next')}</Button>}</div>
    </Card>
  </div>;
}
