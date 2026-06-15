// Skeleton animado para ReceitaChart enquanto carrega via next/dynamic
export default function ChartSkeleton() {
  return (
    <div className="rounded-4xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 p-6 shadow-card animate-pulse">
      <div className="mb-4 h-4 w-32 rounded-xl bg-stone-100 dark:bg-stone-800" />
      <div className="flex items-end gap-2 h-36">
        {[60, 80, 45, 90, 70, 55, 85, 65, 75, 50, 88, 40].map((h, i) => (
          <div
            key={i}
            className="flex-1 rounded-t-lg bg-stone-100 dark:bg-stone-800"
            style={{ height: `${h}%` }}
          />
        ))}
      </div>
    </div>
  );
}
