import React from "react";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function SkeletonBox({ className = "" }: { className?: string }) {
  return (
    <div
      className={cx(
        "rounded-xl bg-slate-200 motion-safe:animate-pulse",
        className,
      )}
    />
  );
}

export function SkeletonText({
  className = "h-4 w-32",
}: {
  className?: string;
}) {
  return <SkeletonBox className={cx("rounded-full", className)} />;
}

export function SkeletonCircle({ className = "h-10 w-10" }: { className?: string }) {
  return <SkeletonBox className={cx("rounded-full", className)} />;
}

export function SkeletonButton({ className = "h-10 w-32" }: { className?: string }) {
  return <SkeletonBox className={cx("rounded-full", className)} />;
}

export function HeaderSkeleton() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <SkeletonCircle className="h-12 w-12" />
          <div className="space-y-2">
            <SkeletonText className="h-4 w-40" />
            <SkeletonText className="h-3 w-60 max-w-full" />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <SkeletonButton className="h-10 w-28" />
          <SkeletonButton className="h-10 w-32" />
        </div>
      </div>
    </div>
  );
}

export function PageSkeleton({ children }: { children?: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-100 px-4 py-4 text-slate-900 sm:px-6 lg:px-8 xl:px-10">
      <div className="mx-auto w-full max-w-[1800px] space-y-5">
        <HeaderSkeleton />
        {children ?? (
          <>
            <SummaryCardsSkeleton />
            <TableSkeleton rows={6} columns={6} />
            <MobileCardListSkeleton count={3} />
          </>
        )}
      </div>
    </div>
  );
}

export function SummaryCardsSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
        >
          <SkeletonText className="h-4 w-32" />
          <div className="mt-4 flex items-end justify-between gap-3">
            <SkeletonText className="h-8 w-16" />
            <SkeletonButton className="h-8 w-28" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function TableSkeleton({
  rows = 6,
  columns = 6,
  className = "",
  showHeader = true,
}: {
  rows?: number;
  columns?: number;
  className?: string;
  showHeader?: boolean;
}) {
  return (
    <div className={cx("overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm", className)}>
      {showHeader && (
        <div className="border-b border-slate-100 p-4 sm:p-5">
          <SkeletonText className="h-5 w-44" />
          <SkeletonText className="mt-2 h-3 w-64 max-w-full" />
        </div>
      )}
      <div className="hidden overflow-x-auto md:block">
        <div className="min-w-[900px]">
          <div
            className="grid gap-4 bg-slate-50 px-4 py-3"
            style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
          >
            {Array.from({ length: columns }).map((_, index) => (
              <SkeletonText key={index} className="h-3 w-20" />
            ))}
          </div>
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <div
              key={rowIndex}
              className="grid gap-4 border-t border-slate-100 px-4 py-4"
              style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
            >
              {Array.from({ length: columns }).map((_, colIndex) => (
                <SkeletonText
                  key={colIndex}
                  className={cx(
                    "h-4",
                    colIndex === 0 ? "w-24" : colIndex % 3 === 0 ? "w-32" : "w-full",
                  )}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function MobileCardListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-3 md:hidden">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1 space-y-2">
              <SkeletonText className="h-3 w-28" />
              <SkeletonText className="h-5 w-4/5" />
            </div>
            <SkeletonButton className="h-8 w-28" />
          </div>
          <div className="mt-4 space-y-2">
            <SkeletonText className="h-3 w-full" />
            <SkeletonText className="h-3 w-2/3" />
          </div>
          <div className="mt-4 flex gap-2">
            <SkeletonButton className="h-10 flex-1" />
            <SkeletonButton className="h-10 flex-1" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function TicketConversationSkeleton() {
  const bubbles = [
    { side: "left", width: "w-2/3" },
    { side: "right", width: "w-1/2" },
    { side: "left", width: "w-3/4" },
    { side: "right", width: "w-2/3" },
    { side: "left", width: "w-1/2" },
  ];

  return (
    <section className="flex min-h-[34rem] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-4 py-3">
        <SkeletonText className="h-5 w-32" />
        <SkeletonText className="mt-2 h-3 w-24" />
      </div>
      <div className="flex-1 space-y-4 overflow-hidden bg-slate-50 px-4 py-4">
        {bubbles.map((bubble, index) => (
          <div key={index} className={cx("flex", bubble.side === "right" && "justify-end")}>
            <div className={cx("rounded-2xl bg-white p-3 shadow-sm", bubble.width)}>
              <SkeletonText className="h-3 w-24" />
              <SkeletonText className="mt-3 h-4 w-full" />
              <SkeletonText className="mt-2 h-4 w-2/3" />
            </div>
          </div>
        ))}
      </div>
      <div className="border-t border-slate-200 bg-white p-3">
        <div className="flex items-center gap-2">
          <SkeletonCircle className="h-11 w-11" />
          <SkeletonBox className="h-11 flex-1 rounded-2xl" />
          <SkeletonCircle className="h-11 w-11" />
        </div>
      </div>
    </section>
  );
}

export function TicketDetailSkeleton() {
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,0.95fr)_minmax(420px,1.05fr)]">
      <div className="space-y-5">
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="space-y-2">
              <SkeletonText className="h-5 w-36" />
              <SkeletonText className="h-3 w-52" />
            </div>
            <SkeletonButton className="h-8 w-28" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className={cx("rounded-2xl border border-slate-100 bg-slate-50 p-3", index === 7 && "sm:col-span-2")}>
                <SkeletonText className="h-3 w-24" />
                <SkeletonText className="mt-3 h-4 w-4/5" />
              </div>
            ))}
          </div>
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <SkeletonText className="h-5 w-24" />
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <SkeletonBox className="aspect-video" />
            <SkeletonBox className="aspect-video" />
          </div>
        </section>
      </div>
      <TicketConversationSkeleton />
    </div>
  );
}

export function StatsDashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <SkeletonText className="h-6 w-56" />
          <SkeletonText className="h-3 w-72 max-w-full" />
        </div>
        <div className="flex flex-wrap gap-2">
          <SkeletonButton className="h-10 w-36" />
          <SkeletonButton className="h-10 w-36" />
          <SkeletonCircle className="h-10 w-10" />
        </div>
      </div>
      <SummaryCardsSkeleton count={6} />
      <div className="grid gap-6 lg:grid-cols-2">
        <SkeletonBox className="h-72 rounded-2xl border border-slate-200 bg-slate-100" />
        <SkeletonBox className="h-72 rounded-2xl border border-slate-200 bg-slate-100" />
      </div>
      <TableSkeleton rows={5} columns={6} />
    </div>
  );
}

export function FormSkeleton() {
  return (
    <PageSkeleton>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <SkeletonText className="h-6 w-48" />
        <div className="mt-5 space-y-4">
          <SkeletonBox className="h-11 w-full" />
          <SkeletonBox className="h-32 w-full" />
          <SkeletonBox className="h-11 w-full" />
          <SkeletonButton className="h-11 w-40" />
          <div className="flex justify-end gap-2">
            <SkeletonButton className="h-10 w-28" />
            <SkeletonButton className="h-10 w-28" />
          </div>
        </div>
      </section>
    </PageSkeleton>
  );
}

export function RoleCardsSkeleton() {
  return (
    <div className="flex flex-col items-center gap-3 w-full max-w-sm mx-auto">
      {Array.from({ length: 3 }).map((_, index) => (
        <SkeletonBox key={index} className="h-12 w-full rounded-lg" />
      ))}
    </div>
  );
}
