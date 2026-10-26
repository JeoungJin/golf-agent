import Link from "next/link";
import { RefreshRetry } from "@/components/ErrorRetry";
import { RoundListItem } from "@/components/RoundListItem";
import type { Round, Vote } from "@/domain/types";
import { getCurrentMember } from "@/lib/members";
import { fetchRoundList } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function Section({
  title,
  rounds,
  votes,
  emptyText,
}: {
  title: string;
  rounds: Round[];
  votes: Vote[];
  emptyText?: string;
}) {
  const attending = (roundId: string) =>
    votes.filter((v) => v.roundId === roundId && v.status === "attending").length;

  return (
    <section aria-label={title} className="space-y-2">
      <h2 className="text-sm font-semibold text-neutral-700">{title}</h2>
      {rounds.length === 0 ? (
        emptyText && <p className="text-neutral-500">{emptyText}</p>
      ) : (
        <ul className="divide-y divide-neutral-200 rounded-2xl bg-neutral-50">
          {rounds.map((round) => (
            <li key={round.id}>
              <RoundListItem round={round} attending={attending(round.id)} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default async function RoundsPage() {
  const supabase = await createClient();
  const [data, member] = await Promise.all([fetchRoundList(supabase), getCurrentMember()]);

  return (
    <main className="space-y-4 py-2">
      <div className="flex items-center justify-between">
        <Link href="/" className="text-sm text-neutral-500">
          ← 홈
        </Link>
        {member?.role === "manager" && (
          <Link
            href="/rounds/new"
            className="rounded-full border border-green-700 px-3 py-1 text-xs font-medium text-green-700"
          >
            라운딩 등록
          </Link>
        )}
      </div>
      <h1 className="text-lg font-bold">라운딩</h1>

      {!data.ok ? (
        <RefreshRetry />
      ) : data.upcoming.length === 0 && data.past.length === 0 ? (
        <p className="text-neutral-500">등록된 라운딩이 없습니다</p>
      ) : (
        <>
          <Section
            title="예정 라운딩"
            rounds={data.upcoming}
            votes={data.votes}
            emptyText="예정된 라운딩이 없습니다"
          />
          {data.past.length > 0 && <Section title="지난 라운딩" rounds={data.past} votes={data.votes} />}
        </>
      )}
    </main>
  );
}
