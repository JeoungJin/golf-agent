import Link from "next/link";
import { LogoutButton } from "@/components/LogoutButton";

export default function PendingPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 text-center">
      <h1 className="text-xl font-bold">승인 대기 중입니다</h1>
      <p className="text-sm text-neutral-600">
        모임 매니저가 가입을 승인하면 일정과 공지를 볼 수 있어요.
        <br />
        승인 후 아래 버튼으로 다시 확인해 주세요.
      </p>
      <Link href="/" className="rounded-xl bg-green-700 px-5 py-3 text-sm font-semibold text-white">
        다시 확인
      </Link>
      <LogoutButton />
    </main>
  );
}
