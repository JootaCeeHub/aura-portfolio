import React from 'react';

type StatusType = 'ok' | 'executing' | 'warning' | 'error' | 'idle';

type Props = {
	status: StatusType;
	animated?: boolean;
	tooltip?: string;
};

export default function StatusDot({ status, animated = false, tooltip }: Props) {
	const baseClasses = 'inline-block w-3 h-3 rounded-full';

	const statusClasses: Record<StatusType, string> = {
		ok: 'bg-green-500',
		executing: 'bg-blue-500',
		warning: 'bg-yellow-500',
		error: 'bg-red-500',
		idle: 'bg-gray-500',
	};

	const animatedClass = animated && (status === 'executing' || status === 'warning') ? 'animate-pulse' : '';

	return (
		<span
			className={`${baseClasses} ${statusClasses[status]} ${animatedClass}`}
			title={tooltip}
		/>
	);
}
