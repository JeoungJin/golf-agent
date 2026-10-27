import Link from "next/link";
import { RoundForm } from "@/components/RoundForm";
import { parseKindFilter } from "@/domain/round-filter";
import { createRound } from "../actions";

export default async function NewRoundPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string | string[] }>;
}) {
  // 목록에서 보던 종류(스크린/필드)를 초기값으로 선택해 둔다. 없으면 스크린.
  const kind = parseKindFilter((await searchParams).kind) ?? "screen";

  return (
    <main className="space-y-4 py-2">
      <Link href={`/rounds?kind=${kind}`} className="text-sm text-neutral-500">
        ← 라운딩
      </Link>
      <h1 className="text-lg font-bold">라운딩 등록</h1>
      <RoundForm
        submitLabel="등록"
        initial={{ kind, startsAt: "", location: "", fee: "0", capacity: "" }}
        onSubmit={createRound}
      />
    </main>
  );
}
