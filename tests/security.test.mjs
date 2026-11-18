import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  sanitizeRichHtml,
  sanitizeHref,
  toSafeExternalHref,
  toSafeInternalPath,
  isValidWebsiteUrl,
  validateImageFile,
} from '../src/shared/utils/security.ts';

test('AI and CMS previews remove script, event handlers and unsafe links', () => {
  const clean = sanitizeRichHtml('<p>Preview</p><img src="/image.png" onerror="bad()"><script>bad()</script><a href="javascript:bad()" target="_blank">click</a><a href="https://example.com" target="_blank">ok</a><svg onload="bad()"></svg>');
  assert.match(clean, /<p>Preview<\/p>/);
  assert.match(clean, /src="\/image.png"/);
  assert.match(clean, /rel="noopener noreferrer"/);
  assert.doesNotMatch(clean, /<script|onerror|javascript:|<svg/);
});

test('rich text tables and safe styles are preserved while CSS URLs are removed', () => {
  const clean = sanitizeRichHtml('<table><tr><td colspan="2" style="text-align:center;color:#123456;background-image:url(https://evil.example)">Text</td></tr></table>');
  assert.match(clean, /colspan="2"/);
  assert.match(clean, /text-align:center/);
  assert.doesNotMatch(clean, /background-image|evil.example/);
});

test('sanitizeHref and toSafeExternalHref block javascript, control-char bypasses and protocol-relative URLs', () => {
  assert.equal(sanitizeHref('javascript:alert(1)'), '#');
  assert.equal(sanitizeHref(' java\tscript:alert(1)'), '#');
  assert.equal(sanitizeHref('//evil.example/phish'), '#');
  assert.equal(sanitizeHref('https://vinhuni.edu.vn/tin-tuc'), 'https://vinhuni.edu.vn/tin-tuc');
  assert.equal(sanitizeHref('/articles'), '/articles');
  assert.equal(sanitizeHref('fit.vinhuni.edu.vn'), 'https://fit.vinhuni.edu.vn');

  assert.equal(toSafeExternalHref('javascript:alert(1)'), null);
  assert.equal(toSafeExternalHref('//evil.example'), null);
  assert.equal(toSafeExternalHref('fit.vinhuni.edu.vn'), 'https://fit.vinhuni.edu.vn');
  assert.equal(toSafeExternalHref('https://example.com/a?b=1'), 'https://example.com/a?b=1');
});

test('toSafeInternalPath prevents open redirects', () => {
  assert.equal(toSafeInternalPath('/users/123', '/dashboard'), '/users/123');
  assert.equal(toSafeInternalPath('//evil.com', '/dashboard'), '/dashboard');
  assert.equal(toSafeInternalPath('/\\evil.com', '/dashboard'), '/dashboard');
  assert.equal(toSafeInternalPath('https://evil.com', '/dashboard'), '/dashboard');
});

test('isValidWebsiteUrl validates complex URLs in linear time without ReDoS', () => {
  assert.equal(isValidWebsiteUrl('https://scholar.google.com/citations?user=123&hl=vi'), true);
  assert.equal(isValidWebsiteUrl('fit.vinhuni.edu.vn'), true);
  assert.equal(isValidWebsiteUrl('javascript:alert(1)'), false);
  assert.equal(isValidWebsiteUrl('//evil.com'), false);
  const longBadInput = 'https://example.com/' + '/a '.repeat(80) + '!';
  assert.equal(isValidWebsiteUrl(longBadInput), false);
});

test('validateImageFile rejects SVG, non-images and oversized uploads', () => {
  assert.equal(validateImageFile({ type: 'image/png', size: 1024, name: 'a.png' }, { maxSizeMb: 2 }), null);
  assert.ok(validateImageFile({ type: 'image/svg+xml', size: 100, name: 'x.svg' }));
  assert.ok(validateImageFile({ type: 'application/pdf', size: 100, name: 'x.pdf' }));
  assert.ok(validateImageFile({ type: 'image/png', size: 3 * 1024 * 1024, name: 'big.png' }, { maxSizeMb: 2 }));
});
