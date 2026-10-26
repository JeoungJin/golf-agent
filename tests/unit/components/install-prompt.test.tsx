import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { InstallPrompt } from "@/components/InstallPrompt";

const IOS_UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15";
const ANDROID_UA = "Mozilla/5.0 (Linux; Android 14; Pixel 7) Chrome/120 Mobile";

function setUserAgent(ua: string) {
  Object.defineProperty(window.navigator, "userAgent", { value: ua, configurable: true });
}

function setStandalone(matches: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: query.includes("standalone") ? matches : false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })) as unknown as typeof window.matchMedia;
}

beforeEach(() => {
  localStorage.clear();
  setStandalone(false);
  setUserAgent(IOS_UA);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("InstallPrompt", () => {
  it("iOS에서는 공유 버튼 → 홈 화면에 추가 안내를 보여 준다", async () => {
    render(<InstallPrompt />);
    expect(await screen.findByText(/공유 버튼/)).toBeInTheDocument();
    expect(screen.getAllByText(/홈 화면에 추가/).length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: "추가하기" })).not.toBeInTheDocument();
  });

  it("Android에서 beforeinstallprompt를 받으면 '추가하기'가 prompt()를 호출한다", async () => {
    setUserAgent(ANDROID_UA);
    render(<InstallPrompt />);

    const prompt = vi.fn().mockResolvedValue(undefined);
    const event = Object.assign(new Event("beforeinstallprompt"), {
      prompt,
      userChoice: Promise.resolve({ outcome: "accepted" }),
    });
    await act(async () => {
      window.dispatchEvent(event);
    });

    fireEvent.click(await screen.findByRole("button", { name: "추가하기" }));
    expect(prompt).toHaveBeenCalledTimes(1);
  });

  it("닫기를 누르면 팝업이 사라지고 닫은 시각이 저장된다", async () => {
    render(<InstallPrompt />);
    fireEvent.click(await screen.findByRole("button", { name: "닫기" }));
    expect(screen.queryByRole("button", { name: "닫기" })).not.toBeInTheDocument();
    expect(Number(localStorage.getItem("install-prompt:dismissedAt"))).toBeGreaterThan(0);
  });

  it("'다시 보지 않기'를 누르면 영구 숨김이 저장되고 다음 렌더에서도 보이지 않는다", async () => {
    const { unmount } = render(<InstallPrompt />);
    fireEvent.click(await screen.findByRole("button", { name: "다시 보지 않기" }));
    expect(localStorage.getItem("install-prompt:neverShow")).toBe("1");
    unmount();

    render(<InstallPrompt />);
    expect(screen.queryByRole("button", { name: "닫기" })).not.toBeInTheDocument();
  });

  it("최근에 닫았다면 표시하지 않는다", () => {
    localStorage.setItem("install-prompt:dismissedAt", String(Date.now()));
    render(<InstallPrompt />);
    expect(screen.queryByRole("button", { name: "닫기" })).not.toBeInTheDocument();
  });

  it("이미 standalone으로 실행 중이면 표시하지 않는다", () => {
    setStandalone(true);
    render(<InstallPrompt />);
    expect(screen.queryByRole("button", { name: "닫기" })).not.toBeInTheDocument();
  });

  it("localStorage 접근이 실패해도 오류 없이 동작한다", async () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });

    render(<InstallPrompt />);
    const close = await screen.findByRole("button", { name: "닫기" });
    expect(() => fireEvent.click(close)).not.toThrow();
    expect(screen.queryByRole("button", { name: "닫기" })).not.toBeInTheDocument();
  });
});
