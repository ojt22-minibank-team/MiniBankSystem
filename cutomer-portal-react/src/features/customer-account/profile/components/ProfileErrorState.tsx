import {
  AlertCircle,
  RefreshCw,
} from "lucide-react";

interface ProfileErrorStateProps {
  onRetry: () => void;
  message: string;
}

export default function ProfileErrorState({
  onRetry,
  message,
}: ProfileErrorStateProps) {
  return (
    <div className="w-full px-6 py-8 lg:px-8">
      <div className="mx-auto max-w-5xl">
        {/* Page heading */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#08295C]">
            Profile
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Manage your personal information and account details.
          </p>
        </div>

        {/* Error state */}
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex min-h-[360px] flex-col items-center justify-center px-6 py-12 text-center">
            {/* Icon */}
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
              <AlertCircle
                size={28}
                strokeWidth={2}
                className="text-red-500"
              />
            </div>

            {/* Title */}
            <h2 className="mt-5 text-lg font-bold text-[#08295C]">
              We couldn't load your profile
            </h2>

            {/* Message */}
            <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
              {message}
            </p>

            {/* Retry */}
            <button
              type="button"
              onClick={onRetry}
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[#0878E8] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0668CA] focus:outline-none focus:ring-4 focus:ring-blue-100"
            >
              <RefreshCw
                size={16}
                strokeWidth={2}
              />

              Try Again
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}