// src/engine/checksum.ts
export async function calculateChecksum(
  payload: string
): Promise<string> {
  const data =
    new TextEncoder().encode(
      payload
    );

  const hashBuffer =
    await crypto.subtle.digest(
      "SHA-256",
      data
    );

  return Array.from(
    new Uint8Array(
      hashBuffer
    )
  )
    .map(
      (byte) =>
        byte
          .toString(16)
          .padStart(
            2,
            "0"
          )
    )
    .join("");
}