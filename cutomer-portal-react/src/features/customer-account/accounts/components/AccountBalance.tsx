interface AccountBalanceProps {
  label: string;
  amount: number;
  currency: string;
  className?: string;
}

export default function AccountBalance({
  label,
  amount,
  currency,
  className = "",
}: AccountBalanceProps) {
  const formattedAmount = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);

  return (
    <div className={className}>
      <p className="text-sm font-medium text-slate-500">{label}</p>

      <p className="mt-1 break-words text-2xl font-bold tracking-tight text-[#172033]">
        {formattedAmount}{" "}
        <span className="text-base font-semibold text-slate-500">
          {currency}
        </span>
      </p>
    </div>
  );
}