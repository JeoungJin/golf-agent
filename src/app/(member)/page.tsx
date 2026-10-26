import { NextRoundCard } from "@/components/NextRoundCard";
import { NoticeCard } from "@/components/NoticeCard";
import { RefreshRetry } from "@/components/ErrorRetry";
import { fetchHomeData } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const supabase = await createClient();
  const data = await fetchHomeData(supabase);

  if (!data.ok) {
    return (
      <main className="py-4">
        <RefreshRetry />
      </main>
    );
  }

  return (
    <main className="space-y-4 py-2">
      <NextRoundCard round={data.round} />
      <NoticeCard notice={data.notice} />
    </main>
  );
}
