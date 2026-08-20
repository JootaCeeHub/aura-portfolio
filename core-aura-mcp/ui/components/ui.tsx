import React from 'react';

function cn(...classes: Array<string | undefined | null | false>) {
  return classes.filter(Boolean).join(' ');
}

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline';
  size?: 'xs' | 'sm' | 'md' | 'lg';
};

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  className,
  ...props
}) => {
  const base = 'inline-flex items-center justify-center rounded-lg font-medium transition-colors';
  const sizes =
    size === 'xs'
      ? 'px-2 py-1 text-xs'
      : size === 'sm'
        ? 'px-3 py-1.5 text-sm'
        : size === 'lg'
          ? 'px-6 py-3 text-base'
          : 'px-4 py-2 text-sm';
  const variants =
    variant === 'primary'
      ? 'btn btn-primary'
      : variant === 'secondary'
        ? 'btn btn-secondary'
        : variant === 'ghost'
          ? 'btn btn-ghost'
          : 'btn btn-outline';
  return <button {...props} className={cn(base, variants, sizes, className)} />;
};

type InputProps = React.InputHTMLAttributes<HTMLInputElement>;
export const Input: React.FC<InputProps> = ({ className, ...props }) => {
  const base = 'input w-full';
  return <input {...props} className={cn(base, className)} />;
};

export const StatusDot: React.FC<{
  color?: 'success' | 'warning' | 'error' | 'neutral';
  pulse?: boolean;
  className?: string;
}> = ({ color = 'neutral', pulse = false, className }) => {
  const colorClass =
    color === 'success'
      ? 'bg-success'
      : color === 'warning'
        ? 'bg-warning'
        : color === 'error'
          ? 'bg-error'
          : 'bg-neutral-600';
  return (
    <div className={cn('w-2 h-2 rounded-full', colorClass, pulse && 'animate-pulse', className)} />
  );
};

export const PanelHeader: React.FC<{
  icon?: string;
  title: string;
  right?: React.ReactNode;
  className?: string;
}> = ({ icon, title, right, className }) => (
  <div className={cn('flex items-center justify-between mb-6', className)}>
    <h2 className="text-lg font-display font-bold text-white flex items-center gap-3">
      {icon && <span className="text-2xl">{icon}</span>}
      {title}
    </h2>
    {right}
  </div>
);

export const Badge: React.FC<{
  color?: 'accent' | 'primary' | 'success' | 'warning';
  children: React.ReactNode;
  className?: string;
}> = ({ color = 'accent', children, className }) => {
  const colorMap = {
    accent: 'text-accent-400',
    primary: 'text-primary-400',
    success: 'text-success',
    warning: 'text-warning',
  } as const;
  return <span className={cn('text-xs font-bold', colorMap[color], className)}>{children}</span>;
};
