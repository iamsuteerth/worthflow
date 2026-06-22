import { describe, it, expect } from 'vitest';
import { safeUrl } from '@/components/ai/markdownUrl';

describe('safeUrl — AI markdown link sanitiser', () => {
  it('allows http(s) and mailto links', () => {
    expect(safeUrl('https://example.com')).toBe('https://example.com');
    expect(safeUrl('http://example.com/path?q=1')).toBe('http://example.com/path?q=1');
    expect(safeUrl('mailto:hello@worthflow.in')).toBe('mailto:hello@worthflow.in');
  });

  it('allows relative and anchor links', () => {
    expect(safeUrl('/privacy')).toBe('/privacy');
    expect(safeUrl('#section')).toBe('#section');
  });

  it('drops javascript:, data:, vbscript: and other unknown schemes', () => {
    expect(safeUrl('javascript:alert(1)')).toBe('');
    expect(safeUrl('  javascript:alert(1)')).toBe('');
    expect(safeUrl('JaVaScRiPt:alert(1)')).toBe('');
    expect(safeUrl('data:text/html,<script>alert(1)</script>')).toBe('');
    expect(safeUrl('vbscript:msgbox(1)')).toBe('');
    expect(safeUrl('file:///etc/passwd')).toBe('');
  });
});
