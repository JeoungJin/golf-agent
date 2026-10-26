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
    <button type="button" onClick={handleClick} className="text-sm text-neutral-500 underline">
      로그아웃
    </button>
  );
}
