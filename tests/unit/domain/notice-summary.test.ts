import { describe, expect, it } from "vitest";
import { summarizeNotice } from "@/domain/notice-summary";

describe("summarizeNotice", () => {
  it("짧은 본문은 그대로 돌려준다", () => {
    expect(summarizeNotice("이번 주 토요일 라운딩입니다")).toBe("이번 주 토요일 라운딩입니다");
  });

  it("최대 길이를 넘으면 말줄임표로 줄인다", () => {
    const body = "가".repeat(100);
    const result = summarizeNotice(body, 80);
    expect(result).toBe("가".repeat(80) + "…");
  });

  it("정확히 최대 길이면 줄이지 않는다", () => {
    const body = "나".repeat(80);
    expect(summarizeNotice(body, 80)).toBe(body);
  });

  it("줄바꿈과 연속 공백을 한 칸 공백으로 정리한다", () => {
    expect(summarizeNotice("첫째 줄\n\n  둘째   줄\t셋째")).toBe("첫째 줄 둘째 줄 셋째");
  });

  it("앞뒤 공백을 제거한다", () => {
    expect(summarizeNotice("  \n 안녕하세요 \n ")).toBe("안녕하세요");
  });

  it("말줄임표 앞의 공백은 남기지 않는다", () => {
    const body = "가".repeat(9) + " " + "나".repeat(20);
    expect(summarizeNotice(body, 10)).toBe("가".repeat(9) + "…");
  });

  it("빈 문자열은 빈 문자열", () => {
    expect(summarizeNotice("")).toBe("");
    expect(summarizeNotice("   \n ")).toBe("");
  });

  it("기본 최대 길이는 80자", () => {
    expect(summarizeNotice("가".repeat(81))).toBe("가".repeat(80) + "…");
  });
});
