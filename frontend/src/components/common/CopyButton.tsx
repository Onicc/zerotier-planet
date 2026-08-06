import { CopyOutlined } from '@ant-design/icons';
import { App, Button, type ButtonProps } from 'antd';
import { useTranslation } from 'react-i18next';

export function CopyButton({ text, ...props }: { text: string } & Omit<ButtonProps, 'onClick'>) {
  const { message } = App.useApp();
  const { t } = useTranslation();
  const copy = async () => {
    if (navigator.clipboard && window.isSecureContext) await navigator.clipboard.writeText(text);
    else {
      const input = document.createElement('textarea');
      input.value = text;
      input.style.position = 'fixed';
      input.style.left = '-9999px';
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      input.remove();
    }
    void message.success(t('common.copied'));
  };
  return <Button icon={<CopyOutlined />} {...props} onClick={() => void copy()}>{props.children || t('common.copy')}</Button>;
}
