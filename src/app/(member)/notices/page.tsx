import Link from "next/link";
import { RefreshRetry } from "@/components/ErrorRetry";
import { getCurrentMember } from "@/lib/members";
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
  const [notices, member] = await Promise.all([
    fetchNotices(await createClient()),
    getCurrentMember(),
  ]);

  return (
    <main className="space-y-3 py-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold">공지사항</h1>
        {member?.role === "manager" && (
          <Link
            href="/notices/new"
            className="rounded-full border border-green-700 px-3 py-1 text-xs font-medium text-green-700"
          >
            공지 작성
          </Link>
        )}
      </div>
      {notices === null ? (
        <RefreshRetry />
      ) : notices.length === 0 ? (
        <p className="text-neutral-500">등록된 공지가 없습니다</p>
      ) : (
        <ul className="divide-y divide-neutral-200 overflow-hidden rounded-2xl border border-neutral-200">
          {notices.map((n) => (
            <li key={n.id} className="odd:bg-neutral-50 even:bg-neutral-200/60 dark:odd:bg-neutral-900 dark:even:bg-neutral-800">
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
