import { type InputHTMLAttributes, type ReactNode, useState } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  showPasswordToggle?: boolean;
  leadingIcon?: ReactNode;
}

export default function Input({
  label,
  error,
  showPasswordToggle = false,
  leadingIcon,
  type = 'text',
  className = '',
  id,
  ...rest
}: InputProps) {
  const [showPassword, setShowPassword] = useState(false);
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
  const errorId = `${inputId}-error`;
  const resolvedType = showPasswordToggle
    ? showPassword
      ? 'text'
      : 'password'
    : type;

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className="text-xs font-semibold text-slate-700 tracking-wide"
        >
          {label}
        </label>
      )}

      <div className="relative flex items-center">
        {leadingIcon && (
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
            {leadingIcon}
          </div>
        )}

        <input
          id={inputId}
          type={resolvedType}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          className={[
            'w-full rounded-xl border px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 placeholder-slate-400',
            'bg-white focus:outline-none focus:ring-2 focus:ring-sky-100 focus:border-sky-500',
            'transition-all duration-150 shadow-xs',
            error
              ? 'border-rose-400 bg-rose-50/30 focus:ring-rose-100 focus:border-rose-500'
              : 'border-slate-200 hover:border-slate-300',
            leadingIcon ? 'pl-10' : '',
            showPasswordToggle ? 'pr-10' : '',
            className,
          ].join(' ')}
          {...rest}
        />

        {showPasswordToggle && (
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            {showPassword ? (
              <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
              </svg>
            ) : (
              <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            )}
          </button>
        )}
      </div>

      {error && (
        <p id={errorId} role="alert" className="text-xs text-rose-600 font-medium">
          {error}
        </p>
      )}
    </div>
  );
}
