const DEFAULT_MAX = 80;

/** 공지 본문을 홈 카드용 한 줄 요약으로 만든다. 공백을 정리하고 길면 말줄임표로 줄인다. */
export function summarizeNotice(body: string, max = DEFAULT_MAX): string {
  const text = body.replace(/\s+/g, " ").trim();
  if (text.length <= max) return text;
  return text.slice(0, max).trimEnd() + "…";
}
