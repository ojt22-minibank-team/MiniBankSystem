import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Check, Copy, Eye, EyeOff } from "lucide-react";
import type { DashboardAccount } from "../types/dashboardTypes";
import {
  EkarajCrown,
  EbMonogram,
  CardGeometricLines,
} from "../../../../components/common/EkarajLogo";
import { useAppSelector, type RootState } from "../../../../lib/redux";

interface BankCardProps {
  account: DashboardAccount;
  accountName?: string;
  index?: number;
  showBalance?: boolean;
  onToggleBalance?: () => void;
  className?: string;
  isLink?: boolean;
  onClick?: () => void;
  compact?: boolean;
}

export interface EkarajCardTheme {
  id: string;
  name: string;
  cardClass: string;
  themeType: "platinum" | "navy" | "gold" | "obsidian";
  textMode: "dark" | "light";
  embossedClass: string;
  bankTitleClass: string;
  balanceLabelClass: string;
  balanceNumberClass: string;
  currencyClass: string;
  cardholderNameClass: string;
  badgeClass: string;
  dividerClass: string;
  actionBtnClass: string;
}

export type EkararjCardTheme = EkarajCardTheme;

export const EKARAJ_CARD_THEMES: EkarajCardTheme[] = [
  // 1. Brushed Platinum Silver
  {
    id: "platinum",
    name: "Platinum Silver",
    cardClass: "card-brushed-platinum border border-slate-300/80 shadow-xl",
    themeType: "platinum",
    textMode: "dark",
    embossedClass: "embossed-text-silver",
    bankTitleClass: "text-[#0A192F] drop-shadow-[0_1px_1px_rgba(255,255,255,0.9)]",
    balanceLabelClass: "text-slate-600 font-bold",
    balanceNumberClass: "text-[#0A192F] drop-shadow-[0_1px_0_rgba(255,255,255,0.8)]",
    currencyClass: "text-[#007088]",
    cardholderNameClass: "text-[#1E293B] drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)]",
    badgeClass: "bg-[#0A192F]/10 text-[#0A192F] border border-[#0A192F]/20",
    dividerClass: "border-slate-300/70",
    actionBtnClass: "text-slate-600 hover:text-[#0A192F] hover:bg-slate-200/60",
  },
  // 2. Royal Sapphire Navy
  {
    id: "navy",
    name: "Sapphire Navy",
    cardClass: "card-brushed-navy border border-blue-900/60 shadow-xl",
    themeType: "navy",
    textMode: "light",
    embossedClass: "embossed-text-navy",
    bankTitleClass: "text-white drop-shadow-sm",
    balanceLabelClass: "text-cyan-200/90 font-bold",
    balanceNumberClass: "text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]",
    currencyClass: "text-cyan-300",
    cardholderNameClass: "text-white/95 drop-shadow-xs",
    badgeClass: "bg-white/15 text-cyan-200 border border-white/20",
    dividerClass: "border-white/15",
    actionBtnClass: "text-white/80 hover:text-white hover:bg-white/20",
  },
  // 3. Titanium Champagne Gold
  {
    id: "gold",
    name: "Titanium Gold",
    cardClass: "card-brushed-gold border border-amber-300/70 shadow-xl",
    themeType: "gold",
    textMode: "dark",
    embossedClass: "embossed-text-gold",
    bankTitleClass: "text-[#1B1202] drop-shadow-[0_1px_1px_rgba(255,255,255,0.9)]",
    balanceLabelClass: "text-[#694808] font-bold",
    balanceNumberClass: "text-[#1B1202] drop-shadow-[0_1px_0_rgba(255,255,255,0.8)]",
    currencyClass: "text-[#78540C]",
    cardholderNameClass: "text-[#2D1E04] drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)]",
    badgeClass: "bg-[#2D1E04]/10 text-[#2D1E04] border border-[#2D1E04]/20",
    dividerClass: "border-amber-400/50",
    actionBtnClass: "text-[#694808] hover:text-[#1B1202] hover:bg-amber-400/25",
  },
  // 4. Obsidian Black Diamond
  {
    id: "obsidian",
    name: "Black Diamond",
    cardClass: "card-brushed-obsidian border border-slate-700/80 shadow-xl",
    themeType: "obsidian",
    textMode: "light",
    embossedClass: "embossed-text-navy",
    bankTitleClass: "text-white drop-shadow-sm",
    balanceLabelClass: "text-cyan-200/90 font-bold",
    balanceNumberClass: "text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.7)]",
    currencyClass: "text-cyan-300",
    cardholderNameClass: "text-white/95 drop-shadow-xs",
    badgeClass: "bg-white/15 text-cyan-200 border border-white/20",
    dividerClass: "border-white/15",
    actionBtnClass: "text-white/80 hover:text-white hover:bg-white/20",
  },
];

export const EKARARJ_CARD_THEMES = EKARAJ_CARD_THEMES;

export function formatBalance(amount: number): string {
  return amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Returns clean masked account number for card display
 * DB 10 digits format: '••••  •••  568'
 */
export function formatHashedCardNumber(accountNumber: string): string {
  if (!accountNumber) return "••••  •••  •••";
  const cleaned = accountNumber.replace(/\D/g, "");

  if (cleaned.length === 10) {
    return `****  ***  ${cleaned.slice(7, 10)}`;
  }

  if (cleaned.length === 16) {
    return `****  ****  ****  ${cleaned.slice(12, 16)}`;
  }

  const last4 = cleaned.length >= 4 ? cleaned.slice(-4) : cleaned;
  return `**** ${last4}`;
}

export default function BankCard({
  account,
  accountName,
  index = 0,
  showBalance = true,
  onToggleBalance,
  className = "",
  isLink = true,
  onClick,
  compact = false,
}: BankCardProps) {
  const [copied, setCopied] = useState(false);
  const [isBalanceVisible, setIsBalanceVisible] = useState(showBalance);

  useEffect(() => {
    setIsBalanceVisible(showBalance);
  }, [showBalance]);

  // Resolve customer name from props, account, or Redux state
  const reduxFullName = useAppSelector((state: RootState) => {
    const profile = state.profile?.profile;
    if (profile) {
      if (profile.firstName || profile.lastName) {
        return `${profile.firstName || ""} ${profile.lastName || ""}`.trim();
      }
      if (profile.companyName) {
        return profile.companyName;
      }
    }
    return state.dashboard?.data?.fullName || null;
  });

  const customerDisplayName = (
    accountName ||
    (account as unknown as { accountName?: string }).accountName ||
    reduxFullName ||
    "EKARAJ CUSTOMER"
  ).toUpperCase();

  const theme = EKARAJ_CARD_THEMES[index % EKARAJ_CARD_THEMES.length];

  const accountTypeLabel =
    account.accountType?.toUpperCase() === "SAVINGS"
      ? "SAVINGS ACCOUNT"
      : "CURRENT ACCOUNT";

  const hashedCardNumber = formatHashedCardNumber(account.accountNumber);

  // Business Logic: Available Balance (usable money) = Current Balance - Minimum Reserve
  const effectiveAvailableBalance = (() => {
    const minReserve = (account as { minimumBalance?: number }).minimumBalance ?? 10000;
    if (account.currentBalance !== undefined && account.currentBalance !== null) {
      if (account.availableBalance !== undefined && account.availableBalance < account.currentBalance) {
        return account.availableBalance;
      }
      return Math.max(0, account.currentBalance - minReserve);
    }
    return account.availableBalance ?? 0;
  })();

  const handleToggleEye = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsBalanceVisible((prev) => !prev);
    if (onToggleBalance) {
      onToggleBalance();
    }
  };

  const handleCopy = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    void navigator.clipboard.writeText(account.accountNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const cardInner = (
    <>
      {/* 1. Card Geometric Lines in Background */}
      <CardGeometricLines />

      {/* 2. TOP ROW: 'EB' Monogram + 'EKARAJ BANK' on Left, Official 3D Crown on Right */}
      <div className="relative z-10 flex items-start justify-between">
        <div className="flex items-center gap-2.5">
          {/* 3D Metallic Cyan 'EB' */}
          <EbMonogram size={34} />

          <div>
            <h3
              className={`text-[15px] sm:text-[16px] font-black tracking-wide leading-none ${theme.bankTitleClass}`}
              style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}
            >
              EKARAJ BANK
            </h3>
          </div>
        </div>

        {/* Official 3D Crown Logo */}
        <div className="flex items-center gap-2">
          <EkarajCrown size={42} />
        </div>
      </div>

      {/* 3. MIDDLE: Real-World Digital Bank Available Balance with Eye Toggle */}
      <div className="relative z-10 my-auto py-1 space-y-1">
        <div className="flex items-center justify-between">
          <span
            className={`text-[10px] sm:text-[11px] uppercase tracking-wider ${theme.balanceLabelClass}`}
          >
            Available Balance
          </span>

          {/* Eye Toggle button for Balance */}
          <button
            type="button"
            onClick={handleToggleEye}
            className={`rounded-lg p-1 transition-colors ${theme.actionBtnClass} focus:outline-none`}
            title={isBalanceVisible ? "Hide balance" : "Show balance"}
            aria-label={isBalanceVisible ? "Hide balance" : "Show balance"}
          >
            {isBalanceVisible ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>

        <div className="flex items-baseline gap-1.5">
          <span
            className={`text-xl sm:text-2xl font-black tracking-tight ${theme.balanceNumberClass}`}
          >
            {isBalanceVisible ? (
              <>
                <span
                  className={`mr-1.5 text-xs sm:text-sm font-extrabold ${theme.currencyClass}`}
                >
                  {account.currency || "MMK"}
                </span>
                {formatBalance(effectiveAvailableBalance)}
              </>
            ) : (
              <span className="tracking-widest">**********</span>
            )}
          </span>
        </div>
      </div>

      {/* 4. LOWER BODY: Hashed Account Number & Account Holder Name */}
      <div className="relative z-10 pt-1 space-y-1">
        <div className="flex items-center justify-between">
          {/* Hashed 10-digit DB Account Number */}
          <p
            className={`font-mono text-[15px] sm:text-[16.5px] font-black tracking-[0.2em] ${theme.embossedClass}`}
            style={{ letterSpacing: "0.2em" }}
          >
            {hashedCardNumber}
          </p>

          {/* 1-Click Copy Account Number */}
          <button
            type="button"
            onClick={handleCopy}
            className={`rounded-md p-1 opacity-0 transition-opacity group-hover:opacity-100 ${theme.actionBtnClass}`}
            title="Copy account number"
          >
            {copied ? (
              <Check size={13} className="text-emerald-500 font-bold" />
            ) : (
              <Copy size={13} />
            )}
          </button>
        </div>

        {/* Account Holder Name */}
        <p
          className={`truncate font-mono text-[11px] sm:text-xs font-bold tracking-[0.16em] uppercase ${theme.cardholderNameClass}`}
          style={{ letterSpacing: "0.16em" }}
        >
          {customerDisplayName}
        </p>
      </div>

      {/* 5. BOTTOM ROW: Account Type Badge */}
      <div className={`relative z-10 flex items-center justify-between pt-1 border-t ${theme.dividerClass}`}>
        <span
          className={`rounded-full px-2.5 py-0.5 text-[9px] font-black tracking-wider uppercase ${theme.badgeClass}`}
        >
          {accountTypeLabel}
        </span>
      </div>
    </>
  );

  if (compact) {
    const compactClasses = `group relative flex h-[122px] sm:h-[130px] w-[196px] sm:w-[210px] shrink-0 flex-col justify-between overflow-hidden rounded-2xl p-3 select-none transition-all duration-300 shadow-md ${
      isLink ? "hover:-translate-y-1 hover:shadow-xl cursor-pointer" : ""
    } ${theme.cardClass} ${className}`;

    const compactContent = (
      <>
        {/* Card Geometric Lines */}
        <CardGeometricLines />

        {/* TOP ROW: EB Monogram + Bank Title + 3D Crown */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <EbMonogram size={18} />
            <span
              className={`text-[10px] font-black tracking-wide leading-none ${theme.bankTitleClass}`}
            >
              EKARAJ BANK
            </span>
          </div>
          <EkarajCrown size={20} />
        </div>

        {/* MIDDLE: Balance & Card Masked Number */}
        <div className="relative z-10 my-auto py-0.5 space-y-0.5">
          <div className="flex items-baseline gap-1">
            <span className={`text-[9px] font-bold ${theme.currencyClass}`}>
              {account.currency || "MMK"}
            </span>
            <span className={`font-mono text-xs sm:text-[13px] font-black tracking-tight ${theme.balanceNumberClass}`}>
              {isBalanceVisible ? formatBalance(effectiveAvailableBalance) : "••••••"}
            </span>
          </div>
          <p
            className={`font-mono text-[11px] sm:text-xs font-black tracking-[0.14em] ${theme.embossedClass}`}
          >
            {hashedCardNumber}
          </p>
        </div>

        {/* BOTTOM ROW: Holder Name + Account Type Badge */}
        <div className={`relative z-10 flex items-center justify-between border-t pt-1 ${theme.dividerClass}`}>
          <p
            className={`truncate font-mono text-[9px] font-bold uppercase tracking-wider ${theme.cardholderNameClass} max-w-[105px]`}
          >
            {customerDisplayName}
          </p>
          <span
            className={`rounded-full px-1.5 py-0.5 text-[8px] font-black tracking-wider uppercase ${theme.badgeClass}`}
          >
            {accountTypeLabel}
          </span>
        </div>
      </>
    );

    if (!isLink) {
      return (
        <div
          data-bank-card="true"
          data-keep-light="true"
          className={compactClasses}
          onClick={onClick}
          role={onClick ? "button" : undefined}
          tabIndex={onClick ? 0 : undefined}
        >
          {compactContent}
        </div>
      );
    }

    return (
      <Link
        to="/accounts"
        state={{ accountNumber: account.accountNumber }}
        title="Click to view full account details"
        data-bank-card="true"
        data-keep-light="true"
        className={compactClasses}
        onClick={onClick}
      >
        {compactContent}
      </Link>
    );
  }

  const cardClasses = `group relative flex h-[225px] sm:h-[235px] w-full min-w-[320px] max-w-[400px] shrink-0 flex-col justify-between overflow-hidden rounded-[26px] p-5 sm:p-6 select-none transition-all duration-300 ${
    isLink ? "hover:-translate-y-1.5 hover:shadow-2xl cursor-pointer" : ""
  } ${theme.cardClass} ${className}`;

  if (!isLink) {
    return (
      <div
        data-bank-card="true"
        data-keep-light="true"
        className={cardClasses}
        onClick={onClick}
        role={onClick ? "button" : undefined}
        tabIndex={onClick ? 0 : undefined}
      >
        {cardInner}
      </div>
    );
  }

  return (
    <Link
      to="/accounts"
      state={{ accountNumber: account.accountNumber }}
      title="Click to view full account details"
      data-bank-card="true"
      data-keep-light="true"
      className={cardClasses}
      onClick={onClick}
    >
      {cardInner}
    </Link>
  );
}
