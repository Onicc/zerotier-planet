interface SparklineProps {
  values: number[];
  label: string;
  color?: string;
}

export function Sparkline({ values, label, color = '#2563eb' }: SparklineProps) {
  if (values.length < 2) return <div className="sparkline-empty">—</div>;
  const width = 320;
  const height = 92;
  const padding = 7;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const points = values.map((value, index) => {
    const x = padding + (index / (values.length - 1)) * (width - padding * 2);
    const y = height - padding - ((value - min) / range) * (height - padding * 2);
    return `${x},${y}`;
  }).join(' ');
  return (
    <figure className="sparkline" aria-label={`${label}: ${values.join(', ')}`}>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label}>
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} className="sparkline-axis" />
        <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {values.map((value, index) => {
          const [x, y] = points.split(' ')[index].split(',');
          return <circle key={`${index}-${value}`} cx={x} cy={y} r="4" fill={color}><title>{value}</title></circle>;
        })}
      </svg>
      <figcaption>{label}</figcaption>
    </figure>
  );
}
