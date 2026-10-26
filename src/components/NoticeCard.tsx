import Link from "next/link";
import { summarizeNotice } from "@/domain/notice-summary";
import type { Notice } from "@/domain/types";

export function NoticeCard({ notice }: { notice: Notice | null }) {
  return (
    <section className="rounded-2xl bg-neutral-50 p-4">
      <h2 className="text-sm font-semibold text-neutral-700">공지사항</h2>
      {notice ? (
        <Link href={`/notices/${notice.id}`} className="mt-3 block space-y-1">
          <p className="break-words text-lg font-bold">{notice.title}</p>
          <p className="break-words text-sm text-neutral-600">{summarizeNotice(notice.body)}</p>
        </Link>
      ) : (
        <p className="mt-3 text-neutral-500">등록된 공지가 없습니다</p>
      )}
    </section>
  );
}
