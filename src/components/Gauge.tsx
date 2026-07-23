export function Gauge({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{
        position: 'relative', width: 40, height: 40, borderRadius: '50%', margin: '0 auto 4px',
        background: `conic-gradient(${color} 0 ${value}%, var(--inset) 0)`,
      }}>
        <div style={{ position: 'absolute', inset: 5, borderRadius: '50%', background: 'var(--panel)' }} />
        <b style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', fontSize: 10, color }}>{value}</b>
      </div>
      <span style={{ fontSize: 9, letterSpacing: '.08em', color: 'var(--dim)', textTransform: 'uppercase' }}>{label}</span>
    </div>
  );
}
