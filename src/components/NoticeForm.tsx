"use client";

import { useState } from "react";
import { isRedirectError } from "@/lib/redirect-error";
import { validateNotice, type NoticeErrors, type NoticeInput } from "@/domain/notice-validation";

interface Props {
  submitLabel: string;
  initial?: NoticeInput;
  onSubmit: (value: NoticeInput) => void | { error?: string } | Promise<void | { error?: string }>;
}

export function NoticeForm({ submitLabel, initial, onSubmit }: Props) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [body, setBody] = useState(initial?.body ?? "");
  const [errors, setErrors] = useState<NoticeErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;

    const result = validateNotice({ title, body });
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
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
    <form onSubmit={handleSubmit} noValidate className="space-y-4 rounded-2xl border border-green-200 bg-green-50 p-4 dark:border-green-900 dark:bg-green-950">
      <div>
        <label htmlFor="notice-title" className="mb-1 block text-sm font-medium">
          제목
        </label>
        <input
          id="notice-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-neutral-900"
        />
        {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title}</p>}
      </div>
      <div>
        <label htmlFor="notice-body" className="mb-1 block text-sm font-medium">
          내용
        </label>
        <textarea
          id="notice-body"
          rows={8}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-neutral-900"
        />
        {errors.body && <p className="mt-1 text-sm text-red-600">{errors.body}</p>}
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
