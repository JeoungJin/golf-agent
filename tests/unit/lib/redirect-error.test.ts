import { describe, expect, it } from "vitest";
import { isRedirectError } from "@/lib/redirect-error";

describe("isRedirectError", () => {
  it("NEXT_REDIRECT digest 를 가진 예외만 true 이다", () => {
    expect(isRedirectError({ digest: "NEXT_REDIRECT;replace;/rounds/1;307;" })).toBe(true);
    expect(isRedirectError({ digest: "OTHER" })).toBe(false);
    expect(isRedirectError(new Error("boom"))).toBe(false);
    expect(isRedirectError(null)).toBe(false);
    expect(isRedirectError("NEXT_REDIRECT")).toBe(false);
  });
});
