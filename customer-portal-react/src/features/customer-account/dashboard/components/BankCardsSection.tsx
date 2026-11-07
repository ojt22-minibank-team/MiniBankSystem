import { useRef, useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  WalletCards,
} from "lucide-react";
import { useTranslation } from "react-i18next";

import BankCard from "./BankCard";
import type { DashboardAccount } from "../types/dashboardTypes";

interface BankCardsSectionProps {
  accounts: DashboardAccount[];
  customerName?: string;
  showBalance?: boolean;
  onToggleBalance?: () => void;
  showStatus?: boolean;
}

export default function BankCardsSection({
  accounts,
  customerName,
  showBalance = true,
  onToggleBalance,
  showStatus = false,
}: BankCardsSectionProps) {
  const { t } = useTranslation("dashboard");

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const hasMultipleCards = accounts.length > 2;
  const hasExactlyTwoCards = accounts.length === 2;

  const checkScroll = useCallback(() => {
    const el = scrollContainerRef.current;

    if (!el) return;

    const { scrollLeft, scrollWidth, clientWidth } = el;

    setCanScrollLeft(scrollLeft > 10);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 10);
  }, []);

  useEffect(() => {
    const el = scrollContainerRef.current;

    if (!el) return;

    checkScroll();

    const resizeObserver = new ResizeObserver(checkScroll);

    resizeObserver.observe(el);

    return () => {
      resizeObserver.disconnect();
    };
  }, [accounts, checkScroll]);

  const handleScroll = (direction: "left" | "right") => {
    const el = scrollContainerRef.current;

    if (!el) return;

    el.scrollBy({
      left: direction === "left" ? -390 : 390,
      behavior: "smooth",
    });
  };

  if (accounts.length === 0) {
    return (
      <section className="rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0A192F] p-8 text-center shadow-xs transition-colors duration-200">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-50 dark:bg-cyan-950/40 text-[#00A3C4]">
          <WalletCards size={28} />
        </div>

        <h3 className="mt-4 text-base font-extrabold text-[#0A192F] dark:text-white">
          {t("noLinkedAccounts")}
        </h3>

        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
          {t("linkedAccountsDescription")}
        </p>

        <Link
          to="/accounts"
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#00A3C4] to-[#0284C7] px-5 py-2.5 text-xs font-bold text-white shadow-sm shadow-cyan-500/25 transition hover:from-[#0891B2] hover:to-[#0369A1]"
        >
          <Plus size={16} />
          <span>{t("viewAllAccounts")}</span>
        </Link>
      </section>
    );
  }

  return (
    <section
      aria-label={t("customerCards")}
      className="w-full min-w-0 space-y-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-[#0A192F] dark:text-white">
            {t("myAccounts")}
          </h2>

          <span className="inline-flex items-center justify-center rounded-full bg-cyan-50 dark:bg-cyan-950/50 px-2.5 py-0.5 text-xs font-extrabold text-[#00A3C4] border border-cyan-200/60 dark:border-cyan-800/60">
            {accounts.length}
          </span>
        </div>

        {hasMultipleCards && (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => handleScroll("left")}
              disabled={!canScrollLeft}
              aria-label={t("previousCard")}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 shadow-xs transition hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-[#0A192F] dark:hover:text-white hover:border-slate-300 dark:hover:border-slate-600 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronLeft size={16} />
            </button>

            <button
              type="button"
              onClick={() => handleScroll("right")}
              disabled={!canScrollRight}
              aria-label={t("nextCard")}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 shadow-xs transition hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-[#0A192F] dark:hover:text-white hover:border-slate-300 dark:hover:border-slate-600 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>

      {/* Cards Slider */}
      <div
        ref={scrollContainerRef}
        onScroll={checkScroll}
        className="flex w-full min-w-0 items-center justify-start gap-5 sm:gap-6 overflow-x-auto pb-4 pt-1 scroll-smooth scrollbar-none"
        style={{
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}
      >
        {accounts.map((account, index) => (
          <div
            key={account.accountNumber}
            className={
              hasExactlyTwoCards
                ? "min-w-[320px] flex-1 basis-0"
                : "w-[330px] shrink-0 sm:w-[370px]"
            }
          >
            <BankCard
              account={account}
              accountName={customerName}
              index={index}
              showBalance={showBalance}
              onToggleBalance={onToggleBalance}
              showStatus={showStatus}
            />
          </div>
        ))}
      </div>
    </section>
  );
}