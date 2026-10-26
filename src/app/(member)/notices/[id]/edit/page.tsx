import { notFound } from "next/navigation";
import { NoticeForm } from "@/components/NoticeForm";
import { fetchNotice } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import { updateNotice } from "../../actions";

export const dynamic = "force-dynamic";

export default async function EditNoticePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const notice = await fetchNotice(supabase, id);
  if (!notice) notFound();

  return (
    <main className="space-y-4 py-2">
      <h1 className="text-lg font-bold">공지 수정</h1>
      <NoticeForm
        submitLabel="저장"
        initial={{ title: notice.title, body: notice.body }}
        onSubmit={updateNotice.bind(null, id)}
      />
    </main>
  );
}
