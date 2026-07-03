export function safeUrl(url: string): string {
  const trimmed = url.trim();
  if (/^(https?:|mailto:)/i.test(trimmed)) return trimmed;
  if (/^[#/]/.test(trimmed)) return trimmed;
  return '';
}
