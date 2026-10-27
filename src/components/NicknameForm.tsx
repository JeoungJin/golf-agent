"use client";

import { useState } from "react";
import { isRedirectError } from "@/lib/redirect-error";
import { validateNickname } from "@/domain/nickname-validation";

interface Props {
  initial: string;
  submitLabel: string;
  onSubmit: (value: string) => void | { error?: string } | Promise<void | { error?: string }>;
}

export function NicknameForm({ initial, submitLabel, onSubmit }: Props) {
  const [name, setName] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;

    const result = validateNickname(name);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setError(null);
    setServerError(null);
    setSubmitting(true);
    try {
      const response = await onSubmit(result.value);
      if (response && response.error) setServerError(response.error);
    } catch (e) {
      // 저장 후 이동(redirect)은 예외로 전달되므로 오류 안내를 띄우지 않는다.
      if (!isRedirectError(e)) setServerError("저장하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="space-y-4 rounded-2xl border border-green-200 bg-green-50 p-4 dark:border-green-900 dark:bg-green-950"
    >
      <div>
        <label htmlFor="nickname" className="mb-1 block text-sm font-medium">
          이름
        </label>
        <input
          id="nickname"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="nickname"
          className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-neutral-900"
        />
        <p className="mt-1 text-xs text-neutral-500">모임 회원들에게 보이는 이름입니다. (20자 이내)</p>
        {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      </div>
      {serverError && (
        <p role="alert" className="text-sm text-red-600">
          {serverError}
        </p>
      )}
      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-xl bg-green-700 px-4 py-3 font-semibold text-white disabled:opacity-60"
      >
        {submitLabel}
      </button>
    </form>
  );
}
