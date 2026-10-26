import { LogoutButton } from "@/components/LogoutButton";

export default function RejectedPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 text-center">
      <h1 className="text-xl font-bold">가입이 승인되지 않았습니다</h1>
      <p className="text-sm text-neutral-600">
        모임 매니저에게 문의해 주세요.
      </p>
      <LogoutButton />
    </main>
  );
}
