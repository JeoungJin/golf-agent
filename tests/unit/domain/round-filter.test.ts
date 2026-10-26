import { describe, expect, it } from "vitest";
import { parseKindFilter } from "@/domain/round-filter";

describe("parseKindFilter", () => {
  it("screen/field 만 해당 종류로 인식한다", () => {
    expect(parseKindFilter("screen")).toBe("screen");
    expect(parseKindFilter("field")).toBe("field");
  });

  it("없거나 알 수 없는 값, 배열은 전체(null)로 본다", () => {
    expect(parseKindFilter(undefined)).toBeNull();
    expect(parseKindFilter("")).toBeNull();
    expect(parseKindFilter("golf")).toBeNull();
    expect(parseKindFilter(["screen", "field"])).toBeNull();
  });
});
