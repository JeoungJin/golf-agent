import Link from "next/link";
import { RoundForm } from "@/components/RoundForm";
import { createRound } from "../actions";

export default function NewRoundPage() {
  return (
    <main className="space-y-4 py-2">
      <Link href="/rounds" className="text-sm text-neutral-500">
        ← 라운딩
      </Link>
      <h1 className="text-lg font-bold">라운딩 등록</h1>
      <RoundForm submitLabel="등록" onSubmit={createRound} />
    </main>
  );
}
