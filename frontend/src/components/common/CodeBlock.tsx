import { CopyButton } from './CopyButton';

export function CodeBlock({ code, label }: { code: string; label?: string }) {
  return (
    <div className="code-block">
      <div className="code-block-head">
        <span>{label || 'Shell'}</span>
        <CopyButton text={code} size="small" type="text" />
      </div>
      <pre tabIndex={0}><code>{code}</code></pre>
    </div>
  );
}
