import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { KakaoLoginButton } from "@/components/KakaoLoginButton";
import { LoginView } from "@/components/LoginView";

const signInWithOAuth = vi.fn().mockResolvedValue({ error: null });

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({ auth: { signInWithOAuth } }),
}));

beforeEach(() => signInWithOAuth.mockClear());

describe("KakaoLoginButton", () => {
  it("클릭하면 닉네임·프로필 이미지 스코프만으로 카카오 로그인을 호출한다", async () => {
    render(<KakaoLoginButton />);
    await userEvent.click(screen.getByRole("button", { name: "카카오로 로그인" }));

    expect(signInWithOAuth).toHaveBeenCalledTimes(1);
    const arg = signInWithOAuth.mock.calls[0][0];
    expect(arg.provider).toBe("kakao");
    expect(arg.options.scopes).toBe("profile_nickname profile_image");
    expect(arg.options.redirectTo).toMatch(/\/auth\/callback$/);
  });

  it("로그인 요청이 실패하면 한국어 오류를 보여 주고 다시 시도할 수 있다", async () => {
    signInWithOAuth.mockResolvedValueOnce({ error: { message: "x" } });
    render(<KakaoLoginButton />);
    await userEvent.click(screen.getByRole("button", { name: "카카오로 로그인" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("로그인에 실패했습니다");
    expect(screen.getByRole("button", { name: "카카오로 로그인" })).toBeEnabled();
  });
});

describe("LoginView", () => {
  it("오류 없이 렌더링하면 안내 문구 없이 버튼만 보인다", () => {
    render(<LoginView />);
    expect(screen.getByRole("button", { name: "카카오로 로그인" })).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("error 가 전달되면 한국어 안내를 표시한다", () => {
    render(<LoginView error="auth" />);
    expect(screen.getByRole("alert")).toHaveTextContent("로그인에 실패했습니다");
  });

  it("사용자가 동의를 취소한 경우 별도 안내를 표시한다", () => {
    render(<LoginView error="access_denied" />);
    expect(screen.getByRole("alert")).toHaveTextContent("동의");
  });
});
