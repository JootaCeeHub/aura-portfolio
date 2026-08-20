import React from 'react';

export type StatusState = 'connected' | 'disconnected' | 'error' | 'loading';

type Props = {
  state: StatusState;
  message?: string;
  className?: string;
};

export default function StatusIndicator({ state, message, className = '' }: Props) {
  const colors: Record<StatusState, string> = {
    connected: 'bg-green-100 text-green-800',
    disconnected: 'bg-gray-100 text-gray-700',
    error: 'bg-red-100 text-red-800',
    loading: 'bg-yellow-100 text-yellow-800',
  };

  const icons: Record<StatusState, string> = {
    connected: '●',
    disconnected: '○',
    error: '✕',
    loading: '⟳',
  };

  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1 rounded ${colors[state]} ${className}`}
    >
      <span className="text-sm font-mono">{icons[state]}</span>
      <span className="text-sm">{message ?? state}</span>
    </div>
  );
}
