const MESSAGES: Record<string, string> = {
  round_closed: "이미 시작한 라운딩이라 변경할 수 없습니다",
  round_cancelled: "취소된 라운딩입니다",
  round_not_found: "라운딩을 찾을 수 없습니다",
  starts_in_past: "티오프 일시는 현재 이후여야 합니다",
  invalid_input: "입력값을 확인해 주세요",
  forbidden: "권한이 없습니다",
};

export const GENERIC_ROUND_ERROR = "처리하지 못했습니다. 잠시 후 다시 시도해 주세요.";

/** RPC 가 돌려준 오류 코드(메시지)를 사용자에게 보여 줄 한국어 문구로 바꾼다. */
export function roundErrorMessage(error: { message?: string } | null | undefined): string {
  return (error?.message && MESSAGES[error.message]) || GENERIC_ROUND_ERROR;
}
