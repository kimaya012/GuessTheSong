import { describe, expect, it } from "vitest";
import { safeNextPath } from "@/lib/safe-redirect";

describe("safeNextPath", () => {
  it("keeps same-site paths with query strings", () => {
    expect(safeNextPath("/archive?page=2")).toBe("/archive?page=2");
  });
  it("rejects absolute, protocol-relative and backslash tricks", () => {
    for (const bad of ["https://evil.com", "//evil.com", "/\\evil.com", "/%5Cevil.com", "javascript:alert(1)", "", null]) {
      expect(safeNextPath(bad)).toBe("/");
    }
  });
});
