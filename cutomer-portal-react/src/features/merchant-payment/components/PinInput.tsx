import React, { useState, useRef, useEffect } from 'react';
import type { UseFormRegister, FieldErrors, UseFormSetValue, Path } from 'react-hook-form';
import { ShieldCheck, Eye, EyeOff } from 'lucide-react';

interface PinFormValues {
  transactionPin: string;
}

interface Props<T extends PinFormValues = PinFormValues> {
  register: UseFormRegister<T>;
  errors: FieldErrors<T>;
  disabled?: boolean;
  setValue?: UseFormSetValue<T>;
}

export const PinInput = <T extends PinFormValues>({ 
  register, 
  errors, 
  disabled = false, 
  setValue 
}: Props<T>) => {
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [showPin, setShowPin] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Keep hidden react-hook-form input synchronized
  useEffect(() => {
    const pinStr = digits.join('');
    if (setValue) {
      setValue('transactionPin' as Path<T>, pinStr as any, { 
        shouldValidate: pinStr.length === 6 
      });
    }
  }, [digits, setValue]);

  const handleChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value.replace(/\D/g, '');
    if (!rawVal) {
      const newDigits = [...digits];
      newDigits[index] = '';
      setDigits(newDigits);
      return;
    }

    const lastChar = rawVal.slice(-1);
    const newDigits = [...digits];
    newDigits[index] = lastChar;
    setDigits(newDigits);

    // Auto-advance to next box
    if (index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!digits[index] && index > 0) {
        // Move to previous box and clear it
        const newDigits = [...digits];
        newDigits[index - 1] = '';
        setDigits(newDigits);
        inputRefs.current[index - 1]?.focus();
      } else {
        const newDigits = [...digits];
        newDigits[index] = '';
        setDigits(newDigits);
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault();
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      e.preventDefault();
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pastedData) return;

    const newDigits = [...digits];
    for (let i = 0; i < 6; i++) {
      newDigits[i] = pastedData[i] || '';
    }
    setDigits(newDigits);

    // Focus last filled or 6th box
    const nextFocus = Math.min(pastedData.length, 5);
    inputRefs.current[nextFocus]?.focus();
  };

  return (
    <div className="mb-6 text-left">
      {/* Header with Title and Show/Hide toggle */}
      <div className="flex items-center justify-between mb-3">
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
          Transaction PIN
        </label>
        <button
          type="button"
          onClick={() => setShowPin(!showPin)}
          disabled={disabled}
          className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors cursor-pointer select-none"
        >
          {showPin ? (
            <>
              <EyeOff size={14} className="text-slate-400" />
              <span>Hide PIN</span>
            </>
          ) : (
            <>
              <Eye size={14} className="text-slate-400" />
              <span>Show PIN</span>
            </>
          )}
        </button>
      </div>

      {/* Hidden input to ensure react-hook-form registration */}
      <input 
        type="hidden" 
        {...register('transactionPin' as Path<T>)} 
        value={digits.join('')} 
      />

      {/* 6 Clean Individual PIN Boxes [ ∙ ][ ∙ ][ ∙ ][ ∙ ][ ∙ ][ ∙ ] */}
      <div className="flex justify-between sm:justify-center items-center gap-2 sm:gap-3 py-1">
        {digits.map((digit, index) => (
          <input
            key={index}
            ref={(el) => { inputRefs.current[index] = el; }}
            type={showPin ? "text" : "password"}
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={1}
            autoComplete="one-time-code"
            disabled={disabled}
            value={digit}
            onChange={(e) => handleChange(index, e)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onPaste={handlePaste}
            onFocus={(e) => e.target.select()}
            className={`w-11 h-12 sm:w-12 sm:h-14 text-center text-2xl font-bold font-mono rounded-xl border-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none transition-all shadow-xs ${
              errors.transactionPin 
                ? 'border-red-400 bg-red-50/20 text-red-900 dark:border-red-500 focus:border-red-500 focus:ring-4 focus:ring-red-100 dark:focus:ring-red-950/40' 
                : digit
                  ? 'border-[#00A3C4] bg-cyan-50/30 dark:bg-cyan-950/30 text-[#0A192F] dark:text-cyan-200 focus:border-[#00A3C4] focus:ring-4 focus:ring-cyan-100 dark:focus:ring-cyan-900/40'
                  : 'border-slate-200 dark:border-slate-700 focus:border-[#00A3C4] focus:ring-4 focus:ring-cyan-100 dark:focus:ring-cyan-900/40 hover:border-slate-300 dark:hover:border-slate-600'
            } ${disabled ? 'opacity-50 cursor-not-allowed bg-slate-100 dark:bg-slate-800' : ''}`}
            placeholder="•"
          />
        ))}
      </div>

      {/* Inline Validation Error Message */}
      {errors.transactionPin && (
        <p className="mt-2.5 text-xs font-semibold text-red-600 dark:text-red-400 text-center animate-in fade-in">
          {errors.transactionPin.message as string}
        </p>
      )}

      {/* Security Reassurance Callout */}
      <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500 pt-3">
        <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
        <span>Secured with 256-bit bank-grade encryption</span>
      </div>
    </div>
  );
};
