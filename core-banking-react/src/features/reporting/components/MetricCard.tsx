import React from 'react';

interface MetricCardProps {
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
  icon?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  sub,
  color = '#1E40AF',
  icon,
}) => (
  <div
    style={{
      backgroundColor: '#ffffff',
      borderRadius: '10px',
      padding: '20px 24px',
      border: '1px solid #e2e8f0',
      borderLeft: `4px solid ${color}`,
      boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
      minWidth: '160px',
      flex: '1',
    }}
  >
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '8px',
      }}
    >
      {icon && <span style={{ fontSize: '18px' }}>{icon}</span>}
      <span
        style={{
          fontSize: '12px',
          color: '#64748b',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.4px',
        }}
      >
        {label}
      </span>
    </div>
    <div style={{ fontSize: '28px', fontWeight: 700, color: color }}>
      {value}
    </div>
    {sub && (
      <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
        {sub}
      </div>
    )}
  </div>
);

export default MetricCard;
