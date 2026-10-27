import { describe, expect, it } from "vitest";
import { NICKNAME_MAX, validateNickname } from "@/domain/nickname-validation";

describe("validateNickname", () => {
  it("앞뒤 공백을 제거한 값을 돌려준다", () => {
    expect(validateNickname("  홍길동  ")).toEqual({ ok: true, value: "홍길동" });
  });

  it("내부 공백은 그대로 둔다", () => {
    expect(validateNickname("홍  길동")).toEqual({ ok: true, value: "홍  길동" });
  });

  it("빈 값과 공백뿐인 값은 거부한다", () => {
    for (const input of ["", "   ", "\n\t"]) {
      expect(validateNickname(input)).toEqual({ ok: false, error: "이름을 입력해 주세요" });
    }
  });

  it("20자는 허용하고 21자는 거부한다", () => {
    expect(NICKNAME_MAX).toBe(20);
    expect(validateNickname("가".repeat(20)).ok).toBe(true);
    expect(validateNickname("가".repeat(21))).toEqual({
      ok: false,
      error: "이름은 20자 이내로 입력해 주세요",
    });
  });

  it("공백 제거 후 길이로 판단한다", () => {
    expect(validateNickname(` ${"가".repeat(20)} `).ok).toBe(true);
  });

  it("이모지는 한 글자로 센다", () => {
    expect(validateNickname("⛳".repeat(20)).ok).toBe(true);
    expect(validateNickname("⛳".repeat(21)).ok).toBe(false);
    expect(validateNickname("👨‍👩‍👧".repeat(2)).ok).toBe(true);
  });
});
