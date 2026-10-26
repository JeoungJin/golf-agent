import { NoticeForm } from "@/components/NoticeForm";
import { createNotice } from "../actions";

export default function NewNoticePage() {
  return (
    <main className="space-y-4 py-2">
      <h1 className="text-lg font-bold">공지 작성</h1>
      <NoticeForm submitLabel="등록" onSubmit={createNotice} />
    </main>
  );
}
