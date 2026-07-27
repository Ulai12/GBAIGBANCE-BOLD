export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton ${className}`} />;
}

export function EventCardSkeleton() {
  return (
    <div className="card overflow-hidden">
      <Skeleton className="rounded-none h-32 w-full" />
      <div className="p-3 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <div className="flex justify-between pt-1">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-3 w-10" />
        </div>
      </div>
    </div>
  );
}
