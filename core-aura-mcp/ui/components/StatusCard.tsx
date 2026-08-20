import React from 'react';

interface Props {
  title: string;
  items: { name: string; status: string; details?: string }[];
}

export function StatusCard({ title, items }: Props) {
  return (
    <div className="glass-panel rounded-xl p-5 relative overflow-hidden group hover:border-accent-500/30 transition-colors duration-500">
      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
        <div className="w-24 h-24 bg-accent-500 blur-3xl rounded-full" />
      </div>

      <div className="title-sm mb-4 flex items-center gap-2">
        <div className="w-1 h-4 bg-accent-500 rounded-full" />
        {title}
      </div>

      <div className="grid grid-cols-1 gap-3">
        {items.map((i) => {
          const isOk = i.status === 'OK' || i.status === 'UP';
          const isDown = i.status === 'DOWN';

          return (
            <div
              key={i.name}
              className="flex items-center justify-between text-sm p-2 rounded-lg hover:bg-white/5 transition-colors"
            >
              <span className="text-neutral-300 font-medium">{i.name}</span>
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs font-bold tracking-wider ${
                    isOk ? 'text-success' : isDown ? 'text-error' : 'text-warning'
                  }`}
                >
                  {i.status}
                </span>
                <div
                  className={`w-2 h-2 rounded-full shadow-[0_0_8px_currentColor] ${
                    isOk
                      ? 'bg-success text-success'
                      : isDown
                        ? 'bg-error text-error'
                        : 'bg-warning text-warning'
                  } ${isOk ? 'animate-pulse' : ''}`}
                />
              </div>
            </div>
          );
        })}

        {items.length === 0 && (
          <div className="text-xs text-neutral-600 italic text-center py-2">
            Sin servicios monitoreados
          </div>
        )}
      </div>
    </div>
  );
}
