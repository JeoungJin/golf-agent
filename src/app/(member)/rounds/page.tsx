import Link from "next/link";
import { redirect } from "next/navigation";
import { RefreshRetry } from "@/components/ErrorRetry";
import { RoundListItem } from "@/components/RoundListItem";
import { roundKindLabel } from "@/domain/format";
import { parseKindFilter } from "@/domain/round-filter";
import type { Round, Vote } from "@/domain/types";
import { getCurrentMember } from "@/lib/members";
import { fetchRoundList } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// 예정 라운딩은 행마다 다른 파스텔 색을 돌려 가며 써서 서로 구분한다.
const UPCOMING_ROW_COLORS = [
  "bg-sky-100 dark:bg-sky-950",
  "bg-emerald-100 dark:bg-emerald-950",
  "bg-amber-100 dark:bg-amber-950",
  "bg-rose-100 dark:bg-rose-950",
  "bg-violet-100 dark:bg-violet-950",
];

function Section({
  title,
  rounds,
  votes,
  emptyText,
  past = false,
}: {
  title: string;
  rounds: Round[];
  votes: Vote[];
  emptyText?: string;
  past?: boolean;
}) {
  const attending = (roundId: string) =>
    votes.filter((v) => v.roundId === roundId && v.status === "attending").length;

  return (
    <section aria-label={title} className="space-y-2">
      <h2
        className={`flex items-center gap-2 text-sm font-bold ${past ? "text-neutral-500" : "text-green-800"}`}
      >
        <span aria-hidden="true" className={`size-2 rounded-full ${past ? "bg-neutral-400" : "bg-green-600"}`} />
        {title}
      </h2>
      {rounds.length === 0 ? (
        emptyText && <p className="text-neutral-500">{emptyText}</p>
      ) : (
        <ul
          className={`divide-y overflow-hidden rounded-2xl ${
            past
              ? "divide-neutral-200 border border-dashed border-neutral-300"
              : "divide-neutral-200 border border-neutral-300"
          }`}
        >
          {rounds.map((round, i) => (
            <li
              key={round.id}
              className={
                past
                  ? "odd:bg-neutral-50 even:bg-neutral-200/70 dark:odd:bg-neutral-900 dark:even:bg-neutral-800"
                  : UPCOMING_ROW_COLORS[i % UPCOMING_ROW_COLORS.length]
              }
            >
              <RoundListItem round={round} attending={attending(round.id)} isPast={past} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default async function RoundsPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string | string[] }>;
}) {
  const kind = parseKindFilter((await searchParams).kind);
  if (!kind) redirect("/rounds?kind=screen");
  const supabase = await createClient();
  const [data, member] = await Promise.all([
    fetchRoundList(supabase, new Date(), kind),
    getCurrentMember(),
  ]);
  const prefix = `${roundKindLabel(kind)} `;

  return (
    <main className="space-y-5 py-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold">{prefix}라운딩</h1>
        {member?.role === "manager" && (
          <Link
            href={`/rounds/new?kind=${kind}`}
            className="rounded-full border border-green-700 px-3 py-1 text-xs font-medium text-green-700"
          >
            라운딩 등록
          </Link>
        )}
      </div>

      {!data.ok ? (
        <RefreshRetry />
      ) : data.upcoming.length === 0 && data.past.length === 0 ? (
        <p className="text-neutral-500">등록된 {prefix}라운딩이 없습니다</p>
      ) : (
        <>
          <Section
            title="예정 라운딩"
            rounds={data.upcoming}
            votes={data.votes}
            emptyText="예정된 라운딩이 없습니다"
          />
          {data.past.length > 0 && (
            <Section title="지난 라운딩 (종료)" rounds={data.past} votes={data.votes} past />
          )}
        </>
      )}
    </main>
  );
}
