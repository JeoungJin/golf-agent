import { describe, expect, it } from "vitest";
import {
  formatCapacity,
  formatFee,
  formatRoundDateTime,
  roundKindLabel,
  roundStatusLabel,
} from "@/domain/format";

describe("formatCapacity", () => {
  it("정원이 있으면 'N/정원명' 으로 표기한다", () => {
    expect(formatCapacity(3, 8)).toBe("3/8명");
    expect(formatCapacity(0, 4)).toBe("0/4명");
  });

  it("정원이 없으면 'N명' 으로 표기한다", () => {
    expect(formatCapacity(5, null)).toBe("5명");
    expect(formatCapacity(0, null)).toBe("0명");
  });
});

describe("roundStatusLabel", () => {
  it("취소된 라운딩만 라벨을 돌려준다", () => {
    expect(roundStatusLabel("cancelled")).toBe("취소됨");
    expect(roundStatusLabel("scheduled")).toBeNull();
  });
});

describe("formatRoundDateTime", () => {
  it("KST 기준 오후 시각을 표기한다", () => {
    // 2026-10-31 04:30Z = KST 13:30, 토요일
    expect(formatRoundDateTime("2026-10-31T04:30:00Z")).toBe("10월 31일(토) 오후 1:30");
  });

  it("KST 기준 오전 시각을 표기한다", () => {
    // 2026-10-26 22:05Z = KST 10-27 07:05, 화요일
    expect(formatRoundDateTime("2026-10-26T22:05:00Z")).toBe("10월 27일(화) 오전 7:05");
  });

  it("UTC 날짜가 달라도 KST 날짜로 표기한다", () => {
    // 2026-12-31 16:00Z = KST 2027-01-01 01:00, 금요일
    expect(formatRoundDateTime("2026-12-31T16:00:00Z")).toBe("1월 1일(금) 오전 1:00");
  });
});

describe("formatFee", () => {
  it("천 단위 구분 기호와 원을 붙인다", () => {
    expect(formatFee(30000)).toBe("30,000원");
    expect(formatFee(1250000)).toBe("1,250,000원");
    expect(formatFee(500)).toBe("500원");
  });

  it("0원은 무료로 표기한다", () => {
    expect(formatFee(0)).toBe("무료");
  });
});

describe("roundKindLabel", () => {
  it("종류 라벨을 한국어로 돌려준다", () => {
    expect(roundKindLabel("screen")).toBe("스크린");
    expect(roundKindLabel("field")).toBe("필드");
  });
});
