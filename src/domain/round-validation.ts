import type { RoundKind } from "./types";

export const LOCATION_MAX = 100;

/** 폼 입력값(모두 문자열). kind 가 빈 문자열이면 아직 선택하지 않은 것이다. */
export interface RoundFormInput {
  kind: RoundKind | "";
  /** `datetime-local` 값, 한국 표준시(KST) 기준 `YYYY-MM-DDTHH:mm` */
  startsAt: string;
  location: string;
  fee: string;
  capacity: string;
}

/** 검증을 통과한 값. startsAt 은 UTC ISO 문자열, capacity 가 null 이면 정원 제한 없음. */
export interface RoundValue {
  kind: RoundKind;
  startsAt: string;
  location: string;
  fee: number;
  capacity: number | null;
}

export type RoundErrors = Partial<Record<keyof RoundFormInput, string>>;

export type RoundValidation =
  | { ok: true; value: RoundValue }
  | { ok: false; errors: RoundErrors };

const KST_LOCAL = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

/** KST 로컬 날짜시각을 UTC ISO 문자열로 바꾼다. 형식이 틀리거나 존재하지 않는 시각이면 null. */
export function parseKstDateTime(input: string): string | null {
  const m = KST_LOCAL.exec(input);
  if (!m) return null;
  const [year, month, day, hour, minute] = m.slice(1).map(Number);
  const utc = Date.UTC(year, month - 1, day, hour, minute);
  const check = new Date(utc);
  if (
    check.getUTCFullYear() !== year ||
    check.getUTCMonth() !== month - 1 ||
    check.getUTCDate() !== day ||
    check.getUTCHours() !== hour ||
    check.getUTCMinutes() !== minute
  ) {
    return null;
  }
  return new Date(utc - KST_OFFSET_MS).toISOString();
}

/** 라운딩 폼을 검증하고 저장용 값으로 정규화한다. 일시는 `now` 이후여야 한다. */
export function validateRound(input: RoundFormInput, now: Date): RoundValidation {
  const errors: RoundErrors = {};

  if (input.kind === "") errors.kind = "종류를 선택해 주세요";

  const startsAt = parseKstDateTime(input.startsAt);
  if (startsAt === null) errors.startsAt = "티오프 일시를 입력해 주세요";
  else if (new Date(startsAt).getTime() <= now.getTime()) {
    errors.startsAt = "티오프 일시는 현재 이후여야 합니다";
  }

  const location = input.location.trim();
  if (location.length === 0) errors.location = "장소를 입력해 주세요";
  else if (location.length > LOCATION_MAX) {
    errors.location = `장소는 ${LOCATION_MAX}자 이내로 입력해 주세요`;
  }

  const feeText = input.fee.trim();
  const fee = feeText === "" ? 0 : /^\d+$/.test(feeText) ? Number(feeText) : NaN;
  if (Number.isNaN(fee)) errors.fee = "비용은 0 이상의 숫자로 입력해 주세요";

  const capacityText = input.capacity.trim();
  const capacity = capacityText === "" ? null : /^\d+$/.test(capacityText) ? Number(capacityText) : NaN;
  if (capacity !== null && (Number.isNaN(capacity) || capacity < 1)) {
    errors.capacity = "정원은 1 이상의 정수로 입력해 주세요";
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    value: {
      kind: input.kind as RoundKind,
      startsAt: startsAt as string,
      location,
      fee,
      capacity,
    },
  };
}
