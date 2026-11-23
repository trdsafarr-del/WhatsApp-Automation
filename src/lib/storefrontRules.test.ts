import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildProductJsonLd,
  buildShopifyLiquidSnippet,
  computeSeoAudit,
  computeStoreSeoSummary,
  createSampleCatalogProducts,
  DEFAULT_STOREFRONT_CONFIG,
  evaluateProductForPincode,
  extractClientIpFromHeaders,
  extractPincodeFromIpGeo,
  extractPincodeFromReverseGeocode,
  normalizeIndianPincode,
  normalizeStorefrontOrigin,
  parsePincodeListInput,
  renderBulkSeoTemplate,
  slugifyProductHandle,
} from './storefrontRules';

test('parsePincodeListInput extracts unique valid 6-digit Indian pincodes', () => {
  const parsed = parsePincodeListInput('400001, 110001\n400001; 560001 | 012345 99999 abc 400050');
  assert.deepEqual(parsed, ['400001', '110001', '560001', '400050']);
});

test('normalizeIndianPincode validates 6-digit pincodes strictly', () => {
  assert.equal(normalizeIndianPincode(' 400-001 '), '400001');
  assert.equal(normalizeIndianPincode('012345'), '');
  assert.equal(normalizeIndianPincode('40001'), '');
});

test('evaluateProductForPincode enforces allow_list, block_list, and Delhivery serviceability', () => {
  const samples = createSampleCatalogProducts('Broomies');
  const allowOnly = samples[0]; // allowed: 400001, 400011, ...
  const blockList = samples[2]; // blocked: 190001, 194101

  const hit = evaluateProductForPincode(allowOnly, '400001', DEFAULT_STOREFRONT_CONFIG);
  assert.equal(hit.available, true);
  assert.equal(hit.codAvailable, true);
  assert.equal(hit.estimatedDays, 1);

  const miss = evaluateProductForPincode(allowOnly, '700001', DEFAULT_STOREFRONT_CONFIG);
  assert.equal(miss.available, false);
  assert.match(miss.reason, /allowed pincode/i);

  const blocked = evaluateProductForPincode(blockList, '190001', DEFAULT_STOREFRONT_CONFIG);
  assert.equal(blocked.available, false);
  assert.match(blocked.reason, /blocked list/i);

  const unserviceable = evaluateProductForPincode(blockList, '700001', DEFAULT_STOREFRONT_CONFIG, {
    pincode: '700001',
    serviceable: false,
    codAvailable: false,
    prepaidAvailable: false,
    pickupAvailable: false,
    city: 'Kolkata',
    state: 'WB',
    remarks: 'Embargoed area',
    source: 'delhivery_api',
  });
  assert.equal(unserviceable.available, false);
  assert.equal(unserviceable.reason, 'Embargoed area');

  const prepaidOnlyViaDelhivery = evaluateProductForPincode(
    blockList,
    '700001',
    DEFAULT_STOREFRONT_CONFIG,
    {
      pincode: '700001',
      serviceable: true,
      codAvailable: false,
      prepaidAvailable: true,
      pickupAvailable: true,
      city: 'Kolkata',
      state: 'WB',
      remarks: '',
      source: 'delhivery_api',
    }
  );
  assert.equal(prepaidOnlyViaDelhivery.available, true);
  assert.equal(prepaidOnlyViaDelhivery.codAvailable, false);
});

test('computeSeoAudit scores strong vs missing product SEO accurately', () => {
  const samples = createSampleCatalogProducts('Broomies');
  const strongAudit = computeSeoAudit(samples[0]);
  const weakAudit = computeSeoAudit(samples[1]);

  assert.equal(strongAudit.score, 100);
  assert.equal(strongAudit.status, 'good');
  assert.equal(strongAudit.issues.length, 0);

  assert.equal(weakAudit.hasAltText, false);
  assert.equal(weakAudit.status, 'needs_work');
  assert.ok(weakAudit.issues.some((i) => i.includes('Missing meta description')));
  assert.ok(weakAudit.issues.some((i) => i.includes('Missing image alt text')));

  const summary = computeStoreSeoSummary(samples);
  assert.equal(summary.totalProducts, 3);
  assert.equal(summary.goodCount, 2);
  assert.equal(summary.needsWorkCount, 1);
  assert.equal(summary.missingCount, 0);
  assert.equal(summary.missingAltCount, 1);
});

test('renderBulkSeoTemplate, slugifyProductHandle, and buildProductJsonLd produce valid output', () => {
  const samples = createSampleCatalogProducts('Broomies');
  const title = renderBulkSeoTemplate(
    '{{title}} | {{shop_name}}',
    samples[1],
    'Broomies Bakery',
    60
  );
  assert.ok(title.length <= 60);
  assert.ok(title.includes('Roasted Almond'));

  assert.equal(slugifyProductHandle('  Chocolate Cake (500g)! '), 'chocolate-cake-500g');

  const schema = buildProductJsonLd(samples[0], 'https://broomies.myshopify.com', 'Broomies Bakery');
  assert.equal(schema['@type'], 'Product');
  assert.equal((schema.offers as { priceCurrency: string }).priceCurrency, 'INR');

  const snippet = buildShopifyLiquidSnippet('https://orderpulse.vercel.app/');
  assert.ok(snippet.includes('https://orderpulse.vercel.app/api/storefront/widget.js'));
});

test('auto-pincode helpers extract public client IP, GPS reverse geocode, and IP geo payloads', () => {
  assert.equal(DEFAULT_STOREFRONT_CONFIG.autoDetectPincode, true);

  assert.equal(
    extractClientIpFromHeaders({
      'x-forwarded-for': '127.0.0.1, ::ffff:49.36.120.14, 10.0.0.2',
    }),
    '49.36.120.14'
  );
  assert.equal(extractClientIpFromHeaders({ 'x-forwarded-for': '192.168.1.5, ::1' }), '');

  const gpsHit = extractPincodeFromReverseGeocode({
    address: {
      country_code: 'in',
      city: 'Mumbai',
      state: 'Maharashtra',
      postcode: '400 001',
    },
  });
  assert.deepEqual(gpsHit, { pincode: '400001', city: 'Mumbai', state: 'Maharashtra' });

  const gpsDisplayFallback = extractPincodeFromReverseGeocode({
    display_name: 'Connaught Place, New Delhi, Delhi, 110001, India',
    address: { country_code: 'in', city: 'New Delhi', state: 'Delhi' },
  });
  assert.equal(gpsDisplayFallback.pincode, '110001');

  const ipHit = extractPincodeFromIpGeo({
    country_code: 'IN',
    city: 'Bengaluru',
    region: 'Karnataka',
    postal: '560001',
  });
  assert.deepEqual(ipHit, {
    isIndia: true,
    pincode: '560001',
    city: 'Bengaluru',
    state: 'Karnataka',
  });

  const foreignIp = extractPincodeFromIpGeo({
    country_code: 'US',
    city: 'San Jose',
    postal: '95113',
  });
  assert.equal(foreignIp.isIndia, false);
  assert.equal(foreignIp.pincode, '');

  assert.equal(
    normalizeStorefrontOrigin('whatsa86.vercel.app/'),
    'https://whatsa86.vercel.app'
  );
  assert.equal(
    normalizeStorefrontOrigin('http://whatsa86.vercel.app'),
    'https://whatsa86.vercel.app'
  );
  assert.equal(
    normalizeStorefrontOrigin('', 'whatsa86.vercel.app', 'http,https', 'http'),
    'https://whatsa86.vercel.app'
  );
  assert.equal(
    normalizeStorefrontOrigin('', 'localhost:3000', undefined, 'http'),
    'http://localhost:3000'
  );
});

test('evaluateProductForPincode handles undefined allowedPincodes/blockedPincodes stripped by Firebase RTDB', () => {
  const sample = createSampleCatalogProducts('Broomies Bakery')[0];
  const rtdbStrippedAllow = {
    ...sample,
    pincodeMode: 'allow_list' as const,
    allowedPincodes: undefined as unknown as string[],
    blockedPincodes: undefined as unknown as string[],
  };
  const allowEval = evaluateProductForPincode(rtdbStrippedAllow, '121001');
  assert.equal(allowEval.available, false);
  assert.ok(allowEval.reason.includes('0 allowed pincode'));

  const rtdbStrippedBlock = {
    ...sample,
    pincodeMode: 'block_list' as const,
    allowedPincodes: undefined as unknown as string[],
    blockedPincodes: undefined as unknown as string[],
  };
  const blockEval = evaluateProductForPincode(rtdbStrippedBlock, '121001');
  assert.equal(blockEval.available, true);
});

