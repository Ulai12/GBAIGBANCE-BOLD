export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton ${className}`} />;
}

/**
 * Skeleton for standard vertical event card (Home explore / Explore grid)
 */
export function EventCardSkeleton() {
  return (
    <div className="rounded-[1.75rem] overflow-hidden bg-white/80 dark:bg-[#191629]/90 border border-black/[0.05] dark:border-white/[0.08] shadow-xs flex flex-col">
      <div className="relative aspect-[16/11] w-full bg-black/[0.04] dark:bg-white/[0.05] overflow-hidden">
        <Skeleton className="w-full h-full rounded-none" />
        <div className="absolute top-2.5 left-2.5">
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
      </div>
      <div className="p-3.5 space-y-2.5 flex-1 flex flex-col justify-between">
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-5/6 rounded-md" />
          <Skeleton className="h-3 w-1/2 rounded-md" />
        </div>
        <div className="pt-2 border-t border-black/[0.04] dark:border-white/[0.05] flex items-center justify-between">
          <Skeleton className="h-4 w-16 rounded-full" />
          <Skeleton className="h-3 w-12 rounded-md" />
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton for horizontal nearby tile (Section "À proximité")
 */
export function NearbyTileSkeleton() {
  return (
    <div className="w-[245px] sm:w-[260px] h-[200px] shrink-0 rounded-[1.6rem] bg-white/85 dark:bg-[#161426]/90 border border-black/[0.06] dark:border-white/[0.08] p-3 shadow-xs flex flex-col justify-between snap-start">
      <div className="relative h-[95px] w-full rounded-xl overflow-hidden bg-black/[0.04] dark:bg-white/[0.05]">
        <Skeleton className="w-full h-full rounded-none" />
        <div className="absolute top-2 left-2">
          <Skeleton className="h-4 w-16 rounded-full" />
        </div>
      </div>
      <div className="space-y-1.5 pt-1">
        <Skeleton className="h-4 w-3/4 rounded-md" />
        <Skeleton className="h-3 w-1/2 rounded-md" />
      </div>
      <div className="flex items-center justify-between pt-1 border-t border-black/[0.03] dark:border-white/[0.04]">
        <Skeleton className="h-4 w-14 rounded-full" />
        <Skeleton className="h-4 w-12 rounded-md" />
      </div>
    </div>
  );
}

/**
 * Skeleton for Featured Carousel on Home
 */
export function FeaturedCarouselSkeleton() {
  return (
    <div className="relative aspect-[16/10] sm:aspect-[21/10] w-full min-h-[310px] rounded-[2rem] overflow-hidden bg-black/[0.04] dark:bg-white/[0.05] border border-black/5 dark:border-white/10 p-6 flex flex-col justify-between">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Skeleton className="h-7 w-24 rounded-full" />
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
        <Skeleton className="h-9 w-9 rounded-full" />
      </div>
      <div className="space-y-2 max-w-sm">
        <Skeleton className="h-3.5 w-24 rounded-full" />
        <Skeleton className="h-7 w-4/5 rounded-xl" />
        <Skeleton className="h-4 w-2/3 rounded-md" />
        <div className="flex items-center gap-3 pt-2">
          <Skeleton className="h-10 w-28 rounded-full" />
          <Skeleton className="h-10 w-28 rounded-full" />
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton for Trending Deck stack
 */
export function TrendingDeckSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Skeleton className="h-3 w-28 rounded-md" />
          <Skeleton className="h-6 w-36 rounded-lg" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-9 rounded-full" />
          <Skeleton className="h-9 w-9 rounded-full" />
        </div>
      </div>
      <div className="relative h-[26rem] rounded-[2rem] overflow-hidden bg-black/[0.04] dark:bg-white/[0.05] border border-black/5 dark:border-white/10 p-6 flex flex-col justify-between">
        <Skeleton className="w-full h-full absolute inset-0 rounded-none opacity-40" />
        <div className="relative z-10 flex justify-between">
          <Skeleton className="h-6 w-24 rounded-full" />
          <Skeleton className="h-9 w-9 rounded-full" />
        </div>
        <div className="relative z-10 space-y-2.5">
          <Skeleton className="h-4 w-32 rounded-md" />
          <Skeleton className="h-8 w-3/4 rounded-xl" />
          <Skeleton className="h-4 w-1/2 rounded-md" />
          <div className="flex gap-3 pt-2">
            <Skeleton className="h-11 flex-1 rounded-2xl" />
            <Skeleton className="h-11 flex-1 rounded-2xl" />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Complete Skeleton Screen for the entire Home Screen
 */
export function HomeScreenSkeleton() {
  return (
    <div className="min-h-screen pb-32 animate-fade-in" aria-busy="true" aria-label="Chargement de l'accueil">
      {/* Header Skeleton */}
      <header className="px-5 pt-7 pb-3">
        <div className="flex items-center gap-2.5 mb-3.5">
          <Skeleton className="w-9 h-9 rounded-2xl" />
          <div className="space-y-1">
            <Skeleton className="h-4 w-28 rounded-md" />
            <Skeleton className="h-2.5 w-36 rounded-md" />
          </div>
        </div>

        <div className="flex items-center justify-between mb-4">
          <div className="space-y-1.5">
            <Skeleton className="h-6 w-40 rounded-lg" />
            <Skeleton className="h-3.5 w-32 rounded-md" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="w-10 h-10 rounded-full" />
            <Skeleton className="w-10 h-10 rounded-full" />
            <Skeleton className="w-10 h-10 rounded-full" />
          </div>
        </div>

        {/* Search Bar Skeleton */}
        <div className="flex items-center gap-2.5">
          <Skeleton className="h-12 flex-1 rounded-2xl" />
          <Skeleton className="h-12 w-12 rounded-2xl shrink-0" />
        </div>
      </header>

      {/* Featured Carousel Skeleton */}
      <section className="mt-3 px-5">
        <FeaturedCarouselSkeleton />
      </section>

      {/* Categories Skeleton */}
      <section className="mt-8 px-5">
        <Skeleton className="h-6 w-48 rounded-lg mb-3" />
        <div className="grid grid-cols-4 gap-2.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="aspect-square rounded-[1.35rem] bg-white/70 dark:bg-white/5 border border-black/5 dark:border-white/10 p-3 flex flex-col items-center justify-center gap-2">
              <Skeleton className="w-6 h-6 rounded-full" />
              <Skeleton className="h-2.5 w-12 rounded-md" />
            </div>
          ))}
        </div>
      </section>

      {/* Trending Deck Skeleton */}
      <section className="mt-9 px-5">
        <TrendingDeckSkeleton />
      </section>

      {/* Nearby Horizontal Skeleton */}
      <section className="mt-8 px-5">
        <div className="flex items-center justify-between mb-3">
          <div className="space-y-1">
            <Skeleton className="h-6 w-40 rounded-lg" />
            <Skeleton className="h-3 w-48 rounded-md" />
          </div>
          <Skeleton className="h-8 w-20 rounded-full" />
        </div>
        <div className="flex gap-3.5 overflow-hidden -mx-5 px-5">
          {Array.from({ length: 3 }).map((_, i) => (
            <NearbyTileSkeleton key={i} />
          ))}
        </div>
      </section>

      {/* Recommended Grid Skeleton */}
      <section className="mt-9 px-5">
        <div className="flex items-center justify-between mb-4">
          <div className="space-y-1">
            <Skeleton className="h-6 w-44 rounded-lg" />
            <Skeleton className="h-3 w-36 rounded-md" />
          </div>
          <Skeleton className="h-8 w-20 rounded-full" />
        </div>
        <div className="grid grid-cols-2 gap-3.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <EventCardSkeleton key={i} />
          ))}
        </div>
      </section>
    </div>
  );
}

/**
 * Complete Skeleton Screen for the Explore Screen
 */
export function ExploreScreenSkeleton() {
  return (
    <div className="min-h-screen pb-32 animate-fade-in" aria-busy="true" aria-label="Chargement de la recherche">
      {/* Sticky Header Skeleton */}
      <div className="sticky top-0 z-30 px-5 pt-7 pb-4 bg-white/85 dark:bg-[#14121E]/85 backdrop-blur-2xl border-b border-black/[0.05] dark:border-white/[0.08]">
        <div className="max-w-md mx-auto space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Skeleton className="h-3 w-32 rounded-md" />
              <Skeleton className="h-8 w-36 rounded-xl" />
            </div>
            <Skeleton className="w-11 h-11 rounded-2xl" />
          </div>

          <Skeleton className="h-12 w-full rounded-2xl" />

          {/* Category Chips Skeleton */}
          <div className="flex gap-2 overflow-hidden pt-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-20 shrink-0 rounded-full" />
            ))}
          </div>
        </div>
      </div>

      {/* Grid Results Skeleton */}
      <div className="max-w-md mx-auto px-5 mt-4">
        <div className="grid grid-cols-2 gap-3.5">
          {Array.from({ length: 6 }).map((_, i) => (
            <EventCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton for Tickets Screen (Apple Wallet pass style)
 */
export function TicketsScreenSkeleton() {
  return (
    <div className="min-h-screen pb-32 animate-fade-in" aria-busy="true" aria-label="Chargement de vos billets">
      <div className="px-5 pt-8 pb-3">
        <Skeleton className="h-3 w-28 rounded-md mb-1.5" />
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-36 rounded-xl" />
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
        <Skeleton className="h-3 w-56 rounded-md mt-2" />

        {/* Tab switch */}
        <div className="mt-4 p-1 rounded-2xl bg-black/[0.04] dark:bg-white/[0.06] flex gap-1">
          <Skeleton className="h-9 flex-1 rounded-xl" />
          <Skeleton className="h-9 flex-1 rounded-xl" />
        </div>
      </div>

      {/* Ticket Cards Skeleton */}
      <div className="px-5 mt-5 space-y-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <div
            key={i}
            className="rounded-3xl overflow-hidden bg-white/85 dark:bg-[#1A1829]/90 border border-black/[0.06] dark:border-white/[0.08] shadow-sm p-4 space-y-4"
          >
            <div className="flex gap-3.5">
              <Skeleton className="w-16 h-16 rounded-2xl shrink-0" />
              <div className="space-y-2 flex-1 min-w-0">
                <Skeleton className="h-4 w-3/4 rounded-md" />
                <Skeleton className="h-3 w-1/2 rounded-md" />
                <Skeleton className="h-3 w-2/3 rounded-md" />
              </div>
            </div>

            <div className="border-t border-dashed border-black/10 dark:border-white/10 pt-3 flex items-center justify-between">
              <div className="space-y-1">
                <Skeleton className="h-2.5 w-16 rounded-md" />
                <Skeleton className="h-4 w-24 rounded-md" />
              </div>
              <Skeleton className="w-12 h-12 rounded-xl" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Skeleton for Profile Screen (Apple glass profile card style)
 */
export function ProfileScreenSkeleton() {
  return (
    <div className="min-h-screen pb-40 animate-fade-in" aria-busy="true" aria-label="Chargement de votre profil">
      <div className="max-w-md mx-auto">
        <div className="px-5 pt-5 flex items-center justify-between">
          <Skeleton className="h-6 w-28 rounded-lg" />
          <Skeleton className="w-10 h-10 rounded-2xl" />
        </div>

        {/* Profile Card Header Skeleton */}
        <div className="px-5 pt-6 pb-3">
          <div className="rounded-[2.5rem] bg-white/85 dark:bg-[#151322]/90 backdrop-blur-2xl p-6 border border-black/[0.06] dark:border-white/[0.08] shadow-sm space-y-4">
            <div className="flex items-start justify-between">
              <Skeleton className="w-22 h-22 rounded-[1.8rem]" />
              <div className="flex gap-2">
                <Skeleton className="w-10 h-10 rounded-2xl" />
                <Skeleton className="w-10 h-10 rounded-2xl" />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Skeleton className="h-6 w-36 rounded-xl" />
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
              <Skeleton className="h-3.5 w-24 rounded-md" />
              <Skeleton className="h-3 w-48 rounded-md" />
            </div>

            {/* 3 Stats Widgets */}
            <div className="grid grid-cols-3 gap-2 pt-3 border-t border-black/[0.05] dark:border-white/[0.08]">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="p-2.5 rounded-2xl bg-gray-50/80 dark:bg-white/[0.04] text-center space-y-1.5">
                  <Skeleton className="h-5 w-10 mx-auto rounded-md" />
                  <Skeleton className="h-2.5 w-14 mx-auto rounded-md" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Action banner skeleton */}
        <div className="px-5 mt-2">
          <Skeleton className="h-16 w-full rounded-[2rem]" />
        </div>

        {/* Events list skeleton */}
        <div className="px-5 mt-6 space-y-3">
          <Skeleton className="h-5 w-32 rounded-lg" />
          <div className="grid grid-cols-2 gap-3.5">
            {Array.from({ length: 2 }).map((_, i) => (
              <EventCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton for Subscriptions Screen
 */
export function SubscriptionsScreenSkeleton() {
  return (
    <div className="min-h-screen animate-fade-in" aria-busy="true">
      <div className="sticky top-0 z-20 bg-white/80 dark:bg-[#14121E]/80 backdrop-blur-xl border-b border-gray-100 dark:border-white/10">
        <div className="max-w-md mx-auto px-5 py-4 flex items-center gap-3">
          <Skeleton className="w-10 h-10 rounded-full" />
          <Skeleton className="h-6 w-36 rounded-xl" />
        </div>
        <div className="max-w-md mx-auto px-5 pb-3 flex gap-2">
          <Skeleton className="h-8 w-24 rounded-full" />
          <Skeleton className="h-8 w-28 rounded-full" />
          <Skeleton className="h-8 w-24 rounded-full" />
        </div>
      </div>
      <div className="max-w-md mx-auto px-5 py-4 pb-32 space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="p-4 rounded-2xl bg-white/80 dark:bg-white/5 border border-black/5 dark:border-white/10 flex items-center gap-3">
            <Skeleton className="w-12 h-12 rounded-full shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-32 rounded-md" />
              <Skeleton className="h-3 w-20 rounded-md" />
            </div>
            <Skeleton className="h-8 w-20 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Skeleton for User Profile View Screen
 */
export function UserProfileScreenSkeleton() {
  return (
    <div className="min-h-screen pb-32 animate-fade-in" aria-busy="true">
      <div className="relative h-48 bg-gradient-to-br from-[#6600FF]/15 via-[#9D4EDD]/10 to-[#EDE8FF] dark:to-[#120E20]">
        <div className="absolute top-4 left-0 right-0 px-5">
          <Skeleton className="w-10 h-10 rounded-full" />
        </div>
      </div>
      <div className="max-w-md mx-auto px-5 -mt-16 relative space-y-4">
        <div className="flex flex-col items-center">
          <Skeleton className="w-28 h-28 rounded-full border-4 border-white dark:border-[#14121E]" />
          <Skeleton className="h-6 w-40 rounded-xl mt-3" />
          <Skeleton className="h-4 w-28 rounded-md mt-2" />
        </div>
        <div className="grid grid-cols-2 gap-3 mt-4">
          <div className="p-3 rounded-2xl bg-white/80 dark:bg-white/5 text-center space-y-1">
            <Skeleton className="h-6 w-10 mx-auto rounded-md" />
            <Skeleton className="h-3 w-16 mx-auto rounded-md" />
          </div>
          <div className="p-3 rounded-2xl bg-white/80 dark:bg-white/5 text-center space-y-1">
            <Skeleton className="h-6 w-10 mx-auto rounded-md" />
            <Skeleton className="h-3 w-16 mx-auto rounded-md" />
          </div>
        </div>
        <div className="p-4 rounded-2xl bg-white/80 dark:bg-white/5 space-y-2">
          <Skeleton className="h-3 w-20 rounded-md" />
          <Skeleton className="h-4 w-full rounded-md" />
          <Skeleton className="h-4 w-3/4 rounded-md" />
        </div>
      </div>
    </div>
  );
}
