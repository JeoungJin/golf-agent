"use client";

import { useState } from "react";
import { isRedirectError } from "@/lib/redirect-error";
import {
  validateRound,
  type RoundErrors,
  type RoundFormInput,
  type RoundValue,
} from "@/domain/round-validation";

interface Props {
  submitLabel: string;
  initial?: RoundFormInput;
  onSubmit: (value: RoundValue) => void | { error?: string } | Promise<void | { error?: string }>;
}

const EMPTY: RoundFormInput = { kind: "screen", startsAt: "", location: "", fee: "0", capacity: "" };

const inputClass = "w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-neutral-900";
const errorClass = "mt-1 text-sm text-red-600";

export function RoundForm({ submitLabel, initial = EMPTY, onSubmit }: Props) {
  const [form, setForm] = useState<RoundFormInput>(initial);
  const [errors, setErrors] = useState<RoundErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const set = <K extends keyof RoundFormInput>(key: K, value: RoundFormInput[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;

    const result = validateRound(form, new Date());
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
      <fieldset>
        <legend className="mb-1 text-sm font-medium">종류</legend>
        <div className="flex gap-3">
          {(
            [
              ["screen", "스크린"],
              ["field", "필드"],
            ] as const
          ).map(([value, label]) => (
            <label
              key={value}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-neutral-900"
            >
              <input
                type="radio"
                name="kind"
                value={value}
                checked={form.kind === value}
                onChange={() => set("kind", value)}
              />
              {label}
            </label>
          ))}
        </div>
        {errors.kind && <p className={errorClass}>{errors.kind}</p>}
      </fieldset>

      <div>
        <label htmlFor="round-starts-at" className="mb-1 block text-sm font-medium">
          티오프 일시
        </label>
        <input
          id="round-starts-at"
          type="datetime-local"
          value={form.startsAt}
          onChange={(e) => set("startsAt", e.target.value)}
          className={inputClass}
        />
        {errors.startsAt && <p className={errorClass}>{errors.startsAt}</p>}
      </div>

      <div>
        <label htmlFor="round-location" className="mb-1 block text-sm font-medium">
          장소
        </label>
        <input
          id="round-location"
          value={form.location}
          onChange={(e) => set("location", e.target.value)}
          className={inputClass}
        />
        {errors.location && <p className={errorClass}>{errors.location}</p>}
      </div>

      <div>
        <label htmlFor="round-fee" className="mb-1 block text-sm font-medium">
          비용(원)
        </label>
        <input
          id="round-fee"
          inputMode="numeric"
          value={form.fee}
          onChange={(e) => set("fee", e.target.value)}
          className={inputClass}
        />
        {errors.fee && <p className={errorClass}>{errors.fee}</p>}
      </div>

      <div>
        <label htmlFor="round-capacity" className="mb-1 block text-sm font-medium">
          정원(선택)
        </label>
        <input
          id="round-capacity"
          inputMode="numeric"
          placeholder="비우면 제한 없음"
          value={form.capacity}
          onChange={(e) => set("capacity", e.target.value)}
          className={inputClass}
        />
        {errors.capacity && <p className={errorClass}>{errors.capacity}</p>}
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
