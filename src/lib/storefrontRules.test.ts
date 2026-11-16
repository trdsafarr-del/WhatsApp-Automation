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
  normalizeIndianPincode,
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
