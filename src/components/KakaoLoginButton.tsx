"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function KakaoLoginButton() {
  const [failed, setFailed] = useState(false);
  const [pending, setPending] = useState(false);

  async function handleClick() {
    setFailed(false);
    setPending(true);
    const { error } = await createClient().auth.signInWithOAuth({
      provider: "kakao",
      options: {
        // 개인정보 최소 수집: 이메일은 요청하지 않는다.
        scopes: "profile_nickname profile_image",
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      setFailed(true);
      setPending(false);
    }
  }

  return (
    <div className="w-full">
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        className="w-full rounded-xl bg-[#FEE500] px-4 py-3.5 text-base font-semibold text-[#191919] disabled:opacity-60"
      >
        카카오로 로그인
      </button>
      {failed && (
        <p role="alert" className="mt-3 text-sm text-red-600">
          로그인에 실패했습니다. 잠시 후 다시 시도해 주세요.
        </p>
      )}
    </div>
  );
}
