"use client";

import { useEffect, useState } from "react";
import {
  detectPlatform,
  shouldShowInstallPrompt,
  type Platform,
} from "@/domain/install-prompt";

type BeforeInstallPromptEvent = Event & { prompt: () => Promise<void> };

const DISMISSED_KEY = "install-prompt:dismissedAt";
const NEVER_KEY = "install-prompt:neverShow";

// 사생활 보호 모드 등에서 저장소 접근이 막혀도 앱이 깨지지 않도록 모두 감싼다.
function readStorage(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // 저장 실패 시 이번 세션에서만 숨긴다.
  }
}

export function InstallPrompt() {
  const [platform, setPlatform] = useState<Platform>("other");
  const [eligible, setEligible] = useState(false);
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const dismissed = readStorage(DISMISSED_KEY);
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;

    setPlatform(detectPlatform(navigator.userAgent));
    setEligible(
      shouldShowInstallPrompt({
        isStandalone,
        dismissedAt: dismissed ? Number(dismissed) : null,
        neverShow: readStorage(NEVER_KEY) === "1",
        now: Date.now(),
      }),
    );

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstall);
  }, []);

  // iOS는 수동 안내, Android는 설치 이벤트를 받았을 때만 표시한다.
  const visible = eligible && (platform === "ios" || (platform === "android" && installEvent));
  if (!visible) return null;

  function dismiss() {
    writeStorage(DISMISSED_KEY, String(Date.now()));
    setEligible(false);
  }

  function neverShowAgain() {
    writeStorage(NEVER_KEY, "1");
    setEligible(false);
  }

  async function install() {
    if (!installEvent) return;
    await installEvent.prompt();
    setInstallEvent(null);
    dismiss();
  }

  return (
    <section
      aria-label="홈 화면에 추가 안내"
      className="space-y-3 rounded-xl border border-green-700 bg-green-50 p-4"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="font-medium">
          <strong>홈 화면에 추가</strong>하면 앱처럼 바로 열 수 있어요.
        </p>
        <button type="button" onClick={dismiss} className="shrink-0 text-sm text-neutral-500">
          닫기
        </button>
      </div>
      {platform === "ios" ? (
        <p className="text-sm text-neutral-700">
          Safari 하단의 공유 버튼을 누른 뒤 <span>&lsquo;홈 화면에 추가&rsquo;</span>를 선택하세요.
        </p>
      ) : (
        <button
          type="button"
          onClick={install}
          className="w-full rounded-lg bg-green-700 px-4 py-2 font-medium text-white"
        >
          추가하기
        </button>
      )}
      <button type="button" onClick={neverShowAgain} className="text-xs text-neutral-500 underline">
        다시 보지 않기
      </button>
    </section>
  );
}
