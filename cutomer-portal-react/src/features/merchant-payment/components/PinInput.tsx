import type { UseFormRegister, FieldErrors, Path } from 'react-hook-form';

interface PinFormValues {
  transactionPin: string;
}

interface Props<T extends PinFormValues = PinFormValues> {
  register: UseFormRegister<T>;
  errors: FieldErrors<T>;
  disabled: boolean;
}

export const PinInput = <T extends PinFormValues>({ register, errors, disabled }: Props<T>) => {
  return (
    <div className="mb-6 text-left">
      <label className="block text-sm font-semibold text-gray-700 mb-2">Transaction PIN</label>
      <input 
        type="password" 
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
        disabled={disabled}
        {...register("transactionPin" as Path<T>)}
        className={`w-full py-4 px-4 border bg-gray-50 focus:bg-white rounded-lg text-center text-3xl tracking-[0.7em] outline-none transition-all font-mono ${
          errors.transactionPin ? 'border-red-500 focus:ring-2 focus:ring-red-500' : 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        placeholder="••••••"
      />
      {errors.transactionPin && (
        <p className="mt-2 text-sm text-red-600 font-medium">{errors.transactionPin.message as string}</p>
      )}
    </div>
  );
};
