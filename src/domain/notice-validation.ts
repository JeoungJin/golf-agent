export const TITLE_MAX = 100;
export const BODY_MAX = 5000;

export interface NoticeInput {
  title: string;
  body: string;
}

export interface NoticeErrors {
  title?: string;
  body?: string;
}

export type NoticeValidation =
  | { ok: true; value: NoticeInput }
  | { ok: false; errors: NoticeErrors };

/** 공지 입력을 검증한다. 앞뒤 공백을 제거한 값 기준으로 제목 1..100자, 내용 1..5000자. */
export function validateNotice(input: NoticeInput): NoticeValidation {
  const title = input.title.trim();
  const body = input.body.trim();
  const errors: NoticeErrors = {};

  if (title.length === 0) errors.title = "제목을 입력해 주세요";
  else if (title.length > TITLE_MAX) errors.title = `제목은 ${TITLE_MAX}자 이내로 입력해 주세요`;

  if (body.length === 0) errors.body = "내용을 입력해 주세요";
  else if (body.length > BODY_MAX) errors.body = `내용은 ${BODY_MAX}자 이내로 입력해 주세요`;

  if (errors.title || errors.body) return { ok: false, errors };
  return { ok: true, value: { title, body } };
}
