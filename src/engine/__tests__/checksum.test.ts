import { describe, it, expect } from "vitest";

import { calculateChecksum } from "@/engine/checksum";

describe("calculateChecksum", () => {
  it("matches the known SHA-256 vector for the empty string", async () => {
    expect(await calculateChecksum("")).toBe(
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
    );
  });

  it("matches the known SHA-256 vector for 'abc'", async () => {
    expect(await calculateChecksum("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
    );
  });

  it("is deterministic for the same input", async () => {
    const a = await calculateChecksum("worth-flow");
    const b = await calculateChecksum("worth-flow");
    expect(a).toBe(b);
  });

  it("produces a 64-character lowercase hex digest", async () => {
    const digest = await calculateChecksum("anything");
    expect(digest).toMatch(/^[0-9a-f]{64}$/);
  });

  it("changes when a single character changes", async () => {
    const a = await calculateChecksum("plan-1");
    const b = await calculateChecksum("plan-2");
    expect(a).not.toBe(b);
  });
});
