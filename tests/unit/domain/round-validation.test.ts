import { describe, expect, it } from "vitest";
import { parseKstDateTime, validateRound, type RoundFormInput } from "@/domain/round-validation";

const NOW = new Date("2026-11-01T00:00:00Z"); // KST 2026-11-01 09:00

const valid: RoundFormInput = {
  kind: "screen",
  startsAt: "2026-11-10T14:00",
  location: "강남 스크린골프",
  fee: "25000",
  capacity: "8",
};

describe("parseKstDateTime", () => {
  it("KST 로컬 입력을 UTC ISO 문자열로 변환한다", () => {
    expect(parseKstDateTime("2026-11-10T14:00")).toBe("2026-11-10T05:00:00.000Z");
  });

  it("자정 직후도 날짜를 넘겨 올바르게 변환한다", () => {
    expect(parseKstDateTime("2026-11-10T00:30")).toBe("2026-11-09T15:30:00.000Z");
  });

  it("형식이 틀리거나 존재하지 않는 날짜는 null 이다", () => {
    expect(parseKstDateTime("")).toBeNull();
    expect(parseKstDateTime("2026-11-10")).toBeNull();
    expect(parseKstDateTime("2026-11-10 14:00")).toBeNull();
    expect(parseKstDateTime("2026-02-30T10:00")).toBeNull();
    expect(parseKstDateTime("2026-11-10T25:00")).toBeNull();
  });
});

describe("validateRound", () => {
  it("유효한 입력은 정규화된 값을 돌려준다", () => {
    expect(validateRound(valid, NOW)).toEqual({
      ok: true,
      value: {
        kind: "screen",
        startsAt: "2026-11-10T05:00:00.000Z",
        location: "강남 스크린골프",
        fee: 25000,
        capacity: 8,
      },
    });
  });

  it("장소 앞뒤 공백은 제거한다", () => {
    const result = validateRound({ ...valid, location: "  레이크사이드  " }, NOW);
    expect(result.ok && result.value.location).toBe("레이크사이드");
  });

  it("정원을 비우면 null(제한 없음), 비용을 비우면 0 이다", () => {
    const result = validateRound({ ...valid, capacity: "  ", fee: "" }, NOW);
    expect(result).toMatchObject({ ok: true, value: { capacity: null, fee: 0 } });
  });

  it("종류가 없으면 오류다", () => {
    const result = validateRound({ ...valid, kind: "" }, NOW);
    expect(result).toEqual({ ok: false, errors: { kind: "종류를 선택해 주세요" } });
  });

  it("티오프 일시가 비었거나 형식이 틀리면 오류다", () => {
    for (const startsAt of ["", "내일"]) {
      expect(validateRound({ ...valid, startsAt }, NOW)).toEqual({
        ok: false,
        errors: { startsAt: "티오프 일시를 입력해 주세요" },
      });
    }
  });

  it("현재 이전이거나 정확히 현재인 일시는 오류다", () => {
    for (const startsAt of ["2026-10-31T10:00", "2026-11-01T09:00"]) {
      expect(validateRound({ ...valid, startsAt }, NOW)).toEqual({
        ok: false,
        errors: { startsAt: "티오프 일시는 현재 이후여야 합니다" },
      });
    }
  });

  it("장소가 비었거나 공백뿐이면 오류다", () => {
    for (const location of ["", "   "]) {
      expect(validateRound({ ...valid, location }, NOW)).toEqual({
        ok: false,
        errors: { location: "장소를 입력해 주세요" },
      });
    }
  });

  it("장소는 100자까지 허용하고 101자는 오류다", () => {
    expect(validateRound({ ...valid, location: "가".repeat(100) }, NOW).ok).toBe(true);
    expect(validateRound({ ...valid, location: "가".repeat(101) }, NOW)).toEqual({
      ok: false,
      errors: { location: "장소는 100자 이내로 입력해 주세요" },
    });
  });

  it("비용이 음수·소수·숫자가 아니면 오류이고 0 은 허용한다", () => {
    for (const fee of ["-1", "1.5", "abc", "1e3"]) {
      expect(validateRound({ ...valid, fee }, NOW)).toEqual({
        ok: false,
        errors: { fee: "비용은 0 이상의 숫자로 입력해 주세요" },
      });
    }
    expect(validateRound({ ...valid, fee: "0" }, NOW).ok).toBe(true);
  });

  it("정원이 0·음수·소수·숫자가 아니면 오류이고 1 은 허용한다", () => {
    for (const capacity of ["0", "-3", "2.5", "많이"]) {
      expect(validateRound({ ...valid, capacity }, NOW)).toEqual({
        ok: false,
        errors: { capacity: "정원은 1 이상의 정수로 입력해 주세요" },
      });
    }
    expect(validateRound({ ...valid, capacity: "1" }, NOW).ok).toBe(true);
  });

  it("여러 항목이 틀리면 항목별 오류를 모두 돌려준다", () => {
    const result = validateRound(
      { kind: "", startsAt: "", location: "", fee: "-1", capacity: "0" },
      NOW,
    );
    expect(result).toEqual({
      ok: false,
      errors: {
        kind: "종류를 선택해 주세요",
        startsAt: "티오프 일시를 입력해 주세요",
        location: "장소를 입력해 주세요",
        fee: "비용은 0 이상의 숫자로 입력해 주세요",
        capacity: "정원은 1 이상의 정수로 입력해 주세요",
      },
    });
  });
});
