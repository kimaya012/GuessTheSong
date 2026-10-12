import { describe, expect, it } from "vitest";
import { chooseListPlacement } from "@/lib/ui/placement";

const base = { listHeight: 396, gap: 8, topInset: 72 };

describe("chooseListPlacement", () => {
  it("opens downward at full height when there is room above the footer", () => {
    expect(
      chooseListPlacement({ ...base, inputTop: 300, inputBottom: 344, viewportHeight: 900, footerTop: 1500 }),
    ).toEqual({ placement: "down", maxHeight: 396 });
  });

  it("flips upward when the footer would cover the list", () => {
    // Tall viewport, but the footer starts 133px below the input.
    const result = chooseListPlacement({ ...base, inputTop: 394, inputBottom: 438, viewportHeight: 1080, footerTop: 579 });
    expect(result.placement).toBe("up");
    expect(result.maxHeight).toBe(314);
  });

  it("flips upward near the bottom of the viewport when there is room above", () => {
    const result = chooseListPlacement({ ...base, inputTop: 600, inputBottom: 644, viewportHeight: 720, footerTop: 2000 });
    expect(result).toEqual({ placement: "up", maxHeight: 396 });
  });

  it("uses the larger side and caps the height when neither side fits", () => {
    const result = chooseListPlacement({ ...base, inputTop: 150, inputBottom: 194, viewportHeight: 500, footerTop: 2000 });
    expect(result).toEqual({ placement: "down", maxHeight: 298 });
  });

  it("never returns a uselessly small height", () => {
    const result = chooseListPlacement({ ...base, inputTop: 100, inputBottom: 144, viewportHeight: 200, footerTop: 2000 });
    expect(result.maxHeight).toBeGreaterThanOrEqual(120);
  });

  it("ignores a missing footer", () => {
    expect(
      chooseListPlacement({ ...base, inputTop: 300, inputBottom: 344, viewportHeight: 900, footerTop: null }).placement,
    ).toBe("down");
  });
});
