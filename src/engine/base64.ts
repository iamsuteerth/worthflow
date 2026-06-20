// UTF-8-safe base64. `btoa`/`atob` only handle Latin1 and throw on any code
// point above U+00FF (e.g. the ₹ sign, emoji, accented or regional-script text),
// which would otherwise crash plan export and cloud save. Encoding via TextEncoder
// keeps the output byte-identical to plain `btoa` for ASCII payloads, so plans
// saved before this change (which were necessarily ASCII — non-ASCII used to throw)
// still decode and still match their stored checksum.

export function encodeBase64(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function decodeBase64(input: string): string {
  const binary = atob(input);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}
