import assert from 'node:assert/strict';
import { test } from 'node:test';
import { sanitizeRichHtml } from '../src/shared/utils/security.ts';

test('AI and CMS previews remove script, event handlers and unsafe links', () => {
  const clean = sanitizeRichHtml('<p>Preview</p><img src="/image.png" onerror="bad()"><script>bad()</script><a href="javascript:bad()">click</a><svg onload="bad()"></svg>');
  assert.match(clean, /<p>Preview<\/p>/);
  assert.match(clean, /src="\/image.png"/);
  assert.doesNotMatch(clean, /<script|onerror|javascript:|<svg/);
});

test('rich text tables and safe styles are preserved while CSS URLs are removed', () => {
  const clean = sanitizeRichHtml('<table><tr><td colspan="2" style="text-align:center;color:#123456;background-image:url(https://evil.example)">Text</td></tr></table>');
  assert.match(clean, /colspan="2"/);
  assert.match(clean, /text-align:center/);
  assert.doesNotMatch(clean, /background-image|evil.example/);
});
