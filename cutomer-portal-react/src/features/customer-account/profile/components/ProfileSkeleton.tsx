const SkeletonBlock = ({
  className = "",
}: {
  className?: string;
}) => {
  return (
    <div
      className={`animate-pulse rounded-md bg-slate-200 ${className}`}
    />
  );
};

const ProfileFieldSkeleton = () => {
  return (
    <div className="space-y-3">
      <SkeletonBlock className="h-5 w-28" />
      <SkeletonBlock className="h-5 w-52" />
    </div>
  );
};

export default function ProfileSkeleton() {
  return (
    <div className="min-h-[calc(100vh-80px)] bg-[#F5F7FB]">
      <div className="mx-auto max-w-7xl space-y-8 px-6 py-8">

        {/* ================================================================
            PROFILE HEADER
            ================================================================ */}
        <section className="overflow-hidden rounded-2xl bg-white shadow-sm">

          {/* Blue Header */}
          <div className="h-[265px] animate-pulse bg-slate-200">
            <div className="flex h-full items-center px-10">

              {/* Profile Image */}
              <SkeletonBlock
                className="
                  h-32
                  w-32
                  shrink-0
                  rounded-full
                  border-4
                  border-white
                "
              />

              {/* Profile Information */}
              <div className="ml-9 space-y-4">

                {/* Name */}
                <SkeletonBlock className="h-9 w-64" />

                {/* Customer ID */}
                <SkeletonBlock className="h-5 w-80" />

                {/* Status / Type */}
                <div className="flex gap-3">
                  <SkeletonBlock className="h-9 w-28 rounded-full" />
                  <SkeletonBlock className="h-9 w-32 rounded-full" />
                </div>

              </div>
            </div>
          </div>

          {/* Notice */}
          <div className="flex min-h-[78px] items-center gap-4 px-10">
            <SkeletonBlock className="h-6 w-6 rounded-full" />

            <SkeletonBlock className="h-5 w-[620px] max-w-full" />
          </div>
        </section>

        {/* ================================================================
            PERSONAL INFORMATION
            ================================================================ */}
        <section className="rounded-2xl bg-white p-9 shadow-sm">

          {/* Section Title */}
          <SkeletonBlock className="mb-10 h-7 w-64" />

          {/* Information Container */}
          <div className="rounded-2xl border border-slate-200 p-9">

            <div className="grid grid-cols-1 gap-x-20 gap-y-10 md:grid-cols-2">

              <ProfileFieldSkeleton />
              <ProfileFieldSkeleton />

              <ProfileFieldSkeleton />
              <ProfileFieldSkeleton />

              <ProfileFieldSkeleton />
              <ProfileFieldSkeleton />

              <ProfileFieldSkeleton />
              <ProfileFieldSkeleton />

            </div>

          </div>
        </section>

        {/* ================================================================
            ADDRESS
            ================================================================ */}
        <section className="rounded-2xl bg-white p-9 shadow-sm">

          <div className="mb-8 flex items-center justify-between">
            <SkeletonBlock className="h-7 w-40" />
            <SkeletonBlock className="h-9 w-24 rounded-lg" />
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">

            <div className="md:col-span-2 space-y-3">
              <SkeletonBlock className="h-5 w-24" />
              <SkeletonBlock className="h-12 w-full" />
            </div>

            <div className="space-y-3">
              <SkeletonBlock className="h-5 w-20" />
              <SkeletonBlock className="h-12 w-full" />
            </div>

            <div className="space-y-3">
              <SkeletonBlock className="h-5 w-28" />
              <SkeletonBlock className="h-12 w-full" />
            </div>

            <div className="space-y-3">
              <SkeletonBlock className="h-5 w-20" />
              <SkeletonBlock className="h-12 w-full" />
            </div>

          </div>
        </section>

        {/* ================================================================
            SECURITY
            ================================================================ */}
        <section className="rounded-2xl bg-white p-9 shadow-sm">

          <SkeletonBlock className="mb-8 h-7 w-32" />

          <div className="space-y-4">

            <SkeletonBlock className="h-20 w-full rounded-xl" />

            <SkeletonBlock className="h-20 w-full rounded-xl" />

            <SkeletonBlock className="h-20 w-full rounded-xl" />

          </div>

        </section>

      </div>
    </div>
  );
}