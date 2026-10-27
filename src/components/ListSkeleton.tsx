/** 데이터를 불러오는 동안 보이는 목록 골격. 빈 화면 대신 구조를 먼저 보여 준다. */
export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <main aria-busy="true" aria-label="불러오는 중" className="space-y-3 py-4">
      <div className="h-6 w-32 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
      <ul className="space-y-2">
        {Array.from({ length: rows }, (_, i) => (
          <li key={i} className="h-20 animate-pulse rounded-2xl bg-neutral-100 dark:bg-neutral-900" />
        ))}
      </ul>
    </main>
  );
}
