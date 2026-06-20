import { describe, it, expect } from "vitest";
import { encodeBase64, decodeBase64 } from "@/engine/base64";

describe("base64 (UTF-8 safe)", () => {
  it("round-trips ASCII", () => {
    const s = JSON.stringify({ label: "Rent", amount: 1000 });
    expect(decodeBase64(encodeBase64(s))).toBe(s);
  });

  it("round-trips non-Latin1 text that plain btoa cannot encode", () => {
    // Sanity: the old approach throws on these inputs.
    expect(() => btoa("₹")).toThrow();
    expect(() => btoa("Café 🎉")).toThrow();

    for (const s of ["Rent ₹50,000", "Café Allowance 🎉", "नया खाता", "Ñoño"]) {
      expect(decodeBase64(encodeBase64(s))).toBe(s);
    }
  });

  it("stays byte-compatible with btoa for ASCII (existing saves keep their checksum)", () => {
    const ascii = JSON.stringify({ a: 1, b: "hello world", c: [1, 2, 3] });
    expect(encodeBase64(ascii)).toBe(btoa(ascii));
  });
});
