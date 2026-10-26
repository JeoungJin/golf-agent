import type { RoundKind } from "./types";

/** 쿼리 문자열 `kind` 를 종류 필터로 해석한다. 없거나 알 수 없는 값은 전체(null). */
export function parseKindFilter(value: string | string[] | undefined): RoundKind | null {
  return value === "screen" || value === "field" ? value : null;
}
