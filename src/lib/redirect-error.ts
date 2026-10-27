/** Next.js 의 `redirect()` 가 던지는 예외인지 판별한다 (digest 가 `NEXT_REDIRECT` 로 시작). */
export function isRedirectError(error: unknown): boolean {
  const digest = (error as { digest?: unknown } | null)?.digest;
  return typeof digest === "string" && digest.startsWith("NEXT_REDIRECT");
}
