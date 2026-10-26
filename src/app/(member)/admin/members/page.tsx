import { RefreshRetry } from "@/components/ErrorRetry";
import { PendingMemberList } from "@/components/PendingMemberList";
import { createClient } from "@/lib/supabase/server";
import { approveMember, rejectMember } from "./actions";

export default async function AdminMembersPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("members")
    .select("id, nickname, created_at")
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  if (error) {
    return (
      <main className="py-2">
        <RefreshRetry />
      </main>
    );
  }

  const members = (data ?? []).map((m) => ({
    id: m.id,
    nickname: m.nickname,
    createdAt: m.created_at,
  }));

  return (
    <main className="py-2">
      <h1 className="mb-2 text-lg font-bold">가입신청 목록</h1>
      <PendingMemberList members={members} onApprove={approveMember} onReject={rejectMember} />
    </main>
  );
}
