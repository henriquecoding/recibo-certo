// Skeleton animado para DistribuicaoDonut enquanto carrega via next/dynamic
export default function DonutSkeleton() {
  return (
    <div className="rounded-4xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 p-6 shadow-card animate-pulse">
      <div className="mb-4 h-4 w-28 rounded-xl bg-stone-100 dark:bg-stone-800" />
      <div className="flex items-center justify-center py-2">
        <div className="h-28 w-28 rounded-full border-8 border-stone-100 dark:border-stone-800 bg-stone-50 dark:bg-stone-900" />
      </div>
      <div className="mt-4 space-y-2">
        {[70, 50, 40].map((w, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="h-2.5 w-2.5 rounded-full bg-stone-100 dark:bg-stone-800" />
            <div className={`h-3 rounded-lg bg-stone-100 dark:bg-stone-800`} style={{ width: `${w}%` }} />
          </div>
        ))}
      </div>
    </div>
  );
}
