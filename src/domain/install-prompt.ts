export type Platform = "ios" | "android" | "other";

export const INSTALL_PROMPT_SUPPRESS_MS = 7 * 24 * 60 * 60 * 1000;

export type InstallPromptState = {
  isStandalone: boolean;
  /** 마지막으로 닫은 시각(ms). 기록이 없으면 null */
  dismissedAt: number | null;
  neverShow: boolean;
  now: number;
};

export function shouldShowInstallPrompt({
  isStandalone,
  dismissedAt,
  neverShow,
  now,
}: InstallPromptState): boolean {
  if (isStandalone || neverShow) return false;
  if (dismissedAt === null) return true;
  return now - dismissedAt >= INSTALL_PROMPT_SUPPRESS_MS;
}

export function detectPlatform(userAgent: string): Platform {
  if (/iPhone|iPad|iPod/i.test(userAgent)) return "ios";
  if (/Android/i.test(userAgent)) return "android";
  return "other";
}
