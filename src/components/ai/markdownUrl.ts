// Explicit URL allow-list for links rendered from AI markdown. react-markdown
// already strips dangerous protocols by default, but pinning the transform here
// means a future `rehype-raw` or a `urlTransform` override can't silently
// reintroduce a `javascript:` link. Anything that isn't plainly http(s)/mailto
// (or a relative/anchor path) is dropped to an empty href.
//
// Kept in its own module (no React/Mantine imports) so it's trivially unit-testable.
export function safeUrl(url: string): string {
  const trimmed = url.trim();
  if (/^(https?:|mailto:)/i.test(trimmed)) return trimmed;
  // Allow relative/anchor links; reject everything else (javascript:, data:, vbscript:…).
  if (/^[#/]/.test(trimmed)) return trimmed;
  return '';
}
