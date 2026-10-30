import { Link } from "react-router-dom";
import {
  Eye,
  EyeOff,
  ArrowUpRight,
  Receipt,
  Sun,
  Sunrise,
  Moon,
} from "lucide-react";
import { CrownEmbossedWatermark } from "../../../../components/common/EkarajLogo";

interface TotalBalanceCardProps {
  totalBalance: number;
  accountCount: number;
  showBalance: boolean;
  loading?: boolean;
  onToggleBalance: () => void;
  customerName?: string;
  primaryAccountNumber?: string;
}

function formatBalance(amount: number): string {
  return amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function getTimeGreetingDetails(): {
  greeting: string;
  Icon: typeof Sun;
  iconClass: string;
  bgGlow: string;
} {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) {
    return {
      greeting: "Good Morning",
      Icon: Sunrise,
      iconClass: "text-amber-300",
      bgGlow: "bg-amber-400/20 ring-amber-400/30",
    };
  }
  if (hour >= 12 && hour < 17) {
    return {
      greeting: "Good Afternoon",
      Icon: Sun,
      iconClass: "text-amber-400",
      bgGlow: "bg-amber-400/20 ring-amber-400/30",
    };
  }
  return {
    greeting: "Good Evening",
    Icon: Moon,
    iconClass: "text-cyan-300",
    bgGlow: "bg-cyan-400/20 ring-cyan-400/30",
  };
}

export default function TotalBalanceCard({
  totalBalance,
  accountCount,
  showBalance,
  loading = false,
  onToggleBalance,
  customerName,
}: TotalBalanceCardProps) {
  const displayName = customerName?.trim() || "Customer";
  const { greeting, Icon, iconClass, bgGlow } = getTimeGreetingDetails();

  return (
    <section
      aria-label="Total Available Balance"
      className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0A192F] via-[#102A54] to-[#153564] p-5 sm:p-6 text-white shadow-lg border border-cyan-500/20"
    >
      {/* 1. Subtle Ambient Lighting & Watermark */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-16 -top-16 h-60 w-60 rounded-full bg-cyan-400/15 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-20 -left-10 h-52 w-52 rounded-full bg-blue-600/15 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute right-3 bottom-1 opacity-10 select-none"
      >
        <CrownEmbossedWatermark theme="navy" className="w-36 h-36" />
      </div>

      <div className="relative z-10 space-y-4">
        {/* ROW 1: Sleek Greeting with Dynamic Time Icon (☀️ / 🌙) */}
        <div className="flex items-center gap-2.5">
          <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${bgGlow} ring-1 shadow-xs`}>
            <Icon size={17} className={iconClass} />
          </div>
          <h2 className="text-base sm:text-lg font-bold tracking-tight text-white">
            {greeting}, <span className="font-extrabold text-cyan-200">{displayName}</span>
          </h2>
        </div>

        {/* ROW 2: Total Available Balance (Compact & User-Friendly) */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-cyan-300">
              Total Available Balance
            </span>
            <button
              type="button"
              onClick={onToggleBalance}
              disabled={loading}
              className="inline-flex items-center justify-center rounded-lg p-1 text-slate-300 transition hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-cyan-300/30"
              title={showBalance ? "Hide Balance" : "Show Balance"}
              aria-label={showBalance ? "Hide Balance" : "Show Balance"}
            >
              {showBalance ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>

            {accountCount > 0 && (
              <span className="hidden sm:inline-flex items-center rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] font-semibold text-slate-300 border border-white/10">
                Across {accountCount} {accountCount === 1 ? "Account" : "Accounts"}
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-baseline gap-2 pt-0.5">
            <span className="font-mono text-base sm:text-lg font-bold text-cyan-200">
              MMK
            </span>
            <div className="font-mono text-2xl sm:text-3xl font-extrabold tracking-tight text-white drop-shadow-xs">
              {loading ? (
                <span className="inline-block h-8 w-40 animate-pulse rounded-lg bg-white/15 align-middle" />
              ) : showBalance ? (
                formatBalance(totalBalance)
              ) : (
                <span className="tracking-widest text-slate-300/80">
                  ********
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ROW 3: Quick Action Buttons (Transfer & Pay only, hover-activated color) */}
        <div className="flex flex-wrap items-center gap-2.5 pt-1">
          {/* Transfer */}
          <Link
            to="/transfer"
            className="group inline-flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-xs sm:text-sm font-bold text-white shadow-xs backdrop-blur-md transition-all duration-200 hover:border-[#00A3C4] hover:bg-[#00A3C4] hover:shadow-md hover:shadow-cyan-500/25 active:scale-95"
          >
            <ArrowUpRight
              size={15}
              strokeWidth={2.4}
              className="text-cyan-300 transition-colors duration-200 group-hover:text-white"
            />
            <span>Transfer</span>
          </Link>

          {/* Pay */}
          <Link
            to="/checkout"
            className="group inline-flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-xs sm:text-sm font-bold text-white shadow-xs backdrop-blur-md transition-all duration-200 hover:border-[#00A3C4] hover:bg-[#00A3C4] hover:shadow-md hover:shadow-cyan-500/25 active:scale-95"
          >
            <Receipt
              size={15}
              className="text-cyan-300 transition-colors duration-200 group-hover:text-white"
            />
            <span>Pay</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
