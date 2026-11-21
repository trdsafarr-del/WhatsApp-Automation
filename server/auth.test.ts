import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createDashboardSessionToken,
  extractPasscodeFromBody,
  isPublicApiPath,
  parseCookieHeader,
  verifyDashboardSessionToken,
  verifyPasscodeMatch,
} from './auth';
import { mapDelhiveryStatusToShipmentStatus } from './delhivery';
import {
  extractPollSecretFromMessage,
  serializePollCacheEntry,
} from './whatsapp';

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

test('all relative imports reachable from api/index.ts and server.ts include explicit .js extensions for Node/Vercel ESM', async () => {
  const fs = await import('node:fs');
  const path = await import('node:path');
  const visited = new Set<string>();
  const missingJs: Array<{ from: string; spec: string }> = [];

  const walk = (file: string) => {
    const abs = path.resolve(file);
    if (visited.has(abs) || !fs.existsSync(abs)) return;
    visited.add(abs);
    const text = fs.readFileSync(abs, 'utf8');
    const re = /(?:import|export)\s+(?:type\s+)?[\s\S]*?\s+from\s+['"](\.[^'"]+)['"]/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      const spec = m[1];
      if (!/\.(js|mjs|cjs|json)$/.test(spec)) {
        missingJs.push({ from: path.relative(process.cwd(), abs), spec });
      }
      const base = path.resolve(path.dirname(abs), spec.replace(/\.js$/, ''));
      const targetTs = fs.existsSync(`${base}.ts`) ? `${base}.ts` : fs.existsSync(base) ? base : null;
      if (targetTs && targetTs.endsWith('.ts')) walk(targetTs);
    }
  };

  walk('api/auth.ts');
  walk('api/index.ts');
  walk('server.ts');

  assert.ok(visited.size >= 16, `Expected to inspect server graph, only visited ${visited.size} files`);
  assert.deepEqual(missingJs, []);
});

test('extractPasscodeFromBody handles string, numeric, JSON-string, and empty payloads safely', () => {
  assert.equal(extractPasscodeFromBody({ passcode: '5060' }), '5060');
  assert.equal(extractPasscodeFromBody({ passcode: 5060 }), '5060');
  assert.equal(extractPasscodeFromBody('{"passcode":" 5060 "}'), '5060');
  assert.equal(extractPasscodeFromBody(null), '');
  assert.equal(extractPasscodeFromBody('not-json'), '');
});

test('mapDelhiveryStatusToShipmentStatus never falsely marks Undelivered or In-Transit scans as delivered', () => {
  assert.equal(mapDelhiveryStatusToShipmentStatus('Undelivered', 'UD', 'Customer unavailable'), 'attempted_delivery');
  assert.equal(mapDelhiveryStatusToShipmentStatus('In Transit', 'IT', 'Expected to be delivered tomorrow'), 'in_transit');
  assert.equal(mapDelhiveryStatusToShipmentStatus('In Transit', '', 'Could not be delivered today'), 'attempted_delivery');
  assert.equal(mapDelhiveryStatusToShipmentStatus('Dispatched', 'OO', 'Out for delivery'), 'out_for_delivery');
  assert.equal(mapDelhiveryStatusToShipmentStatus('RTO', 'RT', 'Returned to origin'), 'rto_initiated');
  assert.equal(mapDelhiveryStatusToShipmentStatus('Delivered', 'DL', 'Delivered to consignee'), 'delivered');
});

test('server/shopify.ts never mutates Shopify fulfillment or delivery statuses', async () => {
  const fs = await import('node:fs');
  const shopifySrc = fs.readFileSync('server/shopify.ts', 'utf8');
  assert.equal(/\/fulfillments\.json|fulfillment_events|shipment_status\s*:/.test(shopifySrc), false);
});

test('WhatsApp poll messageSecret survives JSON & Firebase RTDB serialization via Base64 round-trip', () => {
  const secretBytes = Uint8Array.from([1, 2, 3, 4, 250, 251, 252, 253, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32]);
  const stored = serializePollCacheEntry({
    sent: {
      key: { id: 'msg-poll-1', remoteJid: '919876543210@s.whatsapp.net', fromMe: true },
      message: {
        messageContextInfo: {
          messageSecret: secretBytes,
        },
        pollCreationMessageV3: {
          name: 'Confirm Order #1455',
          options: [{ optionName: 'Confirm Order' }, { optionName: 'Cancel Order' }],
          selectableOptionsCount: 1,
        },
      },
    },
    question: 'Confirm Order #1455',
    orderId: 'ord-123',
    targetJid: '919876543210@s.whatsapp.net',
    creatorJid: '919266424088@s.whatsapp.net',
    creatorLid: '1234567890@lid',
    options: ['Confirm Order', 'Cancel Order'],
  });

  // Simulate Firebase RTDB JSON round-trip (where Buffers/Uint8Arrays become plain objects)
  const hydrated = JSON.parse(JSON.stringify(stored)) as typeof stored;
  assert.equal(typeof hydrated.messageSecretBase64, 'string');
  const recovered = extractPollSecretFromMessage(hydrated);
  assert.ok(recovered);
  assert.deepEqual(Array.from(recovered), Array.from(secretBytes));
});

