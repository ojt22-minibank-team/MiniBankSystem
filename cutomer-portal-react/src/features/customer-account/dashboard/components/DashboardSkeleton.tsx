
interface DashboardSkeletonProps {
  label?: string;
}

export default function DashboardSkeleton({
  label = "Loading dashboard",
}: DashboardSkeletonProps) {
  return (
    <div
      role="status"
      aria-label={label}
      className="mx-auto max-w-[1600px] space-y-8"
    >
      {/* Welcome header */}
      <section className="flex items-center gap-4 border-b border-slate-200/80 pb-6">
        <div className="h-12 w-12 shrink-0 animate-pulse rounded-xl bg-slate-200" />

        <div className="min-w-0 flex-1 space-y-3">
          <div className="h-3 w-36 animate-pulse rounded bg-slate-200" />
          <div className="h-8 w-52 max-w-full animate-pulse rounded-md bg-slate-200" />
          <div className="h-4 w-64 max-w-full animate-pulse rounded bg-slate-100" />
        </div>
      </section>

      {/* Total balance card */}
      <section
        aria-hidden="true"
        className="relative overflow-hidden rounded-2xl bg-slate-200 p-6 sm:p-8"
      >
        <div className="space-y-4">
          <div className="h-4 w-36 animate-pulse rounded bg-slate-300" />
          <div className="h-10 w-64 max-w-full animate-pulse rounded-lg bg-slate-300" />
          <div className="h-4 w-40 animate-pulse rounded bg-slate-300" />
        </div>

        <div className="mt-8 flex items-center justify-between gap-4">
          <div className="h-4 w-32 animate-pulse rounded bg-slate-300" />
          <div className="h-10 w-10 animate-pulse rounded-full bg-slate-300" />
        </div>
      </section>

      {/* Quick actions */}
      <section
        aria-hidden="true"
        className="grid grid-cols-1 gap-4 md:grid-cols-3"
      >
        {[1, 2, 3].map((item) => (
          <div
            key={item}
            className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4"
          >
            <div className="h-14 w-14 shrink-0 animate-pulse rounded-full bg-slate-200" />

            <div className="flex-1 space-y-3">
              <div className="h-4 w-28 max-w-full animate-pulse rounded bg-slate-200" />
              <div className="h-3 w-36 max-w-full animate-pulse rounded bg-slate-100" />
            </div>
          </div>
        ))}
      </section>

      {/* Account cards */}
      <section
        aria-hidden="true"
        className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"
      >
        {[1, 2, 3].map((item) => (
          <div
            key={item}
            className="h-44 animate-pulse rounded-xl border border-slate-200 bg-white p-5"
          >
            <div className="flex items-center justify-between">
              <div className="h-10 w-10 rounded-lg bg-slate-200" />
              <div className="h-6 w-20 rounded-full bg-slate-100" />
            </div>

            <div className="mt-5 h-4 w-32 rounded bg-slate-200" />
            <div className="mt-3 h-6 w-44 max-w-full rounded bg-slate-200" />
            <div className="mt-4 h-3 w-24 rounded bg-slate-100" />
          </div>
        ))}
      </section>
    </div>
  );
}
