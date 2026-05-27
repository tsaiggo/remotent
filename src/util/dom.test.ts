import { describe, expect, it } from 'vitest';
import { escapeHtml } from './dom.js';

describe('escapeHtml', () => {
  it('escapes the 5 HTML-special characters', () => {
    expect(escapeHtml('&')).toBe('&amp;');
    expect(escapeHtml('<')).toBe('&lt;');
    expect(escapeHtml('>')).toBe('&gt;');
    expect(escapeHtml('"')).toBe('&quot;');
    expect(escapeHtml("'")).toBe('&#39;');
  });

  it('escapes a mixed string', () => {
    expect(escapeHtml('<a href="?x=1&y=2">it\'s here</a>')).toBe(
      '&lt;a href=&quot;?x=1&amp;y=2&quot;&gt;it&#39;s here&lt;/a&gt;',
    );
  });

  it('passes through plain text unchanged', () => {
    expect(escapeHtml('hello world 123')).toBe('hello world 123');
    expect(escapeHtml('')).toBe('');
  });

  it('coerces non-string values via String(...)', () => {
    expect(escapeHtml(42)).toBe('42');
    expect(escapeHtml(null)).toBe('null');
    expect(escapeHtml(undefined)).toBe('undefined');
    expect(escapeHtml(true)).toBe('true');
  });

  it('escapes all 5 specials in one pass', () => {
    expect(escapeHtml('&<>"\'')).toBe('&amp;&lt;&gt;&quot;&#39;');
  });
});
