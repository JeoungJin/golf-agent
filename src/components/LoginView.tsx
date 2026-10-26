import { KakaoLoginButton } from "./KakaoLoginButton";

const MESSAGES: Record<string, string> = {
  access_denied: "카카오 계정 정보 제공에 동의해야 로그인할 수 있습니다.",
};
const DEFAULT_MESSAGE = "로그인에 실패했습니다. 다시 시도해 주세요.";

export function LoginView({ error }: { error?: string }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-8 py-12">
      <div className="text-center">
        <h1 className="text-2xl font-bold">골프사랑</h1>
        <p className="mt-2 text-sm text-neutral-500">
          스크린골프 · 필드 모임 일정과 공지를 한곳에서
        </p>
      </div>
      <div className="flex w-full flex-col items-center">
        {error && (
          <p role="alert" className="mb-3 text-center text-sm text-red-600">
            {MESSAGES[error] ?? DEFAULT_MESSAGE}
          </p>
        )}
        <KakaoLoginButton />
      </div>
    </main>
  );
}
