export const NICKNAME_MAX = 20;

export type NicknameValidation = { ok: true; value: string } | { ok: false; error: string };

/** 이름을 검증한다. 앞뒤 공백을 제거한 값 기준으로 1..20자(이모지는 한 글자). */
export function validateNickname(input: string): NicknameValidation {
  const value = input.trim();
  if (value.length === 0) return { ok: false, error: "이름을 입력해 주세요" };
  if (Array.from(value).length > NICKNAME_MAX) {
    return { ok: false, error: `이름은 ${NICKNAME_MAX}자 이내로 입력해 주세요` };
  }
  return { ok: true, value };
}
