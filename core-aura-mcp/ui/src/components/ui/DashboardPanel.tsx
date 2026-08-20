import React from 'react';
import type { CoreStatus } from '../../services/mcpCoreClient';
import StatusIndicator from './StatusIndicator';
import LoadingSpinner from './LoadingSpinner';
import ErrorAlert from './ErrorAlert';

type Props = {
  status: CoreStatus | null;
  connectionError?: string | null;
  loading?: boolean;
};

export default function DashboardPanel({ status, connectionError = null, loading = false }: Props) {
  const state = loading
    ? 'loading'
    : status
      ? 'connected'
      : status === null
        ? 'loading'
        : 'disconnected';

  return (
    <div className="p-4 bg-white shadow rounded">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold">Core Status</h3>
        {loading ? (
          <LoadingSpinner />
        ) : (
          <StatusIndicator state={state as any} message={connectionError ?? 'AURA Core'} />
        )}
      </div>

      {connectionError ? (
        <div className="mb-3">
          <ErrorAlert message={connectionError} />
        </div>
      ) : null}

      {status ? (
        <ul className="text-sm space-y-1">
          <li>
            Status: <strong>{status.status}</strong>
          </li>
          <li>
            Uptime: <strong>{status.uptime ?? 'n/a'}</strong>
          </li>
          <li>
            Timestamp: <small>{status.timestamp}</small>
          </li>
        </ul>
      ) : (
        <div className="text-sm text-gray-500">No status available</div>
      )}
    </div>
  );
}
