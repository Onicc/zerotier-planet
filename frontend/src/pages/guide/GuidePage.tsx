import { CheckCircleOutlined, DownloadOutlined, GlobalOutlined, SafetyCertificateOutlined, ToolOutlined } from '@ant-design/icons';
import { Button, Card, Steps } from 'antd';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { PageHeader } from '@/components/common/PageHeader';

export function GuidePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const items = [
    { key: 'create', icon: <GlobalOutlined />, title: t('guide.create'), copy: t('guide.createCopy'), action: () => navigate('/networks') },
    { key: 'deliver', icon: <DownloadOutlined />, title: t('guide.deliver'), copy: t('guide.deliverCopy'), action: () => navigate('/delivery') },
    { key: 'install', icon: <ToolOutlined />, title: t('guide.install'), copy: t('guide.installCopy') },
    { key: 'authorize', icon: <SafetyCertificateOutlined />, title: t('guide.authorize'), copy: t('guide.authorizeCopy'), action: () => navigate('/networks') },
    { key: 'troubleshoot', icon: <CheckCircleOutlined />, title: t('guide.troubleshoot'), copy: t('guide.troubleshootCopy'), action: () => navigate('/overview') },
  ];
  return <div className="page-stack"><PageHeader title={t('page.guideTitle')} subtitle={t('page.guideSubtitle')} eyebrow={t('common.guide')} />
    <Card bordered={false} className="guide-progress"><Steps current={-1} responsive items={items.map((item) => ({ title: item.title.replace(/^\d+\.\s*/, '') }))} /></Card>
    <div className="guide-grid">{items.map((item) => <Card bordered={false} className="guide-card" key={item.key}><span className="guide-icon">{item.icon}</span><div className="guide-card-copy"><h2>{item.title}</h2><p>{item.copy}</p>{item.action && <Button type="primary" ghost onClick={item.action}>{t('common.details')}</Button>}</div></Card>)}</div>
    <Card bordered={false} className="troubleshooting-list"><div className="troubleshooting-head"><CheckCircleOutlined /><div><h2>{t('guide.troubleshoot')}</h2><p>{t('guide.troubleshootCopy')}</p></div></div><ul><li>9994/TCP & UDP</li><li><code>zerotier-cli peers</code></li><li><code>zerotier-cli listnetworks</code></li><li>Planet → Network ID → Authorization → Routes → Pools</li></ul></Card>
  </div>;
}
