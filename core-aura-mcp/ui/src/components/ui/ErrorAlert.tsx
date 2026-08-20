import React from 'react';

type Props = {
  message: string;
  onClose?: () => void;
  className?: string;
};

export default function ErrorAlert({ message, onClose, className = '' }: Props) {
  return (
    <div className={`border-l-4 border-red-500 bg-red-50 text-red-800 p-3 rounded ${className}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="text-sm">{message}</div>
        {onClose ? (
          <button onClick={onClose} aria-label="Cerrar" className="text-red-600 hover:text-red-800">
            ✕
          </button>
        ) : null}
      </div>
    </div>
  );
}
