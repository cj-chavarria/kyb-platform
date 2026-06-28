import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <main className="flex-1 p-8 sm:p-12">
      <div className="mx-auto max-w-6xl space-y-8">
        <div>
          <Skeleton className="h-4 w-32 mb-4" />
          <div className="mt-4 flex flex-col sm:flex-row sm:items-start justify-between gap-6">
            <div>
              <Skeleton className="h-10 w-64 mb-2" />
              <Skeleton className="h-5 w-48" />
            </div>
            <div className="flex flex-col sm:items-end gap-3 shrink-0">
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-10 w-40" />
            </div>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-6 shadow">
          <Skeleton className="h-6 w-48 mb-6" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-5 w-48" />
            </div>
            <div>
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-5 w-32" />
            </div>
            <div>
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-5 w-full max-w-[200px]" />
            </div>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-[400px] w-full rounded-xl" />
          <Skeleton className="h-[400px] w-full rounded-xl" />
        </div>
      </div>
    </main>
  );
}
