import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'indigo';
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'md',
}) => {
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  const variantClasses = {
    success: 'bg-emerald-50 text-emerald-700 border border-emerald-200/80',
    warning: 'bg-amber-50 text-amber-700 border border-amber-200/80',
    danger: 'bg-rose-50 text-rose-700 border border-rose-200/80',
    info: 'bg-blue-50 text-blue-700 border border-blue-200/80',
    indigo: 'bg-indigo-50 text-indigo-700 border border-indigo-200/80',
    neutral: 'bg-slate-100 text-slate-700 border border-slate-200/80',
  }[variant];

  return (
    <span
      className={`inline-flex items-center font-semibold rounded-full tracking-wide transition-all ${sizeClasses} ${variantClasses}`}
    >
      {children}
    </span>
  );
};

export const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const norm = (status || '').toUpperCase();
  if (norm === 'ACTIVE' || norm === 'VERIFIED') {
    return <Badge variant="success">● {norm}</Badge>;
  }
  if (norm === 'FROZEN' || norm === 'SUSPENDED' || norm === 'PENDING') {
    return <Badge variant="warning">● {norm}</Badge>;
  }
  if (norm === 'CLOSED' || norm === 'REJECTED' || norm === 'DORMANT') {
    return <Badge variant="danger">● {norm}</Badge>;
  }
  return <Badge variant="neutral">{norm || 'UNKNOWN'}</Badge>;
};

export const CustomerTypeBadge: React.FC<{ type: string }> = ({ type }) => {
  const norm = (type || '').toUpperCase();
  if (norm === 'COMPANY' || norm === 'CORPORATE') {
    return <Badge variant="indigo">🏢 COMPANY</Badge>;
  }
  return <Badge variant="info">👤 INDIVIDUAL</Badge>;
};
