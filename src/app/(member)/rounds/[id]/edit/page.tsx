import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { RoundForm } from "@/components/RoundForm";
import { getCurrentMember } from "@/lib/members";
import { fetchRound } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import { updateRound } from "../../actions";

export const dynamic = "force-dynamic";

/** UTC ISO 시각을 `datetime-local` 값(KST)으로 바꾼다. */
function toKstInput(iso: string): string {
  return new Date(new Date(iso).getTime() + 9 * 3600_000).toISOString().slice(0, 16);
}

export default async function EditRoundPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const member = await getCurrentMember();
  if (member?.role !== "manager") redirect(`/rounds/${id}`);

  const round = await fetchRound(await createClient(), id);
  if (!round) notFound();

  return (
    <main className="space-y-4 py-2">
      <Link href={`/rounds/${id}`} className="text-sm text-neutral-500">
        ← 라운딩
      </Link>
      <h1 className="text-lg font-bold">라운딩 수정</h1>
      <RoundForm
        submitLabel="저장"
        initial={{
          kind: round.kind,
          startsAt: toKstInput(round.startsAt),
          location: round.location,
          fee: String(round.fee),
          capacity: round.capacity === null ? "" : String(round.capacity),
        }}
        onSubmit={updateRound.bind(null, id)}
      />
    </main>
  );
}
