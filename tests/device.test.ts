import { describe, expect, it } from "vitest";
import { signDeviceId, verifyDeviceCookie } from "@/lib/device";

const SECRET = "test-secret-that-is-long-enough-for-hmac-usage";
const ID = "7b2a1f3e-3c1d-4f5e-9a8b-1c2d3e4f5a6b";

describe("signed device cookie", () => {
  it("round-trips a valid id", async () => {
    const cookie = await signDeviceId(ID, SECRET);
    expect(cookie.startsWith(`${ID}.`)).toBe(true);
    expect(await verifyDeviceCookie(cookie, SECRET)).toBe(ID);
  });

  it("rejects a tampered signature or id", async () => {
    const cookie = await signDeviceId(ID, SECRET);
    const [id, sig] = cookie.split(".");
    const flipped = sig.slice(0, -1) + (sig.endsWith("A") ? "B" : "A");
    expect(await verifyDeviceCookie(`${id}.${flipped}`, SECRET)).toBeNull();
    const otherId = "0b2a1f3e-3c1d-4f5e-9a8b-1c2d3e4f5a6b";
    expect(await verifyDeviceCookie(`${otherId}.${sig}`, SECRET)).toBeNull();
  });

  it("rejects a cookie signed with another secret", async () => {
    const cookie = await signDeviceId(ID, "another-secret-another-secret-another");
    expect(await verifyDeviceCookie(cookie, SECRET)).toBeNull();
  });

  it("rejects malformed or missing values", async () => {
    expect(await verifyDeviceCookie(undefined, SECRET)).toBeNull();
    expect(await verifyDeviceCookie("", SECRET)).toBeNull();
    expect(await verifyDeviceCookie("not-a-uuid.abc", SECRET)).toBeNull();
    expect(await verifyDeviceCookie(ID, SECRET)).toBeNull();
  });
});
