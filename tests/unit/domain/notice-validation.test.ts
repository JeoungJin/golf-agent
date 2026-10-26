import { describe, expect, it } from "vitest";
import { validateNotice } from "@/domain/notice-validation";

describe("validateNotice", () => {
  it("유효한 입력은 앞뒤 공백을 제거한 값으로 통과한다", () => {
    expect(validateNotice({ title: "  정모 안내 ", body: " 토요일입니다\n" })).toEqual({
      ok: true,
      value: { title: "정모 안내", body: "토요일입니다" },
    });
  });

  it("제목이 비어 있으면 오류", () => {
    const r = validateNotice({ title: "", body: "내용" });
    expect(r).toEqual({ ok: false, errors: { title: "제목을 입력해 주세요" } });
  });

  it("제목이 공백뿐이면 오류", () => {
    const r = validateNotice({ title: "   ", body: "내용" });
    expect(r).toEqual({ ok: false, errors: { title: "제목을 입력해 주세요" } });
  });

  it("제목이 100자면 통과, 101자면 오류", () => {
    expect(validateNotice({ title: "가".repeat(100), body: "내용" }).ok).toBe(true);
    expect(validateNotice({ title: "가".repeat(101), body: "내용" })).toEqual({
      ok: false,
      errors: { title: "제목은 100자 이내로 입력해 주세요" },
    });
  });

  it("내용이 비어 있거나 공백뿐이면 오류", () => {
    expect(validateNotice({ title: "제목", body: "" })).toEqual({
      ok: false,
      errors: { body: "내용을 입력해 주세요" },
    });
    expect(validateNotice({ title: "제목", body: " \n\t " })).toEqual({
      ok: false,
      errors: { body: "내용을 입력해 주세요" },
    });
  });

  it("내용이 5000자면 통과, 5001자면 오류", () => {
    expect(validateNotice({ title: "제목", body: "가".repeat(5000) }).ok).toBe(true);
    expect(validateNotice({ title: "제목", body: "가".repeat(5001) })).toEqual({
      ok: false,
      errors: { body: "내용은 5000자 이내로 입력해 주세요" },
    });
  });

  it("제목과 내용이 모두 잘못되면 두 오류를 함께 돌려준다", () => {
    expect(validateNotice({ title: "", body: "" })).toEqual({
      ok: false,
      errors: { title: "제목을 입력해 주세요", body: "내용을 입력해 주세요" },
    });
  });
});
