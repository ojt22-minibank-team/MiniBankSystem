import { type ButtonHTMLAttributes, type ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'gold' | 'purple';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  children: ReactNode;
}

const variantClasses: Record<string, string> = {
  primary:
    'bg-[#0284C7] text-white hover:bg-[#0369A1] focus:ring-sky-400 shadow-xs border border-sky-600/20 active:scale-[0.98]',
  gold:
    'bg-[#0284C7] text-white hover:bg-[#0369A1] focus:ring-sky-400 shadow-xs border border-sky-600/20 active:scale-[0.98]',
  purple:
    'bg-[#0284C7] text-white hover:bg-[#0369A1] focus:ring-sky-400 shadow-xs border border-sky-600/20 active:scale-[0.98]',
  secondary:
    'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:border-slate-300 focus:ring-sky-400 shadow-xs active:scale-[0.98]',
  danger:
    'bg-rose-600 text-white hover:bg-rose-700 focus:ring-rose-400 shadow-xs active:scale-[0.98]',
  ghost:
    'bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus:ring-sky-300 disabled:opacity-50',
};

const sizeClasses: Record<string, string> = {
  sm: 'px-3 py-1.5 text-xs rounded-xl',
  md: 'px-4 py-2 text-sm rounded-xl',
  lg: 'px-6 py-2.5 text-base rounded-xl',
};

export default function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled,
  children,
  className = '',
  ...rest
}: ButtonProps) {
  return (
    <button
      disabled={disabled || isLoading}
      className={[
        'inline-flex items-center justify-center gap-2 font-semibold cursor-pointer',
        'transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1',
        'disabled:cursor-not-allowed disabled:opacity-60',
        variantClasses[variant],
        sizeClasses[size],
        className,
      ].join(' ')}
      {...rest}
    >
      {isLoading && (
        <svg
          className="h-4 w-4 animate-spin shrink-0"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      )}
      {children}
    </button>
  );
}
