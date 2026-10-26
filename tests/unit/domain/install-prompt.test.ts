import { describe, expect, it } from "vitest";
import { detectPlatform, shouldShowInstallPrompt } from "@/domain/install-prompt";

const DAY = 24 * 60 * 60 * 1000;
const now = new Date("2026-11-10T12:00:00Z").getTime();

describe("shouldShowInstallPrompt", () => {
  const base = { isStandalone: false, dismissedAt: null, neverShow: false, now };

  it("기록이 없으면 표시한다", () => {
    expect(shouldShowInstallPrompt(base)).toBe(true);
  });

  it("이미 홈 화면 앱(standalone)으로 실행 중이면 표시하지 않는다", () => {
    expect(shouldShowInstallPrompt({ ...base, isStandalone: true })).toBe(false);
  });

  it("'다시 보지 않기'를 선택했으면 표시하지 않는다", () => {
    expect(shouldShowInstallPrompt({ ...base, neverShow: true })).toBe(false);
  });

  it("닫은 지 7일 미만이면 표시하지 않는다", () => {
    expect(shouldShowInstallPrompt({ ...base, dismissedAt: now - 7 * DAY + 1 })).toBe(false);
  });

  it("닫은 지 정확히 7일이 지나면 다시 표시한다", () => {
    expect(shouldShowInstallPrompt({ ...base, dismissedAt: now - 7 * DAY })).toBe(true);
  });

  it("닫은 지 7일을 넘으면 표시한다", () => {
    expect(shouldShowInstallPrompt({ ...base, dismissedAt: now - 30 * DAY })).toBe(true);
  });
});

describe("detectPlatform", () => {
  it("iPhone/iPad를 ios로 판별한다", () => {
    expect(
      detectPlatform("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15"),
    ).toBe("ios");
    expect(detectPlatform("Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)")).toBe("ios");
  });

  it("Android를 android로 판별한다", () => {
    expect(detectPlatform("Mozilla/5.0 (Linux; Android 14; Pixel 7) Chrome/120 Mobile")).toBe(
      "android",
    );
  });

  it("그 외는 other로 판별한다", () => {
    expect(detectPlatform("Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120")).toBe("other");
    expect(detectPlatform("")).toBe("other");
  });
});
