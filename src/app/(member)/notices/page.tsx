import Link from "next/link";
import { RefreshRetry } from "@/components/ErrorRetry";
import { fetchNotices } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const dateFormat = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "long",
  day: "numeric",
});

export default async function NoticeListPage() {
  const notices = await fetchNotices(await createClient());

  return (
    <main className="space-y-3 py-2">
      <div className="flex items-center justify-between">
        <Link href="/" className="text-sm text-neutral-500">
          ← 홈
        </Link>
      </div>
      <h1 className="text-lg font-bold">공지 목록</h1>
      {notices === null ? (
        <RefreshRetry />
      ) : notices.length === 0 ? (
        <p className="text-neutral-500">등록된 공지가 없습니다</p>
      ) : (
        <ul className="divide-y divide-neutral-200 rounded-2xl bg-neutral-50">
          {notices.map((n) => (
            <li key={n.id}>
              <Link href={`/notices/${n.id}`} className="block px-4 py-3">
                <p className="break-words font-semibold">{n.title}</p>
                <p className="mt-0.5 text-xs text-neutral-500">
                  {dateFormat.format(new Date(n.createdAt))}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
