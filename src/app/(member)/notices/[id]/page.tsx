import Link from "next/link";
import { notFound } from "next/navigation";
import { fetchNotice } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const dateFormat = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "long",
  day: "numeric",
});

export default async function NoticeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const notice = await fetchNotice(supabase, id);
  if (!notice) notFound();

  return (
    <main className="space-y-3 py-2">
      <Link href="/" className="text-sm text-neutral-500">
        ← 홈
      </Link>
      <h1 className="break-words text-xl font-bold">{notice.title}</h1>
      <p className="text-xs text-neutral-500">{dateFormat.format(new Date(notice.createdAt))}</p>
      <p className="whitespace-pre-wrap break-words">{notice.body}</p>
    </main>
  );
}
