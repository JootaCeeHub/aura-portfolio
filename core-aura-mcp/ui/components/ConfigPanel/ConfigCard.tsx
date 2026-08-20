import React from 'react';

interface ConfigCardProps {
  icon: string;
  title: string;
  description?: string;
  children: React.ReactNode;
  status?: 'ok' | 'warning' | 'error' | 'experimental';
}

const statusColors = {
  ok: 'border-success/20 bg-success/5',
  warning: 'border-warning/20 bg-warning/5',
  error: 'border-error/20 bg-error/5',
  experimental: 'border-accent-500/20 bg-accent-500/5',
};

const statusIcons = {
  ok: '✓',
  warning: '⚠️',
  error: '✕',
  experimental: '🔬',
};

export function ConfigCard({
  icon,
  title,
  description,
  children,
  status = 'ok',
}: ConfigCardProps) {
  return (
    <div className={`p-4 rounded-lg border ${statusColors[status]} transition-all`}>
      <div className="flex items-start gap-3 mb-4">
        <span className="text-2xl">{icon}</span>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-bold text-neutral-100">{title}</h4>
            {status !== 'ok' && (
              <span className="text-xs text-neutral-400">{statusIcons[status]}</span>
            )}
          </div>
          {description && <p className="text-xs text-neutral-400 mt-1">{description}</p>}
        </div>
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}
