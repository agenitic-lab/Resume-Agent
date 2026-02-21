/**
 * Skeleton – lightweight shimmer placeholder for content loading states.
 * Usage:
 *   <Skeleton className="h-4 w-40 rounded-xl" />
 *   <Skeleton className="h-10 w-10 rounded-full" />
 */
export function Skeleton({ className = '' }) {
    return (
        <div
            className={`relative overflow-hidden bg-gray-200 rounded-xl ${className}`}
        >
            <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.4s_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent" />
        </div>
    );
}
