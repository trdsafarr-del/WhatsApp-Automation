import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createDashboardSessionToken,
  isPublicApiPath,
  parseCookieHeader,
  verifyDashboardSessionToken,
  verifyPasscodeMatch,
} from './auth';

test('verifyPasscodeMatch checks exact password cleanly with whitespace trimming', () => {
  assert.equal(verifyPasscodeMatch('5060', '5060'), true);
  assert.equal(verifyPasscodeMatch(' 5060 ', '5060'), true);
  assert.equal(verifyPasscodeMatch('5061', '5060'), false);
  assert.equal(verifyPasscodeMatch('506', '5060'), false);
  assert.equal(verifyPasscodeMatch('', '5060'), false);
});

test('stateless dashboard session tokens sign, verify, reject tampering, and expire cleanly', () => {
  const secret = 'test-signing-secret-broomies';
  const now = 1_700_000_000_000;
  const token = createDashboardSessionToken(secret, 3600, now);

  assert.equal(verifyDashboardSessionToken(token, secret, now + 1000), true);
  assert.equal(verifyDashboardSessionToken(token, secret, now + 3_700_000), false);
  assert.equal(verifyDashboardSessionToken(token, 'wrong-secret', now + 1000), false);

  const [payload, sig] = token.split('.');
  const tampered = `${payload}.${sig.slice(0, -1)}${sig.slice(-1) === 'A' ? 'B' : 'A'}`;
  assert.equal(verifyDashboardSessionToken(tampered, secret, now + 1000), false);
  assert.equal(verifyDashboardSessionToken(undefined, secret, now + 1000), false);
});

test('parseCookieHeader extracts cookie value reliably', () => {
  const hdr = 'foo=bar; op_dash_session=abc.123%2Bxyz; theme=dark';
  assert.equal(parseCookieHeader(hdr, 'op_dash_session'), 'abc.123+xyz');
  assert.equal(parseCookieHeader(hdr, 'missing'), '');
});

test('isPublicApiPath allows Shopify storefront, App Proxy, webhooks, and health while locking all admin routes', () => {
  // Public routes that MUST never require dashboard password
  assert.equal(isPublicApiPath('/api/health'), true);
  assert.equal(isPublicApiPath('/api/auth/status'), true);
  assert.equal(isPublicApiPath('/api/auth/login'), true);
  assert.equal(isPublicApiPath('/api/auth/logout'), true);
  assert.equal(isPublicApiPath('/api/webhooks/shopify/orders-create'), true);
  assert.equal(isPublicApiPath('/api/webhooks/shopify/orders-updated'), true);
  assert.equal(isPublicApiPath('/api/shopify-proxy'), true);
  assert.equal(isPublicApiPath('/api/shopify-proxy/cakes-near-sector-31-faridabad'), true);
  assert.equal(isPublicApiPath('/api/shopify-proxy/sitemap.xml'), true);
  assert.equal(isPublicApiPath('/api/storefront/widget.js'), true);
  assert.equal(isPublicApiPath('/api/storefront/auto-pincode'), true);
  assert.equal(isPublicApiPath('/api/storefront/reverse-pincode'), true);
  assert.equal(isPublicApiPath('/api/storefront/pincode-check'), true);

  // Admin / mutation / sensitive routes that MUST require dashboard password
  assert.equal(isPublicApiPath('/api/dashboard'), false);
  assert.equal(isPublicApiPath('/api/settings'), false);
  assert.equal(isPublicApiPath('/api/whatsapp/connect'), false);
  assert.equal(isPublicApiPath('/api/shopify/sync'), false);
  assert.equal(isPublicApiPath('/api/orders/123/vote'), false);
  assert.equal(isPublicApiPath('/api/seo/geo-config'), false);
  assert.equal(isPublicApiPath('/api/seo/pages'), false);
  assert.equal(isPublicApiPath('/api/seo/push-shopify-pages'), false);
  assert.equal(isPublicApiPath('/api/products/sync-shopify'), false);
  assert.equal(isPublicApiPath('/api/storefront/config'), false);
  assert.equal(isPublicApiPath('/api/storefront/install-shopify'), false);
});
