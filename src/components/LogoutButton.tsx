"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function LogoutButton() {
  const router = useRouter();

  async function handleClick() {
    await createClient().auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <button type="button" onClick={handleClick} className="shrink-0 rounded-md border border-neutral-300 px-2 py-0.5 text-xs text-neutral-500">
      로그아웃
    </button>
  );
}
