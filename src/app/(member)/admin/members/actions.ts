"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function change(rpc: "approve_member" | "reject_member", id: string) {
  const supabase = await createClient();
  // 권한 검사는 DB(RPC)에서 강제한다. 매니저가 아니면 오류가 반환된다.
  const { error } = await supabase.rpc(rpc, { target: id });
  if (error) throw new Error("처리하지 못했습니다. 잠시 후 다시 시도해 주세요.");
  revalidatePath("/admin/members");
}

export async function approveMember(id: string) {
  await change("approve_member", id);
}

export async function rejectMember(id: string) {
  await change("reject_member", id);
}
