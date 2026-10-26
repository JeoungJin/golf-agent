import Link from "next/link";
import { InstallPrompt } from "@/components/InstallPrompt";
import { NextRoundCard } from "@/components/NextRoundCard";
import { NoticeCard } from "@/components/NoticeCard";
import { RefreshRetry } from "@/components/ErrorRetry";
import { getCurrentMember } from "@/lib/members";
import { fetchHomeData } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const supabase = await createClient();
  const [data, member] = await Promise.all([fetchHomeData(supabase), getCurrentMember()]);

  if (!data.ok) {
    return (
      <main className="py-4">
        <RefreshRetry />
      </main>
    );
  }

  return (
    <main className="space-y-4 py-2">
      <InstallPrompt />
      <NextRoundCard round={data.round} />
      <NoticeCard notice={data.notice} />
      {member?.role === "manager" && (
        <Link
          href="/notices/new"
          className="block rounded-xl border border-green-700 px-4 py-3 text-center font-medium text-green-700"
        >
          공지 작성
        </Link>
      )}
    </main>
  );
}
