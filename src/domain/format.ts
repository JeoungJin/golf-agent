import type { RoundKind, RoundStatus } from "./types";

const TIME_ZONE = "Asia/Seoul";

const dateTimeFormat = new Intl.DateTimeFormat("ko-KR", {
  timeZone: TIME_ZONE,
  month: "numeric",
  day: "numeric",
  weekday: "short",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

/** 예: "10월 31일(토) 오후 1:30" (한국 표준시 기준) */
export function formatRoundDateTime(iso: string): string {
  const p = Object.fromEntries(
    dateTimeFormat.formatToParts(new Date(iso)).map((part) => [part.type, part.value]),
  );
  return `${p.month}월 ${p.day}일(${p.weekday}) ${p.dayPeriod} ${p.hour}:${p.minute}`;
}

/** 예: "30,000원", 0원은 "무료" */
export function formatFee(fee: number): string {
  return fee === 0 ? "무료" : `${fee.toLocaleString("ko-KR")}원`;
}

const KIND_LABELS: Record<RoundKind, string> = {
  screen: "스크린",
  field: "필드",
};

export function roundKindLabel(kind: RoundKind): string {
  return KIND_LABELS[kind];
}

/** 정원이 있으면 "3/8명", 없으면 "3명" */
export function formatCapacity(count: number, capacity: number | null): string {
  return capacity === null ? `${count}명` : `${count}/${capacity}명`;
}

/** 취소된 라운딩만 "취소됨" 라벨을 돌려준다. */
export function roundStatusLabel(status: RoundStatus): string | null {
  return status === "cancelled" ? "취소됨" : null;
}
