
interface DashboardSkeletonProps {
  label?: string;
}

const SKELETON_CARD_COUNT = 3;
const TRANSACTION_SKELETON_COUNT = 4;

export default function DashboardSkeleton({
  label = "Loading dashboard",
}: DashboardSkeletonProps) {
  return (
    <div
      role="status"
      aria-label={label}
      className="mx-auto max-w-[1450px] space-y-6"
    >
      {/* Total Balance Card */}
      <section
        aria-hidden="true"
        className="relative overflow-hidden rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-[#0A192F] via-[#102A54] to-[#153564] p-5 shadow-lg sm:p-6"
      >
        <div className="relative z-10 space-y-5">
          {/* Greeting */}
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 shrink-0 animate-pulse rounded-xl bg-white/15" />
            <div className="h-5 w-52 max-w-full animate-pulse rounded-md bg-white/15" />
          </div>

          {/* Balance */}
          <div className="space-y-3">
            <div className="h-3 w-40 animate-pulse rounded bg-cyan-200/20" />

            <div className="flex flex-wrap items-center gap-3">
              <div className="h-5 w-12 animate-pulse rounded bg-cyan-200/20" />
              <div className="h-9 w-52 max-w-full animate-pulse rounded-lg bg-white/15" />
              <div className="h-8 w-8 animate-pulse rounded-lg bg-white/15" />
            </div>
          </div>
        </div>

        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-16 -top-16 h-60 w-60 rounded-full bg-cyan-400/10 blur-3xl"
        />
      </section>

      {/* My Accounts */}
      <section aria-hidden="true" className="w-full min-w-0 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-36 animate-pulse rounded-md bg-slate-200 dark:bg-slate-700 sm:w-40" />
            <div className="h-5 w-8 animate-pulse rounded-full bg-cyan-100 dark:bg-cyan-950/50" />
          </div>

          {/* Slider Navigation */}
          <div className="flex items-center gap-1.5">
            <div className="h-8 w-8 animate-pulse rounded-full bg-slate-200 dark:bg-slate-700" />
            <div className="h-8 w-8 animate-pulse rounded-full bg-slate-200 dark:bg-slate-700" />
          </div>
        </div>

        {/* Bank Card Slider */}
        <div className="flex w-full min-w-0 items-center gap-5 overflow-hidden pb-4 pt-1 sm:gap-6">
          {Array.from({ length: SKELETON_CARD_COUNT }).map((_, index) => (
            <div
              key={index}
              className="h-[225px] w-[330px] min-w-[320px] shrink-0 animate-pulse overflow-hidden rounded-[26px] border border-slate-200 bg-slate-200 p-5 dark:border-slate-700 dark:bg-slate-800 sm:h-[235px] sm:w-[370px] sm:p-6"
            >
              {/* Bank Name + Logo + Crown */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="h-[34px] w-[34px] rounded-lg bg-slate-300 dark:bg-slate-700" />

                  <div className="h-4 w-28 rounded bg-slate-300 dark:bg-slate-700" />
                </div>

                <div className="h-10 w-10 rounded-full bg-slate-300 dark:bg-slate-700" />
              </div>

              {/* Available Balance */}
              <div className="my-auto space-y-3 py-5">
                <div className="flex items-center justify-between">
                  <div className="h-3 w-28 rounded bg-slate-300 dark:bg-slate-700" />
                  <div className="h-6 w-6 rounded-lg bg-slate-300 dark:bg-slate-700" />
                </div>

                <div className="flex items-baseline gap-2">
                  <div className="h-4 w-10 rounded bg-slate-300 dark:bg-slate-700" />
                  <div className="h-7 w-40 max-w-full rounded-lg bg-slate-300 dark:bg-slate-700" />
                </div>
              </div>

              {/* Account Number + Holder */}
              <div className="space-y-2 pt-1">
                <div className="h-4 w-48 max-w-full rounded bg-slate-300 dark:bg-slate-700" />
                <div className="h-3 w-36 max-w-full rounded bg-slate-300 dark:bg-slate-700" />
              </div>

              {/* Account Type */}
              <div className="mt-3 flex items-center justify-between border-t border-slate-300/70 pt-2 dark:border-slate-600">
                <div className="h-5 w-24 rounded-full bg-slate-300 dark:bg-slate-700" />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Recent Transactions */}
      <section aria-hidden="true" className="space-y-4 pt-2">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div className="h-6 w-44 animate-pulse rounded-md bg-slate-200 dark:bg-slate-700" />
          <div className="h-4 w-20 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
        </div>

        {/* Transaction List */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#0A192F]">
          {Array.from({ length: TRANSACTION_SKELETON_COUNT }).map(
            (_, index) => (
              <div
                key={index}
                className="flex items-center gap-3 border-b border-slate-100 p-4 last:border-b-0 dark:border-slate-800 sm:gap-4 sm:p-5"
              >
                <div className="h-10 w-10 shrink-0 animate-pulse rounded-full bg-slate-200 dark:bg-slate-700" />

                <div className="min-w-0 flex-1 space-y-2">
                  <div className="h-4 w-32 max-w-full animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                  <div className="h-3 w-24 max-w-full animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
                </div>

                <div className="space-y-2">
                  <div className="ml-auto h-4 w-24 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                  <div className="ml-auto h-3 w-16 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
                </div>
              </div>
            ),
          )}
        </div>
      </section>

      <span className="sr-only">{label}</span>
    </div>
  );
}
