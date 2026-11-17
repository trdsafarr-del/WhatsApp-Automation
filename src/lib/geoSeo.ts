import type {
  GeoCakeCategory,
  GeoIntentModifier,
  GeoLocality,
  GeoSeoConfig,
  GeoZoneHub,
  ProductCatalogItem,
} from './types.js';

export const SITEMAP_URLS_PER_SHARD = 5000;

export const DEFAULT_GEO_HUBS: GeoZoneHub[] = [
  {
    id: 'hub-sec-31',
    name: 'Sector 31',
    slug: 'sector-31',
    pincode: '121003',
    lat: 28.4414,
    lng: 77.3137,
    radiusKm: 5,
    enabled: true,
  },
  {
    id: 'hub-sec-88',
    name: 'Sector 88',
    slug: 'sector-88',
    pincode: '121002',
    lat: 28.4231,
    lng: 77.349,
    radiusKm: 5,
    enabled: true,
  },
  {
    id: 'hub-sec-35',
    name: 'Sector 35',
    slug: 'sector-35',
    pincode: '121003',
    lat: 28.4586,
    lng: 77.3105,
    radiusKm: 5,
    enabled: true,
  },
  {
    id: 'hub-sec-42',
    name: 'Sector 42',
    slug: 'sector-42',
    pincode: '121010',
    lat: 28.4648,
    lng: 77.2912,
    radiusKm: 5,
    enabled: true,
  },
];

export const DEFAULT_FARIDABAD_LOCALITIES: GeoLocality[] = [
  // Sector 31 5km Cluster
  { id: 'loc-sec-31', name: 'Sector 31', slug: 'sector-31', pincode: '121003', lat: 28.4414, lng: 77.3137, areaType: 'sector' },
  { id: 'loc-sec-27a', name: 'Sector 27A', slug: 'sector-27a', pincode: '121003', lat: 28.448, lng: 77.3045, areaType: 'sector' },
  { id: 'loc-sec-27b', name: 'Sector 27B', slug: 'sector-27b', pincode: '121003', lat: 28.4422, lng: 77.3038, areaType: 'sector' },
  { id: 'loc-sec-27c', name: 'Sector 27C', slug: 'sector-27c', pincode: '121003', lat: 28.4368, lng: 77.3032, areaType: 'sector' },
  { id: 'loc-sec-27d', name: 'Sector 27D', slug: 'sector-27d', pincode: '121003', lat: 28.431, lng: 77.304, areaType: 'sector' },
  { id: 'loc-sec-28', name: 'Sector 28', slug: 'sector-28', pincode: '121008', lat: 28.4285, lng: 77.3105, areaType: 'sector' },
  { id: 'loc-sec-29', name: 'Sector 29', slug: 'sector-29', pincode: '121008', lat: 28.4252, lng: 77.3188, areaType: 'sector' },
  { id: 'loc-sec-30', name: 'Sector 30', slug: 'sector-30', pincode: '121003', lat: 28.4362, lng: 77.321, areaType: 'sector' },
  { id: 'loc-sec-32', name: 'Sector 32', slug: 'sector-32', pincode: '121003', lat: 28.4395, lng: 77.3258, areaType: 'sector' },
  { id: 'loc-sec-33', name: 'Sector 33', slug: 'sector-33', pincode: '121003', lat: 28.4445, lng: 77.3262, areaType: 'sector' },
  { id: 'loc-sec-34', name: 'Sector 34', slug: 'sector-34', pincode: '121003', lat: 28.4512, lng: 77.3168, areaType: 'sector' },
  { id: 'loc-spring-field', name: 'Spring Field Colony', slug: 'spring-field-colony', pincode: '121003', lat: 28.444, lng: 77.318, areaType: 'colony' },
  { id: 'loc-indraprastha', name: 'Indraprastha Colony', slug: 'indraprastha-colony', pincode: '121003', lat: 28.447, lng: 77.3215, areaType: 'colony' },
  { id: 'loc-mewla', name: 'Mewla Maharajpur', slug: 'mewla-maharajpur', pincode: '121003', lat: 28.4342, lng: 77.3025, areaType: 'colony' },
  { id: 'loc-dlf-ind-1', name: 'DLF Industrial Area Phase 1', slug: 'dlf-industrial-area-phase-1', pincode: '121003', lat: 28.4485, lng: 77.3082, areaType: 'landmark' },
  { id: 'loc-nhpc-chowk', name: 'NHPC Chowk Metro', slug: 'nhpc-chowk-metro', pincode: '121003', lat: 28.4525, lng: 77.3075, areaType: 'landmark' },
  { id: 'loc-badkhal-more', name: 'Badkhal More Metro', slug: 'badkhal-more-metro', pincode: '121002', lat: 28.4225, lng: 77.3095, areaType: 'landmark' },
  { id: 'loc-sec-19', name: 'Sector 19', slug: 'sector-19', pincode: '121002', lat: 28.419, lng: 77.3185, areaType: 'sector' },
  { id: 'loc-sec-20', name: 'Sector 20', slug: 'sector-20', pincode: '121001', lat: 28.414, lng: 77.3065, areaType: 'sector' },
  { id: 'loc-sec-21a', name: 'Sector 21A', slug: 'sector-21a', pincode: '121001', lat: 28.4212, lng: 77.298, areaType: 'sector' },
  { id: 'loc-sec-21b', name: 'Sector 21B', slug: 'sector-21b', pincode: '121001', lat: 28.4258, lng: 77.295, areaType: 'sector' },
  { id: 'loc-sec-21c', name: 'Sector 21C', slug: 'sector-21c', pincode: '121001', lat: 28.4318, lng: 77.2895, areaType: 'sector' },
  { id: 'loc-sec-21d', name: 'Sector 21D', slug: 'sector-21d', pincode: '121001', lat: 28.415, lng: 77.2915, areaType: 'sector' },

  // Sector 35 5km Cluster
  { id: 'loc-sec-35', name: 'Sector 35', slug: 'sector-35', pincode: '121003', lat: 28.4586, lng: 77.3105, areaType: 'sector' },
  { id: 'loc-sec-36', name: 'Sector 36', slug: 'sector-36', pincode: '121003', lat: 28.463, lng: 77.3145, areaType: 'sector' },
  { id: 'loc-sec-37', name: 'Sector 37', slug: 'sector-37', pincode: '121003', lat: 28.4692, lng: 77.3095, areaType: 'sector' },
  { id: 'loc-ashoka-1', name: 'Ashoka Enclave Part 1', slug: 'ashoka-enclave-part-1', pincode: '121003', lat: 28.4565, lng: 77.3055, areaType: 'colony' },
  { id: 'loc-ashoka-2', name: 'Ashoka Enclave Part 2', slug: 'ashoka-enclave-part-2', pincode: '121003', lat: 28.4602, lng: 77.3065, areaType: 'colony' },
  { id: 'loc-ashoka-3', name: 'Ashoka Enclave Part 3', slug: 'ashoka-enclave-part-3', pincode: '121003', lat: 28.4635, lng: 77.3045, areaType: 'colony' },
  { id: 'loc-ashoka-main', name: 'Ashoka Enclave Main', slug: 'ashoka-enclave-main', pincode: '121003', lat: 28.459, lng: 77.3025, areaType: 'colony' },
  { id: 'loc-kanishka', name: 'Kanishka Towers', slug: 'kanishka-towers', pincode: '121003', lat: 28.457, lng: 77.313, areaType: 'society' },
  { id: 'loc-sarai-khwaja', name: 'Sarai Khwaja', slug: 'sarai-khwaja', pincode: '121003', lat: 28.4745, lng: 77.3082, areaType: 'landmark' },
  { id: 'loc-palla', name: 'Palla Chowk', slug: 'palla-chowk', pincode: '121003', lat: 28.4712, lng: 77.326, areaType: 'landmark' },
  { id: 'loc-etmadpur', name: 'Etmadpur', slug: 'etmadpur', pincode: '121003', lat: 28.4515, lng: 77.334, areaType: 'colony' },
  { id: 'loc-tilpat', name: 'Tilpat', slug: 'tilpat', pincode: '121003', lat: 28.462, lng: 77.3385, areaType: 'colony' },
  { id: 'loc-agwanpur', name: 'Agwanpur', slug: 'agwanpur', pincode: '121003', lat: 28.481, lng: 77.3245, areaType: 'colony' },
  { id: 'loc-ismailpur', name: 'Ismailpur', slug: 'ismailpur', pincode: '121013', lat: 28.488, lng: 77.321, areaType: 'colony' },
  { id: 'loc-sec-91', name: 'Sector 91', slug: 'sector-91', pincode: '121013', lat: 28.4685, lng: 77.3335, areaType: 'sector' },
  { id: 'loc-surya-nagar', name: 'Surya Nagar Phase 1', slug: 'surya-nagar-phase-1', pincode: '121003', lat: 28.4765, lng: 77.3285, areaType: 'colony' },

  // Sector 42 5km Cluster
  { id: 'loc-sec-42', name: 'Sector 42', slug: 'sector-42', pincode: '121010', lat: 28.4648, lng: 77.2912, areaType: 'sector' },
  { id: 'loc-sec-41', name: 'Sector 41', slug: 'sector-41', pincode: '121010', lat: 28.466, lng: 77.298, areaType: 'sector' },
  { id: 'loc-sec-43', name: 'Sector 43', slug: 'sector-43', pincode: '121010', lat: 28.461, lng: 77.2865, areaType: 'sector' },
  { id: 'loc-sec-44', name: 'Sector 44', slug: 'sector-44', pincode: '121010', lat: 28.4575, lng: 77.2925, areaType: 'sector' },
  { id: 'loc-sec-45', name: 'Sector 45', slug: 'sector-45', pincode: '121010', lat: 28.4515, lng: 77.2965, areaType: 'sector' },
  { id: 'loc-sec-46', name: 'Sector 46', slug: 'sector-46', pincode: '121010', lat: 28.4455, lng: 77.2925, areaType: 'sector' },
  { id: 'loc-greenfields', name: 'Greenfields Colony', slug: 'greenfields-colony', pincode: '121010', lat: 28.4702, lng: 77.2965, areaType: 'colony' },
  { id: 'loc-charmwood', name: 'Charmwood Village', slug: 'charmwood-village', pincode: '121009', lat: 28.482, lng: 77.2845, areaType: 'society' },
  { id: 'loc-eros-garden', name: 'Eros Garden', slug: 'eros-garden', pincode: '121009', lat: 28.4855, lng: 77.2882, areaType: 'society' },
  { id: 'loc-surajkund', name: 'Surajkund Road', slug: 'surajkund-road', pincode: '121009', lat: 28.481, lng: 77.2795, areaType: 'landmark' },
  { id: 'loc-dayal-bagh', name: 'Dayal Bagh', slug: 'dayal-bagh', pincode: '121009', lat: 28.4875, lng: 77.294, areaType: 'colony' },
  { id: 'loc-lakkarpur', name: 'Lakkarpur', slug: 'lakkarpur', pincode: '121009', lat: 28.485, lng: 77.282, areaType: 'colony' },
  { id: 'loc-ankhir', name: 'Ankhir Chowk', slug: 'ankhir-chowk', pincode: '121001', lat: 28.446, lng: 77.2825, areaType: 'landmark' },
  { id: 'loc-lakewood', name: 'Lakewood Enclave', slug: 'lakewood-enclave', pincode: '121009', lat: 28.4882, lng: 77.2905, areaType: 'society' },
  { id: 'loc-omaxe-hills', name: 'Omaxe Hills', slug: 'omaxe-hills', pincode: '121010', lat: 28.4745, lng: 77.281, areaType: 'society' },
  { id: 'loc-rail-vihar', name: 'Rail Vihar Sector 45', slug: 'rail-vihar-sector-45', pincode: '121010', lat: 28.45, lng: 77.2945, areaType: 'society' },

  // Sector 88 & Greater Faridabad Neharpar 5km Cluster
  { id: 'loc-sec-88', name: 'Sector 88', slug: 'sector-88', pincode: '121002', lat: 28.4231, lng: 77.349, areaType: 'sector' },
  { id: 'loc-sec-89', name: 'Sector 89', slug: 'sector-89', pincode: '121002', lat: 28.431, lng: 77.3525, areaType: 'sector' },
  { id: 'loc-sec-87', name: 'Sector 87', slug: 'sector-87', pincode: '121002', lat: 28.419, lng: 77.3405, areaType: 'sector' },
  { id: 'loc-sec-86', name: 'Sector 86', slug: 'sector-86', pincode: '121002', lat: 28.4135, lng: 77.3435, areaType: 'sector' },
  { id: 'loc-sec-85', name: 'Sector 85', slug: 'sector-85', pincode: '121002', lat: 28.411, lng: 77.3525, areaType: 'sector' },
  { id: 'loc-sec-84', name: 'Sector 84', slug: 'sector-84', pincode: '121002', lat: 28.4045, lng: 77.3495, areaType: 'sector' },
  { id: 'loc-sec-83', name: 'Sector 83', slug: 'sector-83', pincode: '121002', lat: 28.407, lng: 77.3385, areaType: 'sector' },
  { id: 'loc-sec-82', name: 'Sector 82', slug: 'sector-82', pincode: '121002', lat: 28.3995, lng: 77.3445, areaType: 'sector' },
  { id: 'loc-sec-81', name: 'Sector 81', slug: 'sector-81', pincode: '121002', lat: 28.3965, lng: 77.3365, areaType: 'sector' },
  { id: 'loc-sec-79', name: 'Sector 79', slug: 'sector-79', pincode: '121002', lat: 28.391, lng: 77.3465, areaType: 'sector' },
  { id: 'loc-sec-78', name: 'Sector 78', slug: 'sector-78', pincode: '121002', lat: 28.3875, lng: 77.341, areaType: 'sector' },
  { id: 'loc-sec-77', name: 'Sector 77', slug: 'sector-77', pincode: '121004', lat: 28.381, lng: 77.3485, areaType: 'sector' },
  { id: 'loc-sec-76', name: 'Sector 76', slug: 'sector-76', pincode: '121004', lat: 28.3835, lng: 77.338, areaType: 'sector' },
  { id: 'loc-omaxe-ws', name: 'Omaxe World Street', slug: 'omaxe-world-street', pincode: '121002', lat: 28.3918, lng: 77.346, areaType: 'landmark' },
  { id: 'loc-rps-savana', name: 'RPS Savana Sector 88', slug: 'rps-savana-sector-88', pincode: '121002', lat: 28.424, lng: 77.3515, areaType: 'society' },
  { id: 'loc-puri-pranayam', name: 'Puri Pranayam Sector 82', slug: 'puri-pranayam-sector-82', pincode: '121002', lat: 28.4015, lng: 77.3445, areaType: 'society' },
  { id: 'loc-bptp-parklands', name: 'BPTP Parklands Neharpar', slug: 'bptp-parklands-neharpar', pincode: '121002', lat: 28.4055, lng: 77.341, areaType: 'society' },
  { id: 'loc-neharpar', name: 'Greater Faridabad Neharpar', slug: 'greater-faridabad-neharpar', pincode: '121002', lat: 28.418, lng: 77.347, areaType: 'landmark' },
  { id: 'loc-kheri-kalan', name: 'Kheri Kalan', slug: 'kheri-kalan', pincode: '121002', lat: 28.4165, lng: 77.362, areaType: 'colony' },
  { id: 'loc-sec-14', name: 'Sector 14', slug: 'sector-14', pincode: '121007', lat: 28.397, lng: 77.326, areaType: 'sector' },
  { id: 'loc-sec-15', name: 'Sector 15', slug: 'sector-15', pincode: '121007', lat: 28.3965, lng: 77.3195, areaType: 'sector' },
  { id: 'loc-sec-16', name: 'Sector 16', slug: 'sector-16', pincode: '121002', lat: 28.406, lng: 77.3185, areaType: 'sector' },
  { id: 'loc-sec-17', name: 'Sector 17', slug: 'sector-17', pincode: '121002', lat: 28.4115, lng: 77.325, areaType: 'sector' },
  { id: 'loc-sec-18', name: 'Sector 18', slug: 'sector-18', pincode: '121002', lat: 28.416, lng: 77.3265, areaType: 'sector' },
];

export const DEFAULT_GEO_CATEGORIES: GeoCakeCategory[] = [
  {
    id: 'cat-custom-cakes',
    name: 'Custom Cakes',
    slug: 'custom-cakes',
    keywords: ['custom cakes', 'customized cake', 'designer cake order', 'made to order cakes'],
    matchTerms: ['custom', 'theme', 'fondant', 'designer', 'tier', 'photo', 'cake'],
    enabled: true,
  },
  {
    id: 'cat-ready-to-eat',
    name: 'Ready to Eat Cakes',
    slug: 'ready-to-eat-cakes',
    keywords: ['ready to eat cakes', 'ready cakes near me', 'instant cake delivery', 'fresh ready cake'],
    matchTerms: ['ready', 'truffle', 'chocolate', 'butterscotch', 'pineapple', 'fresh', 'cake'],
    enabled: true,
  },
  {
    id: 'cat-birthday-cakes',
    name: 'Birthday Cakes',
    slug: 'birthday-cakes',
    keywords: ['birthday cake delivery', 'happy birthday cake', 'kids birthday cake'],
    matchTerms: ['birthday', 'cake', 'celebration', 'chocolate', 'pinata'],
    enabled: true,
  },
  {
    id: 'cat-eggless-cakes',
    name: 'Eggless Fresh Cakes',
    slug: 'eggless-cakes',
    keywords: ['100% eggless cake', 'pure veg bakery cake', 'fresh eggless cake'],
    matchTerms: ['eggless', 'veg', 'cake'],
    enabled: true,
  },
  {
    id: 'cat-chocolate-truffle',
    name: 'Chocolate Truffle Cakes',
    slug: 'chocolate-truffle-cakes',
    keywords: ['belgian chocolate truffle cake', 'dark chocolate cake', 'dutch truffle'],
    matchTerms: ['chocolate', 'truffle', 'choco', 'fudge', 'belgian'],
    enabled: true,
  },
  {
    id: 'cat-anniversary-cakes',
    name: 'Anniversary Cakes',
    slug: 'anniversary-cakes',
    keywords: ['anniversary cake delivery', 'heart shape cake', 'couple celebration cake'],
    matchTerms: ['anniversary', 'heart', 'red velvet', 'rose', 'tier'],
    enabled: true,
  },
  {
    id: 'cat-photo-cakes',
    name: 'Photo & Theme Cakes',
    slug: 'photo-theme-cakes',
    keywords: ['edible photo print cake', 'custom theme cake', 'picture cake'],
    matchTerms: ['photo', 'theme', 'custom', 'print'],
    enabled: true,
  },
  {
    id: 'cat-wedding-tier',
    name: 'Wedding & Two Tier Cakes',
    slug: 'wedding-tier-cakes',
    keywords: ['2 tier engagement cake', 'wedding designer cake', 'multi tier cake'],
    matchTerms: ['tier', 'wedding', 'engagement', 'floral', 'fondant'],
    enabled: true,
  },
  {
    id: 'cat-bento-mini',
    name: 'Bento & Mini Cakes',
    slug: 'bento-mini-cakes',
    keywords: ['korean bento cake', 'mini lunchbox cake', '250g small cake'],
    matchTerms: ['bento', 'mini', 'small', '250g'],
    enabled: true,
  },
  {
    id: 'cat-kids-cartoon',
    name: 'Kids Cartoon & Fondant Cakes',
    slug: 'kids-cartoon-cakes',
    keywords: ['kids cartoon cake', 'unicorn spiderman fondant cake', '1st birthday cake'],
    matchTerms: ['kids', 'cartoon', 'unicorn', 'fondant', 'baby'],
    enabled: true,
  },
  {
    id: 'cat-butterscotch-pineapple',
    name: 'Butterscotch & Pineapple Cakes',
    slug: 'butterscotch-pineapple-cakes',
    keywords: ['crunchy butterscotch cake', 'fresh pineapple cake', 'classic cream cake'],
    matchTerms: ['butterscotch', 'pineapple', 'crunch', 'classic'],
    enabled: true,
  },
  {
    id: 'cat-red-velvet-fruit',
    name: 'Red Velvet & Fresh Fruit Cakes',
    slug: 'red-velvet-fruit-cakes',
    keywords: ['cream cheese red velvet cake', 'seasonal fruit cake', 'berry cake'],
    matchTerms: ['velvet', 'fruit', 'strawberry', 'blueberry', 'mango'],
    enabled: true,
  },
  {
    id: 'cat-pinata-bomb',
    name: 'Pinata & Surprise Bomb Cakes',
    slug: 'pinata-surprise-cakes',
    keywords: ['hammer pinata cake', 'chocolate bomb cake', 'pull me up cake'],
    matchTerms: ['pinata', 'bomb', 'pull', 'surprise'],
    enabled: true,
  },
  {
    id: 'cat-cupcakes-jar',
    name: 'Cupcakes, Brownies & Cake Jars',
    slug: 'cupcakes-cake-jars',
    keywords: ['assorted cupcakes box', 'walnut brownies', 'ready to eat cake jars'],
    matchTerms: ['cupcake', 'jar', 'brownie', 'pastry', 'muffin'],
    enabled: true,
  },
  {
    id: 'cat-rasmalai-fusion',
    name: 'Rasmalai & Indian Fusion Cakes',
    slug: 'rasmalai-fusion-cakes',
    keywords: ['rasmalai cake', 'gulab jamun fusion cake', 'pistachio kulfi cake'],
    matchTerms: ['rasmalai', 'pistachio', 'fusion', 'cardamom', 'rose'],
    enabled: true,
  },
  {
    id: 'cat-corporate-party',
    name: 'Corporate & Bulk Party Cakes',
    slug: 'corporate-party-cakes',
    keywords: ['office celebration cake', 'edible logo corporate cake', 'bulk party cake'],
    matchTerms: ['corporate', 'office', 'bulk', 'logo', 'sheet'],
    enabled: true,
  },
];

export const DEFAULT_GEO_MODIFIERS: GeoIntentModifier[] = [
  { id: 'mod-same-day', label: 'Same-Day Delivery', slug: 'same-day-delivery', shortDesc: 'Fast same-day doorstep delivery across Faridabad zones', enabled: true },
  { id: 'mod-midnight', label: 'Midnight Delivery', slug: 'midnight-delivery', shortDesc: '12 AM midnight celebration cake surprise slot', enabled: true },
  { id: 'mod-2hour', label: '2-Hour Express', slug: '2-hour-express', shortDesc: 'Rapid kitchen dispatch for ready & signature cakes', enabled: true },
  { id: 'mod-near-me', label: 'Near Me Best Bakery', slug: 'near-me', shortDesc: 'Top-rated local cake kitchen right inside your 5 km zone', enabled: true },
  { id: 'mod-eggless', label: '100% Eggless Fresh', slug: 'eggless-fresh', shortDesc: 'Pure vegetarian eggless sponges baked fresh daily', enabled: true },
  { id: 'mod-online-cod', label: 'Order Online & COD', slug: 'order-online-cod', shortDesc: 'Easy online UPI, card checkout & Cash on Delivery', enabled: true },
  { id: 'mod-custom-weight', label: '500g to 5kg Weights', slug: '500g-to-5kg', shortDesc: 'Available in 500g, 1kg, 2kg & custom tier sizes', enabled: true },
  { id: 'mod-under-599', label: 'Best Price Value', slug: 'best-price', shortDesc: 'Artisan bakery quality starting at transparent local prices', enabled: true },
  { id: 'mod-pure-cream', label: 'Belgian Cocoa & Pure Cream', slug: 'pure-cream-cocoa', shortDesc: 'Zero artificial premix shortcuts, rich chocolate & cream', enabled: true },
  { id: 'mod-home-delivery', label: 'Home Delivery Guaranteed', slug: 'home-delivery', shortDesc: 'Temperature-safe local rider delivery to home & office', enabled: true },
  { id: 'mod-custom-design', label: 'WhatsApp Design Support', slug: 'custom-design', shortDesc: 'Share reference photos & custom message on WhatsApp', enabled: true },
  { id: 'mod-top-rated', label: 'Top Rated Cake Shop', slug: 'top-rated-bakery', shortDesc: 'Trusted by families in Sector 31, 88, 35 & 42 Faridabad', enabled: true },
];

export const DEFAULT_GEO_SEO_CONFIG: GeoSeoConfig = {
  enabled: true,
  primaryWebsiteUrl: 'https://broomiesbakery.in',
  brandName: 'Broomies Bakery',
  cityName: 'Faridabad',
  stateName: 'Haryana',
  combineAllHubsIntoSingleZone: true,
  includeTier2Matrix: true,
  includeTier3Matrix: true,
  injectStorefrontGeoSchema: true,
  shopifyProxyPrefix: '/apps/cakes',
  showStorefrontZoneFooter: true,
  hubs: DEFAULT_GEO_HUBS,
  localities: DEFAULT_FARIDABAD_LOCALITIES,
  categories: DEFAULT_GEO_CATEGORIES,
  modifiers: DEFAULT_GEO_MODIFIERS,
  updatedAt: new Date(0).toISOString(),
};

export function slugifyGeoPart(raw: string): string {
  return (raw || '')
    .toLowerCase()
    .trim()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 64);
}

export function slugifyLocalityPart(raw: string): string {
  return slugifyGeoPart(raw).replace(/-faridabad$/i, '');
}

/**
 * Great-circle Haversine distance in kilometers between two GPS coordinates.
 */
export function calculateDistanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 100) / 100;
}

export interface CoveredLocality {
  locality: GeoLocality;
  nearestHub: GeoZoneHub;
  distanceKm: number;
  matchingHubIds: string[];
  matchingHubNames: string[];
}

export function getCoveredLocalities(config: GeoSeoConfig): CoveredLocality[] {
  const activeHubs = (config.hubs || []).filter((h) => h.enabled);
  if (activeHubs.length === 0) return [];

  const covered: CoveredLocality[] = [];
  for (const loc of config.localities || []) {
    const matches: Array<{ hub: GeoZoneHub; dist: number }> = [];
    for (const hub of activeHubs) {
      const dist = calculateDistanceKm(hub.lat, hub.lng, loc.lat, loc.lng);
      const radius = Math.max(0.5, Number(hub.radiusKm) || 5);
      if (dist <= radius) {
        matches.push({ hub, dist });
      }
    }
    if (matches.length === 0) continue;
    matches.sort((a, b) => a.dist - b.dist);
    covered.push({
      locality: loc,
      nearestHub: matches[0].hub,
      distanceKm: matches[0].dist,
      matchingHubIds: matches.map((m) => m.hub.id),
      matchingHubNames: matches.map((m) => m.hub.name),
    });
  }
  return covered;
}

export interface GeoSeoStats {
  activeHubsCount: number;
  coveredLocalitiesCount: number;
  activeCategoriesCount: number;
  activeModifiersCount: number;
  tier1Count: number;
  tier2Count: number;
  tier3Count: number;
  totalPages: number;
  sitemapShardCount: number;
}

export function getGeoSeoStats(config: GeoSeoConfig): GeoSeoStats {
  const activeHubs = (config.hubs || []).filter((h) => h.enabled);
  const coveredLocalities = getCoveredLocalities(config);
  const activeCategories = (config.categories || []).filter((c) => c.enabled);
  const activeModifiers = (config.modifiers || []).filter((m) => m.enabled);

  const tier1Count = activeHubs.length;
  const tier2Count =
    config.includeTier2Matrix !== false ? coveredLocalities.length * activeCategories.length : 0;
  const tier3Count =
    config.includeTier3Matrix !== false
      ? coveredLocalities.length * activeCategories.length * activeModifiers.length
      : 0;
  const totalPages = tier1Count + tier2Count + tier3Count;
  const sitemapShardCount = Math.max(1, Math.ceil(totalPages / SITEMAP_URLS_PER_SHARD));

  return {
    activeHubsCount: activeHubs.length,
    coveredLocalitiesCount: coveredLocalities.length,
    activeCategoriesCount: activeCategories.length,
    activeModifiersCount: activeModifiers.length,
    tier1Count,
    tier2Count,
    tier3Count,
    totalPages,
    sitemapShardCount,
  };
}

export interface ResolvedGeoSeoRef {
  tier: 1 | 2 | 3;
  slug: string;
  hub: GeoZoneHub;
  locality: CoveredLocality | null;
  category: GeoCakeCategory | null;
  modifier: GeoIntentModifier | null;
}

export function buildTier1Slug(hub: GeoZoneHub, cityName = 'Faridabad'): string {
  const citySlug = slugifyGeoPart(cityName) || 'faridabad';
  return `cakes-near-${slugifyLocalityPart(hub.slug || hub.name)}-${citySlug}`;
}

export function buildTier2Slug(
  category: GeoCakeCategory,
  locality: GeoLocality,
  cityName = 'Faridabad'
): string {
  const citySlug = slugifyGeoPart(cityName) || 'faridabad';
  return `${slugifyGeoPart(category.slug || category.name)}-in-${slugifyLocalityPart(locality.slug || locality.name)}-${citySlug}`;
}

export function buildTier3Slug(
  category: GeoCakeCategory,
  locality: GeoLocality,
  modifier: GeoIntentModifier,
  cityName = 'Faridabad'
): string {
  return `${buildTier2Slug(category, locality, cityName)}-${slugifyGeoPart(modifier.slug || modifier.label)}`;
}

/**
 * Deterministic O(1) index-to-page resolver across 10,000+ programmatic pages.
 */
export function getGeoSeoRefAtIndex(
  config: GeoSeoConfig,
  rawIndex: number,
  precomputed?: {
    activeHubs: GeoZoneHub[];
    covered: CoveredLocality[];
    cats: GeoCakeCategory[];
    mods: GeoIntentModifier[];
  }
): ResolvedGeoSeoRef | null {
  const index = Math.floor(rawIndex);
  if (index < 0) return null;

  const activeHubs = precomputed?.activeHubs ?? (config.hubs || []).filter((h) => h.enabled);
  const covered = precomputed?.covered ?? getCoveredLocalities(config);
  const cats = precomputed?.cats ?? (config.categories || []).filter((c) => c.enabled);
  const mods = precomputed?.mods ?? (config.modifiers || []).filter((m) => m.enabled);
  const city = config.cityName || 'Faridabad';

  const t1 = activeHubs.length;
  if (index < t1) {
    const hub = activeHubs[index];
    return {
      tier: 1,
      slug: buildTier1Slug(hub, city),
      hub,
      locality: null,
      category: null,
      modifier: null,
    };
  }

  let rem = index - t1;
  const t2 = config.includeTier2Matrix !== false ? covered.length * cats.length : 0;
  if (rem < t2 && cats.length > 0) {
    const locIdx = Math.floor(rem / cats.length);
    const catIdx = rem % cats.length;
    const cov = covered[locIdx];
    const cat = cats[catIdx];
    return {
      tier: 2,
      slug: buildTier2Slug(cat, cov.locality, city),
      hub: cov.nearestHub,
      locality: cov,
      category: cat,
      modifier: null,
    };
  }

  rem -= t2;
  const t3 =
    config.includeTier3Matrix !== false ? covered.length * cats.length * mods.length : 0;
  if (rem < t3 && cats.length > 0 && mods.length > 0) {
    const perLoc = cats.length * mods.length;
    const locIdx = Math.floor(rem / perLoc);
    const remCat = rem % perLoc;
    const catIdx = Math.floor(remCat / mods.length);
    const modIdx = remCat % mods.length;
    const cov = covered[locIdx];
    const cat = cats[catIdx];
    const mod = mods[modIdx];
    return {
      tier: 3,
      slug: buildTier3Slug(cat, cov.locality, mod, city),
      hub: cov.nearestHub,
      locality: cov,
      category: cat,
      modifier: mod,
    };
  }

  return null;
}

/**
 * Deterministic O(1) URL-slug-to-page resolver for SSR landing pages.
 */
export function resolveGeoSeoPageBySlug(
  config: GeoSeoConfig,
  rawSlug: string
): ResolvedGeoSeoRef | null {
  const cleanSlug = (rawSlug || '').trim().toLowerCase().replace(/^\/+|\/+$/g, '');
  if (!cleanSlug) return null;

  const activeHubs = (config.hubs || []).filter((h) => h.enabled);
  const covered = getCoveredLocalities(config);
  const cats = (config.categories || []).filter((c) => c.enabled);
  const mods = (config.modifiers || []).filter((m) => m.enabled);
  const city = config.cityName || 'Faridabad';
  const citySlug = slugifyGeoPart(city) || 'faridabad';

  for (const hub of activeHubs) {
    if (buildTier1Slug(hub, city) === cleanSlug) {
      return {
        tier: 1,
        slug: cleanSlug,
        hub,
        locality: null,
        category: null,
        modifier: null,
      };
    }
  }

  const inToken = '-in-';
  const inIdx = cleanSlug.indexOf(inToken);
  if (inIdx <= 0) return null;

  const catPart = cleanSlug.slice(0, inIdx);
  const restPart = cleanSlug.slice(inIdx + inToken.length);
  const category = cats.find((c) => slugifyGeoPart(c.slug || c.name) === catPart);
  if (!category) return null;

  const cityToken = `-${citySlug}`;
  if (restPart.endsWith(cityToken) && config.includeTier2Matrix !== false) {
    const locPart = restPart.slice(0, restPart.length - cityToken.length);
    const cov = covered.find((c) => slugifyLocalityPart(c.locality.slug || c.locality.name) === locPart);
    if (!cov) return null;
    return {
      tier: 2,
      slug: cleanSlug,
      hub: cov.nearestHub,
      locality: cov,
      category,
      modifier: null,
    };
  }

  const splitToken = `-${citySlug}-`;
  const splitIdx = restPart.lastIndexOf(splitToken);
  if (splitIdx > 0 && config.includeTier3Matrix !== false) {
    const locPart = restPart.slice(0, splitIdx);
    const modPart = restPart.slice(splitIdx + splitToken.length);
    const cov = covered.find((c) => slugifyLocalityPart(c.locality.slug || c.locality.name) === locPart);
    const modifier = mods.find((m) => slugifyGeoPart(m.slug || m.label) === modPart);
    if (!cov || !modifier) return null;
    return {
      tier: 3,
      slug: cleanSlug,
      hub: cov.nearestHub,
      locality: cov,
      category,
      modifier,
    };
  }

  return null;
}

export function normalizeWebsiteBaseUrl(rawUrl: string): string {
  const clean = (rawUrl || '').trim().replace(/\/+$/, '');
  if (!clean) return 'https://broomiesbakery.in';
  if (/^https?:\/\//i.test(clean)) return clean;
  return `https://${clean}`;
}

export function normalizeShopifyProxyPrefix(rawPrefix?: string): string {
  const trimmed = (rawPrefix || '').trim().replace(/^\/+|\/+$/g, '');
  if (!trimmed) return '/apps/cakes';
  const parts = trimmed.split('/').filter(Boolean);
  const validRoots = new Set(['apps', 'a', 'community', 'tools']);
  if (parts.length >= 2 && validRoots.has(parts[0].toLowerCase())) {
    const sub = slugifyGeoPart(parts.slice(1).join('-')) || 'cakes';
    return `/${parts[0].toLowerCase()}/${sub}`;
  }
  const sub = slugifyGeoPart(parts.join('-')) || 'cakes';
  return `/apps/${sub}`;
}

export function buildStorefrontProxyPageUrl(config: GeoSeoConfig, slug?: string): string {
  const siteUrl = normalizeWebsiteBaseUrl(config.primaryWebsiteUrl);
  const prefix = normalizeShopifyProxyPrefix(config.shopifyProxyPrefix);
  const cleanSlug = (slug || '').trim().replace(/^\/+|\/+$/g, '');
  return cleanSlug ? `${siteUrl}${prefix}/${cleanSlug}` : `${siteUrl}${prefix}`;
}

export function buildStorefrontZoneStripData(config: GeoSeoConfig) {
  const proxyPrefix = normalizeShopifyProxyPrefix(config.shopifyProxyPrefix);
  const city = config.cityName || 'Faridabad';
  const activeHubs = (config.hubs || []).filter((h) => h.enabled);
  return {
    directoryHref: proxyPrefix,
    directoryLabel: `${city} Unified 5 km Cake Zones (${getGeoSeoStats(config).totalPages.toLocaleString()}+ Pages)`,
    hubLinks: activeHubs.map((h) => ({
      name: `${h.name} (${h.pincode})`,
      href: `${proxyPrefix}/${buildTier1Slug(h, city)}`,
    })),
  };
}

export function matchCatalogProductsForCategory(
  products: ProductCatalogItem[],
  category: GeoCakeCategory | null,
  pincode?: string,
  maxItems = 30
): ProductCatalogItem[] {
  const active = (products || []).filter((p) => p.status !== 'archived');
  if (active.length === 0) return [];

  const pinAllowed = active.filter((p) => {
    if (!pincode) return true;
    if (p.pincodeMode === 'allow_list') return p.allowedPincodes.includes(pincode);
    if (p.pincodeMode === 'block_list') return !p.blockedPincodes.includes(pincode);
    return true;
  });

  const pool = pinAllowed.length > 0 ? pinAllowed : active;
  const terms = (category?.matchTerms || [])
    .map((t) => t.toLowerCase().trim())
    .filter(Boolean);
  const isCakeCategory =
    !category ||
    `${category.slug} ${category.name} ${(category.keywords || []).join(' ')}`
      .toLowerCase()
      .includes('cake');

  const scored = pool.map((p, idx) => {
    const hay = `${p.title} ${p.productType} ${p.tags} ${p.seoTitle}`.toLowerCase();
    let score = 0;

    for (const term of terms) {
      if (hay.includes(term)) score += 6;
    }

    if (p.imageUrl && p.imageUrl.trim()) {
      score += 4;
    }

    if (isCakeCategory) {
      if (/\bcake\b|\btruffle\b|\bcheesecake\b|\bbento\b|\bpastry\b/.test(hay)) {
        score += 5;
      }
      if (/meal box|vada pav|burger|samosa|snacks box|combo/.test(hay)) {
        score -= 6;
      }
    }

    return { product: p, score, idx };
  });

  scored.sort((a, b) => (b.score !== a.score ? b.score - a.score : a.idx - b.idx));
  return scored.slice(0, Math.max(1, maxItems)).map((s) => s.product);
}

export interface GeoSeoPageData {
  slug: string;
  tier: 1 | 2 | 3;
  pageUrl: string;
  canonicalUrl: string;
  proxyPageUrl: string;
  proxyPrefix: string;
  primaryWebsiteUrl: string;
  brandName: string;
  cityName: string;
  stateName: string;
  seoTitle: string;
  metaDescription: string;
  h1: string;
  heroSummary: string;
  areaLabel: string;
  pincode: string;
  lat: number;
  lng: number;
  distanceKm: number;
  nearestHub: GeoZoneHub;
  allActiveHubs: GeoZoneHub[];
  category: GeoCakeCategory | null;
  modifier: GeoIntentModifier | null;
  targetKeywords: string[];
  matchedProducts: ProductCatalogItem[];
  faqs: Array<{ question: string; answer: string }>;
  siblingCategoryLinks: Array<{ label: string; href: string }>;
  nearbyLocalityLinks: Array<{ label: string; href: string; distanceKm: number }>;
  jsonLdGraph: Record<string, unknown>;
}

export function clampSeoString(text: string, maxLen: number): string {
  const clean = (text || '').replace(/\s+/g, ' ').trim();
  if (clean.length <= maxLen) return clean;
  return `${clean.slice(0, Math.max(0, maxLen - 1)).trim()}…`;
}

export function buildBakeryStorefrontSchema(
  config: GeoSeoConfig,
  _hostOrigin?: string
): Record<string, unknown> {
  const siteUrl = normalizeWebsiteBaseUrl(config.primaryWebsiteUrl);
  const brand = config.brandName || 'Broomies Bakery';
  const city = config.cityName || 'Faridabad';
  const state = config.stateName || 'Haryana';
  const activeHubs = (config.hubs || []).filter((h) => h.enabled);
  const covered = getCoveredLocalities(config);

  return {
    '@context': 'https://schema.org',
    '@type': 'Bakery',
    name: brand,
    url: siteUrl,
    servesCuisine: 'Custom Cakes, Ready to Eat Cakes, Fresh Bakery & Desserts',
    priceRange: '₹₹',
    address: {
      '@type': 'PostalAddress',
      streetAddress: activeHubs.map((h) => h.name).join(', ') || 'Sector 31, Sector 88, Sector 35, Sector 42',
      addressLocality: city,
      addressRegion: state,
      postalCode: activeHubs[0]?.pincode || '121003',
      addressCountry: 'IN',
    },
    areaServed: [
      ...activeHubs.map((hub) => ({
        '@type': 'GeoCircle',
        name: `${hub.name} ${hub.radiusKm}km Cake Delivery Zone (${city})`,
        geoMidpoint: {
          '@type': 'GeoCoordinates',
          latitude: hub.lat,
          longitude: hub.lng,
        },
        geoRadius: String(Math.round((hub.radiusKm || 5) * 1000)),
      })),
      ...covered.slice(0, 25).map((cov) => ({
        '@type': 'Place',
        name: `${cov.locality.name}, ${city} (${cov.locality.pincode})`,
      })),
    ],
  };
}

export function buildGeoSeoPageData(
  config: GeoSeoConfig,
  ref: ResolvedGeoSeoRef,
  products: ProductCatalogItem[],
  hostOrigin: string,
  opts?: { useProxyCanonical?: boolean }
): GeoSeoPageData {
  const cleanHost = (hostOrigin || 'https://faridabad.broomiesbakery.in').replace(/\/+$/, '');
  const siteUrl = normalizeWebsiteBaseUrl(config.primaryWebsiteUrl);
  const proxyPrefix = normalizeShopifyProxyPrefix(config.shopifyProxyPrefix);
  const proxyPageUrl = `${siteUrl}${proxyPrefix}/${ref.slug}`;
  const useProxy = Boolean(opts?.useProxyCanonical);
  const routePrefix = useProxy ? proxyPrefix : '/seo/faridabad';
  const brand = config.brandName || 'Broomies Bakery';
  const city = config.cityName || 'Faridabad';
  const state = config.stateName || 'Haryana';
  const activeHubs = (config.hubs || []).filter((h) => h.enabled);

  const areaName = ref.locality ? ref.locality.locality.name : ref.hub.name;
  const areaLabel = `${areaName}, ${city}`;
  const pincode = ref.locality ? ref.locality.locality.pincode : ref.hub.pincode;
  const lat = ref.locality ? ref.locality.locality.lat : ref.hub.lat;
  const lng = ref.locality ? ref.locality.locality.lng : ref.hub.lng;
  const distanceKm = ref.locality ? ref.locality.distanceKm : 0;

  const catName = ref.category ? ref.category.name : 'Custom & Ready to Eat Cakes';
  const modLabel = ref.modifier ? ref.modifier.label : 'Same-Day Express Delivery';

  const h1 =
    ref.tier === 1
      ? `${brand} ${ref.hub.name}, ${city} – Custom & Ready to Eat Cakes`
      : ref.tier === 2
        ? `${catName} in ${areaName}, ${city} (${pincode})`
        : `${catName} in ${areaName}, ${city} – ${modLabel}`;

  const rawTitle =
    ref.tier === 1
      ? `${catName} Near ${ref.hub.name} ${city} | ${brand}`
      : ref.tier === 2
        ? `${catName} in ${areaName} ${city} | ${brand}`
        : `${catName} in ${areaName} (${modLabel}) | ${brand}`;
  const seoTitle = clampSeoString(rawTitle, 64);

  const rawDesc =
    ref.tier === 1
      ? `Order fresh 100% eggless custom cakes & ready to eat cakes in ${ref.hub.name}, ${city} (${pincode}). Same-day & midnight delivery from ${siteUrl.replace(/^https?:\/\//, '')}.`
      : `Buy freshly baked ${catName.toLowerCase()} in ${areaName}, ${city} (${pincode}). ${modLabel} & 100% eggless cakes by ${brand}.`;
  const metaDescription = clampSeoString(rawDesc, 160);

  const directPageUrl = `${cleanHost}/seo/faridabad/${ref.slug}`;
  const pageUrl = useProxy ? proxyPageUrl : directPageUrl;
  const matchedProducts = matchCatalogProductsForCategory(products, ref.category, pincode, 30);

  const targetKeywords = [
    `${catName.toLowerCase()} in ${areaName.toLowerCase()} ${city.toLowerCase()}`,
    `custom cakes ${areaName.toLowerCase()}`,
    `ready to eat cakes ${areaName.toLowerCase()}`,
    `cake bakery near ${areaName.toLowerCase()} ${pincode}`,
    `${brand.toLowerCase()} ${ref.hub.name.toLowerCase()} ${city.toLowerCase()}`,
    ...(ref.category?.keywords || []).map((k) => `${k} ${areaName.toLowerCase()}`),
  ].slice(0, 10);

  const deliveryProximityNote =
    distanceKm <= 0.4
      ? `${areaName} (${pincode}) is right next to our ${ref.hub.name} bakery kitchen.`
      : `${areaName} (${pincode}) is closely served by our nearby ${ref.hub.name} bakery kitchen (${distanceKm.toFixed(1)} km away).`;

  const faqs = [
    {
      question: `How fast does ${brand} deliver ${catName.toLowerCase()} to ${areaName}, ${city} (${pincode})?`,
      answer: `${deliveryProximityNote} Ready-to-eat cakes dispatch the same day, and custom photo or theme cakes can be scheduled for afternoon or midnight delivery slots.`,
    },
    {
      question: `Are custom cakes & ready to eat cakes available eggless in ${areaName}?`,
      answer: `Yes! All custom cakes, truffle cakes, butterscotch cakes, bento cakes, and ready-to-eat desserts crafted at ${brand} are 100% pure eggless and baked fresh for delivery in ${areaName} (${pincode}) and nearby ${city} sectors.`,
    },
    {
      question: `Where can I order ${catName.toLowerCase()} online for ${areaName} delivery?`,
      answer: `You can browse live flavours, weights, and prices directly on ${siteUrl} with instant pincode availability check for ${pincode}.`,
    },
  ];

  // Cross-links for crawl depth
  const cats = (config.categories || []).filter((c) => c.enabled);
  const covered = getCoveredLocalities(config);
  const currentLoc = ref.locality?.locality || config.localities.find((l) => l.slug === ref.hub.slug) || config.localities[0];

  const siblingCategoryLinks = currentLoc
    ? cats
        .filter((c) => c.id !== ref.category?.id)
        .slice(0, 8)
        .map((c) => ({
          label: `${c.name} in ${currentLoc.name}`,
          href: `${routePrefix}/${buildTier2Slug(c, currentLoc, city)}`,
        }))
    : [];

  const targetCat = ref.category || cats[0];
  const nearbyLocalityLinks = targetCat
    ? covered
        .filter((c) => c.locality.id !== currentLoc?.id)
        .map((c) => ({
          cov: c,
          dist: calculateDistanceKm(lat, lng, c.locality.lat, c.locality.lng),
        }))
        .sort((a, b) => a.dist - b.dist)
        .slice(0, 8)
        .map(({ cov, dist }) => ({
          label: `${targetCat.name} in ${cov.locality.name} (${cov.locality.pincode})`,
          href: `${routePrefix}/${buildTier2Slug(targetCat, cov.locality, city)}`,
          distanceKm: dist,
        }))
    : [];

  const directoryAbsoluteUrl = useProxy ? `${siteUrl}${proxyPrefix}` : `${cleanHost}/seo/faridabad`;
  const hubAbsoluteUrl = useProxy
    ? `${siteUrl}${proxyPrefix}/${buildTier1Slug(ref.hub, city)}`
    : `${cleanHost}/seo/faridabad/${buildTier1Slug(ref.hub, city)}`;

  const jsonLdGraph: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Bakery',
        '@id': `${siteUrl}#bakery`,
        name: brand,
        url: siteUrl,
        priceRange: '₹₹',
        address: {
          '@type': 'PostalAddress',
          streetAddress: `${ref.hub.name} Cake Zone`,
          addressLocality: areaName,
          addressRegion: state,
          postalCode: pincode,
          addressCountry: 'IN',
        },
        geo: {
          '@type': 'GeoCoordinates',
          latitude: lat,
          longitude: lng,
        },
        areaServed: activeHubs.map((h) => ({
          '@type': 'GeoCircle',
          name: `${h.name} ${h.radiusKm}km Cake Zone`,
          geoMidpoint: {
            '@type': 'GeoCoordinates',
            latitude: h.lat,
            longitude: h.lng,
          },
          geoRadius: String(Math.round((h.radiusKm || 5) * 1000)),
        })),
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: brand, item: siteUrl },
          { '@type': 'ListItem', position: 2, name: `${city} Cake Zones`, item: directoryAbsoluteUrl },
          {
            '@type': 'ListItem',
            position: 3,
            name: `${ref.hub.name} Zone`,
            item: hubAbsoluteUrl,
          },
          { '@type': 'ListItem', position: 4, name: h1, item: pageUrl },
        ],
      },
      {
        '@type': 'FAQPage',
        mainEntity: faqs.map((f) => ({
          '@type': 'Question',
          name: f.question,
          acceptedAnswer: { '@type': 'Answer', text: f.answer },
        })),
      },
      ...(matchedProducts.length > 0
        ? [
            {
              '@type': 'ItemList',
              name: `${catName} for ${areaName}, ${city}`,
              itemListElement: matchedProducts.map((p, idx) => ({
                '@type': 'ListItem',
                position: idx + 1,
                url: `${siteUrl}/products/${p.handle}`,
                name: p.seoTitle || p.title,
              })),
            },
          ]
        : []),
    ],
  };

  return {
    slug: ref.slug,
    tier: ref.tier,
    pageUrl,
    canonicalUrl: pageUrl,
    proxyPageUrl,
    proxyPrefix,
    primaryWebsiteUrl: siteUrl,
    brandName: brand,
    cityName: city,
    stateName: state,
    seoTitle,
    metaDescription,
    h1,
    heroSummary: `Freshly baked 100% eggless ${catName.toLowerCase()} delivered across ${areaName}, ${city} (${pincode}). Order ready-to-eat cakes for same-day delivery or customize theme cakes with ${brand}.`,
    areaLabel,
    pincode,
    lat,
    lng,
    distanceKm,
    nearestHub: ref.hub,
    allActiveHubs: activeHubs,
    category: ref.category,
    modifier: ref.modifier,
    targetKeywords,
    matchedProducts,
    faqs,
    siblingCategoryLinks,
    nearbyLocalityLinks,
    jsonLdGraph,
  };
}

export interface GeoSeoPageQueryResult {
  totalMatched: number;
  page: number;
  limit: number;
  items: Array<{
    index: number;
    tier: 1 | 2 | 3;
    slug: string;
    title: string;
    keyword: string;
    hubName: string;
    localityName: string;
    pincode: string;
    distanceKm: number;
    categoryName: string;
  }>;
}

export function queryGeoSeoPages(
  config: GeoSeoConfig,
  opts: { q?: string; hubId?: string; categoryId?: string; page?: number; limit?: number }
): GeoSeoPageQueryResult {
  const q = (opts.q || '').trim().toLowerCase();
  const hubFilter = (opts.hubId || '').trim();
  const catFilter = (opts.categoryId || '').trim();
  const limit = Math.max(1, Math.min(100, Math.round(opts.limit || 25)));
  const page = Math.max(1, Math.round(opts.page || 1));

  const activeHubs = (config.hubs || []).filter((h) => h.enabled);
  const covered = getCoveredLocalities(config);
  const cats = (config.categories || []).filter((c) => c.enabled);
  const mods = (config.modifiers || []).filter((m) => m.enabled);
  const city = config.cityName || 'Faridabad';

  const items: GeoSeoPageQueryResult['items'] = [];
  let matchedCount = 0;
  const startOffset = (page - 1) * limit;
  const endOffset = startOffset + limit;

  const pushIfMatch = (
    idx: number,
    tier: 1 | 2 | 3,
    slug: string,
    title: string,
    keyword: string,
    hub: GeoZoneHub,
    localityName: string,
    pincode: string,
    distanceKm: number,
    categoryName: string,
    categoryId: string,
    matchingHubIds: string[]
  ) => {
    if (hubFilter && !matchingHubIds.includes(hubFilter) && hub.id !== hubFilter) return;
    if (catFilter && categoryId !== catFilter) return;
    if (q) {
      const hay = `${slug} ${title} ${keyword} ${localityName} ${pincode} ${hub.name} ${categoryName}`.toLowerCase();
      if (!hay.includes(q)) return;
    }
    if (matchedCount >= startOffset && matchedCount < endOffset) {
      items.push({
        index: idx,
        tier,
        slug,
        title,
        keyword,
        hubName: hub.name,
        localityName,
        pincode,
        distanceKm,
        categoryName,
      });
    }
    matchedCount += 1;
  };

  let cursor = 0;
  for (const hub of activeHubs) {
    const slug = buildTier1Slug(hub, city);
    pushIfMatch(
      cursor,
      1,
      slug,
      `Custom & Ready to Eat Cakes Near ${hub.name} ${city}`,
      `cakes near ${hub.name.toLowerCase()} ${city.toLowerCase()}`,
      hub,
      hub.name,
      hub.pincode,
      0,
      'Zone Hub',
      '',
      [hub.id]
    );
    cursor += 1;
  }

  if (config.includeTier2Matrix !== false) {
    for (const cov of covered) {
      for (const cat of cats) {
        const slug = buildTier2Slug(cat, cov.locality, city);
        pushIfMatch(
          cursor,
          2,
          slug,
          `${cat.name} in ${cov.locality.name}, ${city}`,
          `${cat.name.toLowerCase()} in ${cov.locality.name.toLowerCase()}`,
          cov.nearestHub,
          cov.locality.name,
          cov.locality.pincode,
          cov.distanceKm,
          cat.name,
          cat.id,
          cov.matchingHubIds
        );
        cursor += 1;
      }
    }
  }

  if (config.includeTier3Matrix !== false) {
    for (const cov of covered) {
      for (const cat of cats) {
        for (const mod of mods) {
          const slug = buildTier3Slug(cat, cov.locality, mod, city);
          pushIfMatch(
            cursor,
            3,
            slug,
            `${cat.name} in ${cov.locality.name} (${mod.label})`,
            `${cat.name.toLowerCase()} ${cov.locality.name.toLowerCase()} ${mod.label.toLowerCase()}`,
            cov.nearestHub,
            cov.locality.name,
            cov.locality.pincode,
            cov.distanceKm,
            cat.name,
            cat.id,
            cov.matchingHubIds
          );
          cursor += 1;
        }
      }
    }
  }

  return {
    totalMatched: matchedCount,
    page,
    limit,
    items,
  };
}

function escapeXml(value: string): string {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function escapeHtmlText(value: string): string {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function buildSitemapIndexXml(
  hostOrigin: string,
  totalPages: number,
  shardBaseUrl?: string
): string {
  const cleanHost = (hostOrigin || 'https://faridabad.broomiesbakery.in').replace(/\/+$/, '');
  const prefix = (shardBaseUrl || `${cleanHost}/sitemap-geo`).replace(/\/+$/, '');
  const shardCount = Math.max(1, Math.ceil(totalPages / SITEMAP_URLS_PER_SHARD));
  const lastMod = new Date().toISOString().split('T')[0];

  const entries: string[] = [];
  for (let s = 1; s <= shardCount; s += 1) {
    entries.push(
      `  <sitemap>\n    <loc>${escapeXml(`${prefix}/${s}.xml`)}</loc>\n    <lastmod>${lastMod}</lastmod>\n  </sitemap>`
    );
  }

  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join('\n')}\n</sitemapindex>\n`;
}

export function buildGeoSitemapShardXml(
  hostOrigin: string,
  config: GeoSeoConfig,
  shardNumber: number,
  pageBaseUrl?: string
): string {
  const cleanHost = (hostOrigin || 'https://faridabad.broomiesbakery.in').replace(/\/+$/, '');
  const baseUrl = (pageBaseUrl || `${cleanHost}/seo/faridabad`).replace(/\/+$/, '');
  const precomputed = {
    activeHubs: (config.hubs || []).filter((h) => h.enabled),
    covered: getCoveredLocalities(config),
    cats: (config.categories || []).filter((c) => c.enabled),
    mods: (config.modifiers || []).filter((m) => m.enabled),
  };
  const totalPages =
    precomputed.activeHubs.length +
    (config.includeTier2Matrix !== false ? precomputed.covered.length * precomputed.cats.length : 0) +
    (config.includeTier3Matrix !== false
      ? precomputed.covered.length * precomputed.cats.length * precomputed.mods.length
      : 0);
  const shard = Math.max(1, Math.floor(shardNumber));
  const start = (shard - 1) * SITEMAP_URLS_PER_SHARD;
  const end = Math.min(totalPages, start + SITEMAP_URLS_PER_SHARD);
  const lastMod = new Date().toISOString().split('T')[0];

  const urls: string[] = [];
  if (shard === 1) {
    urls.push(
      `  <url>\n    <loc>${escapeXml(baseUrl)}</loc>\n    <lastmod>${lastMod}</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>1.0</priority>\n  </url>`
    );
  }

  for (let i = start; i < end; i += 1) {
    const ref = getGeoSeoRefAtIndex(config, i, precomputed);
    if (!ref) continue;
    const priority = ref.tier === 1 ? '0.9' : ref.tier === 2 ? '0.8' : '0.7';
    urls.push(
      `  <url>\n    <loc>${escapeXml(`${baseUrl}/${ref.slug}`)}</loc>\n    <lastmod>${lastMod}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>${priority}</priority>\n  </url>`
    );
  }

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
}

export function buildProxySitemapIndexXml(config: GeoSeoConfig): string {
  const stats = getGeoSeoStats(config);
  const siteUrl = normalizeWebsiteBaseUrl(config.primaryWebsiteUrl);
  const prefix = normalizeShopifyProxyPrefix(config.shopifyProxyPrefix);
  return buildSitemapIndexXml(siteUrl, stats.totalPages, `${siteUrl}${prefix}/sitemap-geo`);
}

export function buildProxyGeoSitemapShardXml(
  config: GeoSeoConfig,
  shardNumber: number
): string {
  const siteUrl = normalizeWebsiteBaseUrl(config.primaryWebsiteUrl);
  const prefix = normalizeShopifyProxyPrefix(config.shopifyProxyPrefix);
  return buildGeoSitemapShardXml(siteUrl, config, shardNumber, `${siteUrl}${prefix}`);
}

function formatInrShopPrice(rawPrice?: string): string {
  const num = Number.parseFloat(String(rawPrice || '').replace(/[^0-9.]/g, ''));
  const val = Number.isFinite(num) && num > 0 ? num : 800;
  return `From Rs. ${val.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function buildBroomiesSharedStyles(): string {
  return `<style>
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; max-width: 100%; overflow-x: hidden; }
    body.bb-body {
      min-height: 100vh;
      background: linear-gradient(180deg, #77c5ee 0%, #9cd8f6 34%, #bde6fa 70%, #d9f1fc 100%);
      color: #121212;
      font-family: 'Assistant', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      -webkit-font-smoothing: antialiased;
    }
    .bb-header {
      background: linear-gradient(180deg, #98d4f5 0%, #8bcdf1 100%);
      border-bottom: 1px solid rgba(18, 18, 18, 0.1);
    }
    .bb-header-inner {
      max-width: 1360px;
      margin: 0 auto;
      padding: 16px 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 20px;
      flex-wrap: wrap;
    }
    .bb-brand {
      font-size: 19px;
      font-weight: 600;
      color: #121212;
      text-decoration: none;
      letter-spacing: -0.01em;
      white-space: nowrap;
    }
    .bb-nav {
      display: flex;
      align-items: center;
      justify-content: center;
      flex-wrap: wrap;
      gap: 18px;
      font-size: 13.5px;
    }
    .bb-nav a {
      color: #121212;
      text-decoration: none;
      font-weight: 400;
      padding: 3px 0;
      border-bottom: 1px solid transparent;
      white-space: nowrap;
    }
    .bb-nav a:hover, .bb-nav a.bb-active {
      border-bottom-color: #121212;
    }
    .bb-icons {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .bb-icon-link {
      color: #121212;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      position: relative;
      padding: 4px;
    }
    .bb-cart-dot {
      position: absolute;
      right: -2px;
      bottom: 0;
      min-width: 16px;
      height: 16px;
      border-radius: 9999px;
      background: #e11d48;
      color: #ffffff;
      font-size: 10px;
      font-weight: 700;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0 4px;
    }
    .bb-ticker {
      background: rgba(255, 255, 255, 0.25);
      border-top: 1px solid rgba(18, 18, 18, 0.1);
      border-bottom: 1px solid rgba(18, 18, 18, 0.14);
      padding: 10px 20px;
      text-align: center;
      font-size: 12.5px;
      color: #1f2937;
    }
    .bb-ticker a {
      color: #121212;
      text-decoration: none;
      margin: 0 6px;
      font-weight: 500;
    }
    .bb-ticker a:hover { text-decoration: underline; }
    .bb-main {
      max-width: 1360px;
      margin: 0 auto;
      padding: 28px 24px 88px;
    }
    .bb-breadcrumb {
      font-size: 12.5px;
      color: #1f2937;
      margin-bottom: 16px;
    }
    .bb-breadcrumb a {
      color: #121212;
      text-decoration: none;
      font-weight: 500;
    }
    .bb-panel {
      background: rgba(255, 255, 255, 0.9);
      border: 1px solid #2b2b2b;
      border-radius: 26px;
      box-shadow: 0 6px 14px rgba(0, 0, 0, 0.16);
      padding: 26px 28px;
      margin-bottom: 28px;
    }
    .bb-section-title {
      margin: 0 0 18px;
      font-size: clamp(26px, 3vw, 36px);
      font-weight: 400;
      color: #121212;
      letter-spacing: -0.01em;
    }
    .bb-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 16px;
      margin-bottom: 34px;
    }
    .bb-card {
      border-radius: 26px;
      border: 1px solid #2b2b2b;
      background: #efefef;
      box-shadow: 0 6px 14px rgba(0, 0, 0, 0.24);
      overflow: hidden;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      transition: transform 0.18s ease, box-shadow 0.18s ease;
    }
    .bb-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 10px 20px rgba(0, 0, 0, 0.28);
    }
    .bb-card-media {
      width: 100%;
      aspect-ratio: 1 / 1;
      background: #e5dfd7;
      overflow: hidden;
      position: relative;
    }
    .bb-card-media img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
    .bb-card-fallback {
      width: 100%;
      height: 100%;
      background: linear-gradient(135deg, #f3e8e0, #e6d7cb);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 14px;
      text-align: center;
      color: #3f2a21;
      font-size: 13.5px;
      font-weight: 500;
    }
    .bb-card-body {
      background: #efefef;
      padding: 14px 14px 16px;
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      gap: 12px;
    }
    .bb-card-title {
      margin: 0 0 6px;
      font-size: 13.5px;
      line-height: 1.35;
      color: #222222;
      font-weight: 400;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .bb-card-price {
      margin: 0;
      font-size: 15px;
      color: #121212;
      font-weight: 500;
      font-variant-numeric: tabular-nums;
    }
    .bb-btn-outline {
      display: block;
      width: 100%;
      text-align: center;
      padding: 10px 14px;
      border-radius: 9999px;
      border: 1.5px solid #222222;
      background: #ffffff;
      color: #121212;
      font-size: 13px;
      font-weight: 400;
      text-decoration: none;
      box-shadow: 0 2px 5px rgba(0, 0, 0, 0.12);
      transition: background 0.15s ease, color 0.15s ease;
    }
    .bb-btn-outline:hover {
      background: #121212;
      color: #ffffff;
    }
    .bb-btn-solid {
      display: inline-block;
      padding: 11px 22px;
      border-radius: 9999px;
      border: 1.5px solid #121212;
      background: #121212;
      color: #ffffff;
      font-size: 13.5px;
      font-weight: 500;
      text-decoration: none;
      box-shadow: 0 3px 8px rgba(0, 0, 0, 0.16);
    }
    .bb-btn-pill-light {
      display: inline-block;
      padding: 11px 22px;
      border-radius: 9999px;
      border: 1.5px solid #222222;
      background: #ffffff;
      color: #121212;
      font-size: 13.5px;
      font-weight: 400;
      text-decoration: none;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.12);
    }
    .bb-link-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 10px;
      padding: 9px 0;
      color: #121212;
      font-size: 13.5px;
      text-decoration: none;
      border-bottom: 1px solid rgba(18, 18, 18, 0.1);
    }
    .bb-link-row:hover {
      text-decoration: underline;
    }
    .bb-wa-float {
      position: fixed;
      right: 18px;
      bottom: 18px;
      z-index: 60;
      display: inline-flex;
      align-items: center;
      gap: 9px;
      background: #25d366;
      color: #ffffff;
      text-decoration: none;
      font-size: 13.5px;
      font-weight: 600;
      padding: 11px 16px;
      border-radius: 10px;
      box-shadow: 0 6px 18px rgba(0, 0, 0, 0.22);
    }
    .bb-wa-float:hover {
      background: #1ebe5d;
    }
    .bb-footer {
      background: rgba(255, 255, 255, 0.55);
      border-top: 1px solid rgba(18, 18, 18, 0.12);
      padding: 22px 20px 80px;
      text-align: center;
      font-size: 13px;
      color: #1f2937;
    }
    @media (max-width: 720px) {
      .bb-header-inner { padding: 12px 16px; gap: 10px; }
      .bb-brand { order: 1; }
      .bb-icons { order: 2; }
      .bb-nav {
        order: 3;
        width: 100%;
        gap: 14px;
        font-size: 12.5px;
        justify-content: flex-start;
        flex-wrap: nowrap;
        overflow-x: auto;
        -webkit-overflow-scrolling: touch;
        scrollbar-width: none;
        padding-bottom: 2px;
      }
      .bb-nav::-webkit-scrollbar { display: none; }
      .bb-ticker { padding: 7px 12px; font-size: 11.5px; }
      .bb-main { padding: 16px 14px 84px; }
      .bb-panel { padding: 18px 16px; border-radius: 20px; margin-bottom: 20px; }
      .bb-grid { grid-template-columns: repeat(2, 1fr); gap: 12px; }
      .bb-card { border-radius: 20px; }
      .bb-card-body { padding: 11px 10px 13px; }
      .bb-wa-float { right: 12px; bottom: 12px; padding: 9px 13px; font-size: 12.5px; }
    }
  </style>`;
}

function buildBroomiesHeaderHtml(
  siteUrl: string,
  brandName: string,
  activeHubs: GeoZoneHub[],
  cityName: string
): string {
  const cleanSite = escapeHtmlText(siteUrl);
  const collectionUrl = `${cleanSite}/collections/all`;
  const hubTicker = activeHubs
    .slice(0, 4)
    .map(
      (h) =>
        `<a href="/seo/faridabad/${escapeHtmlText(buildTier1Slug(h, cityName))}">${escapeHtmlText(h.name)} (${escapeHtmlText(h.pincode)})</a>`
    )
    .join(' · ');

  return `<header class="bb-header">
    <div class="bb-header-inner">
      <a href="${cleanSite}" class="bb-brand">${escapeHtmlText(brandName)}</a>
      <nav class="bb-nav" aria-label="Main Storefront Navigation">
        <a href="${cleanSite}">Home</a>
        <a href="${collectionUrl}" class="bb-active">Best Seller</a>
        <a href="${collectionUrl}">Theme Cakes</a>
        <a href="${collectionUrl}">Gift Hampers</a>
        <a href="${collectionUrl}">Corporate Snacks Boxes</a>
        <a href="${collectionUrl}">Cookies</a>
        <a href="${collectionUrl}">Cookie Tin</a>
        <a href="${collectionUrl}">Dessert Tubs</a>
        <a href="/seo/faridabad">Faridabad Zones</a>
        <a href="${cleanSite}/pages/contact">Contact</a>
      </nav>
      <div class="bb-icons">
        <a href="${cleanSite}/search" class="bb-icon-link" aria-label="Search cakes on store">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
        </a>
        <a href="${cleanSite}/account" class="bb-icon-link" aria-label="Customer account">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="8" r="4"/><path d="M5 20a7 7 0 0 1 14 0"/></svg>
        </a>
        <a href="${cleanSite}/cart" class="bb-icon-link" aria-label="Shopping bag">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M6 7h12l1 13H5L6 7Z"/><path d="M9 7a3 3 0 0 1 6 0"/></svg>
          <span class="bb-cart-dot">1</span>
        </a>
      </div>
    </div>
    <div class="bb-ticker">
      <span>‹</span>
      <span> 5 km Unified Express Delivery: ${hubTicker} </span>
      <span>›</span>
    </div>
  </header>`;
}

export function renderGeoSeoLandingHtml(
  data: GeoSeoPageData,
  _config: GeoSeoConfig,
  whatsappPhone?: string
): string {
  const activeHubs = data.allActiveHubs;
  const waDigits = String(whatsappPhone || '919266424088').replace(/\D/g, '') || '919266424088';
  const waMsg = encodeURIComponent(
    `Hi ${data.brandName}, I want to order ${data.category?.name || 'Custom & Ready to Eat Cakes'} in ${data.areaLabel} (${data.pincode}).`
  );

  const productsHtml =
    data.matchedProducts.length > 0
      ? data.matchedProducts
          .map((p) => {
            const productUrl = `${data.primaryWebsiteUrl}/products/${encodeURIComponent(p.handle || '')}`;
            const imgBlock = p.imageUrl
              ? `<img src="${escapeHtmlText(p.imageUrl)}" alt="${escapeHtmlText(p.imageAlt || p.title)}" loading="eager" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';" /><div class="bb-card-fallback" style="display:none;">${escapeHtmlText(p.title)}</div>`
              : `<div class="bb-card-fallback">${escapeHtmlText(p.title)}</div>`;
            return `<article class="bb-card">
              <div class="bb-card-media">
                ${imgBlock}
              </div>
              <div class="bb-card-body">
                <div>
                  <h3 class="bb-card-title">${escapeHtmlText(p.title)}</h3>
                  <p class="bb-card-price">${escapeHtmlText(formatInrShopPrice(p.price))}</p>
                </div>
                <a href="${escapeHtmlText(productUrl)}" class="bb-btn-outline">Choose options</a>
              </div>
            </article>`;
          })
          .join('')
      : `<div class="bb-panel" style="grid-column:1/-1;text-align:center;">
          <p style="margin:0 0 14px;font-size:16px;font-weight:500;">Explore Custom &amp; Ready to Eat Cakes at ${escapeHtmlText(data.brandName)}</p>
          <a href="${escapeHtmlText(data.primaryWebsiteUrl)}/collections/all" class="bb-btn-outline" style="max-width:280px;margin:0 auto;">Browse Full Menu on broomiesbakery.in</a>
        </div>`;

  const faqsHtml = data.faqs
    .map(
      (f) => `<div style="border-bottom:1px solid rgba(18,18,18,0.1);padding:14px 0;">
        <h3 style="margin:0 0 6px;font-size:15.5px;font-weight:600;color:#121212;">${escapeHtmlText(f.question)}</h3>
        <p style="margin:0;font-size:14px;line-height:1.6;color:#374151;">${escapeHtmlText(f.answer)}</p>
      </div>`
    )
    .join('');

  const catLinksHtml = data.siblingCategoryLinks
    .map(
      (l) =>
        `<a href="${escapeHtmlText(l.href)}" class="bb-link-row"><span>${escapeHtmlText(l.label)}</span><span>→</span></a>`
    )
    .join('');

  const locLinksHtml = data.nearbyLocalityLinks
    .map(
      (l) =>
        `<a href="${escapeHtmlText(l.href)}" class="bb-link-row"><span>${escapeHtmlText(l.label)}</span><span>→</span></a>`
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtmlText(data.seoTitle)}</title>
  <meta name="description" content="${escapeHtmlText(data.metaDescription)}" />
  <meta name="keywords" content="${escapeHtmlText(data.targetKeywords.join(', '))}" />
  <meta name="robots" content="index, follow, max-image-preview:large" />
  <meta name="geo.region" content="IN-HR" />
  <meta name="geo.placename" content="${escapeHtmlText(data.areaLabel)}" />
  <meta name="geo.position" content="${data.lat};${data.lng}" />
  <meta name="ICBM" content="${data.lat}, ${data.lng}" />
  <link rel="canonical" href="${escapeHtmlText(data.canonicalUrl)}" />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="${escapeHtmlText(data.brandName)}" />
  <meta property="og:title" content="${escapeHtmlText(data.seoTitle)}" />
  <meta property="og:description" content="${escapeHtmlText(data.metaDescription)}" />
  <meta property="og:url" content="${escapeHtmlText(data.pageUrl)}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtmlText(data.seoTitle)}" />
  <meta name="twitter:description" content="${escapeHtmlText(data.metaDescription)}" />
  <script type="application/ld+json">${JSON.stringify(data.jsonLdGraph)}</script>
  ${buildBroomiesSharedStyles()}
</head>
<body class="bb-body">
  ${buildBroomiesHeaderHtml(data.primaryWebsiteUrl, data.brandName, activeHubs, data.cityName)}

  <main class="bb-main">
    <nav aria-label="Breadcrumb" class="bb-breadcrumb">
      <a href="${escapeHtmlText(data.primaryWebsiteUrl)}">${escapeHtmlText(data.brandName)}</a>
      <span> / </span>
      <a href="/seo/faridabad">${escapeHtmlText(data.cityName)}</a>
      <span> / </span>
      <span>${escapeHtmlText(data.areaLabel)}</span>
    </nav>

    <section class="bb-panel">
      <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#0f5132;">
        Same-Day &amp; Scheduled Delivery · ${escapeHtmlText(data.areaLabel)} (${escapeHtmlText(data.pincode)})
      </p>
      <h1 style="margin:0 0 12px;font-size:clamp(24px,3.2vw,36px);line-height:1.18;font-weight:500;color:#121212;letter-spacing:-0.015em;">
        ${escapeHtmlText(data.h1)}
      </h1>
      <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#333333;max-width:74ch;">
        ${escapeHtmlText(data.heroSummary)}
      </p>
      <div style="display:flex;flex-wrap:wrap;gap:12px;align-items:center;">
        <a href="${escapeHtmlText(data.primaryWebsiteUrl)}/collections/all" class="bb-btn-solid">Order Fresh Cakes Now</a>
        <a href="https://wa.me/${waDigits}?text=${waMsg}" target="_blank" rel="noopener noreferrer" class="bb-btn-pill-light">Custom Cake on WhatsApp</a>
      </div>
    </section>

    <section>
      <div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:baseline;gap:8px;margin-bottom:16px;">
        <h2 class="bb-section-title" style="margin-bottom:0;">Best Sellers &amp; Fresh Cakes – ${escapeHtmlText(data.areaLabel)}</h2>
        <span style="font-size:13px;color:#1f2937;">100% Eggless · Freshly Baked Daily</span>
      </div>
      <div class="bb-grid">
        ${productsHtml}
      </div>
      <div style="text-align:center;margin:0 0 32px;">
        <a href="${escapeHtmlText(data.primaryWebsiteUrl)}/collections/all" class="bb-btn-pill-light">Browse All Cakes &amp; Desserts →</a>
      </div>
    </section>

    <section class="bb-panel">
      <h2 style="margin:0 0 6px;font-size:20px;font-weight:500;color:#121212;">Frequently Asked Questions – ${escapeHtmlText(data.areaLabel)}</h2>
      ${faqsHtml}
    </section>

    <section style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:18px;">
      <div class="bb-panel" style="margin-bottom:0;">
        <h3 style="margin:0 0 10px;font-size:17px;font-weight:500;color:#121212;">Explore More Cake Categories</h3>
        ${catLinksHtml}
      </div>
      <div class="bb-panel" style="margin-bottom:0;">
        <h3 style="margin:0 0 10px;font-size:17px;font-weight:500;color:#121212;">Nearby Faridabad Areas</h3>
        ${locLinksHtml}
      </div>
    </section>
  </main>

  <footer class="bb-footer">
    ${escapeHtmlText(data.brandName)} · Serving ${escapeHtmlText(data.cityName)} ·
    <a href="${escapeHtmlText(data.primaryWebsiteUrl)}" style="color:#121212;text-decoration:none;font-weight:600;">${escapeHtmlText(data.primaryWebsiteUrl)}</a>
    · <a href="/sitemap.xml" style="color:#1f2937;text-decoration:none;">XML Sitemap</a>
  </footer>

  <a href="https://wa.me/${waDigits}?text=${waMsg}" target="_blank" rel="noopener noreferrer" class="bb-wa-float">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12.03 2a9.94 9.94 0 0 0-8.49 15.13L2.2 21.8l4.8-1.26A9.95 9.95 0 1 0 12.03 2Zm5.8 14.12c-.25.7-1.42 1.34-1.97 1.41-.51.07-1.15.1-1.85-.12-.43-.14-.98-.32-1.69-.63-2.98-1.29-4.92-4.31-5.07-4.51-.15-.2-1.21-1.61-1.21-3.07 0-1.46.76-2.18 1.03-2.48.27-.3.6-.37.8-.37h.58c.18 0 .44-.07.68.52.25.61.85 2.08.92 2.23.08.15.13.33.03.53-.1.2-.15.33-.3.5-.15.18-.32.4-.45.53-.15.15-.3.31-.13.61.18.3.78 1.29 1.68 2.09 1.15 1.03 2.13 1.35 2.43 1.5.3.15.48.13.66-.08.18-.2.75-.87.95-1.17.2-.3.4-.25.68-.15.28.1 1.75.83 2.05.98.3.15.5.22.58.35.07.12.07.72-.18 1.42Z"/></svg>
    <span>Chat on WhatsApp</span>
  </a>
</body>
</html>`;
}

export function renderGeoSeoDirectoryHtml(
  config: GeoSeoConfig,
  hostOrigin: string,
  whatsappPhone?: string
): string {
  const cleanHost = (hostOrigin || 'https://faridabad.broomiesbakery.in').replace(/\/+$/, '');
  const siteUrl = normalizeWebsiteBaseUrl(config.primaryWebsiteUrl);
  const stats = getGeoSeoStats(config);
  const activeHubs = (config.hubs || []).filter((h) => h.enabled);
  const covered = getCoveredLocalities(config);
  const cats = (config.categories || []).filter((c) => c.enabled);
  const waDigits = String(whatsappPhone || '919266424088').replace(/\D/g, '') || '919266424088';

  const hubCards = activeHubs
    .map(
      (h) => `<a href="/seo/faridabad/${escapeHtmlText(buildTier1Slug(h, config.cityName))}" class="bb-card" style="text-decoration:none;color:#121212;padding:18px;background:#ffffff;">
        <div>
          <div style="font-weight:500;font-size:18px;color:#121212;">${escapeHtmlText(h.name)} (${h.radiusKm} km Zone)</div>
          <div style="font-size:13px;color:#4b5563;margin:6px 0 14px;">PIN ${escapeHtmlText(h.pincode)} · ${covered.filter((c) => c.matchingHubIds.includes(h.id)).length} Sectors Covered</div>
        </div>
        <span class="bb-btn-outline">Explore ${escapeHtmlText(h.name)} Cakes</span>
      </a>`
    )
    .join('');

  const localityGrid = covered
    .map((cov) => {
      const customCat = cats[0];
      const href = customCat ? `/seo/faridabad/${buildTier2Slug(customCat, cov.locality, config.cityName)}` : '/seo/faridabad';
      return `<a href="${escapeHtmlText(href)}" style="display:flex;justify-content:space-between;align-items:center;border:1px solid #2b2b2b;border-radius:16px;background:#ffffff;padding:12px 15px;text-decoration:none;color:#121212;font-size:13.5px;box-shadow:0 3px 8px rgba(0,0,0,0.12);">
        <span style="font-weight:500;">${escapeHtmlText(cov.locality.name)}</span>
        <span style="color:#4b5563;font-size:12px;">${cov.distanceKm.toFixed(1)} km · ${escapeHtmlText(cov.locality.pincode)}</span>
      </a>`;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtmlText(config.brandName)} – Faridabad Cake Delivery Zones (Sec 31, 88, 35, 42)</title>
  <meta name="description" content="Explore ${stats.totalPages.toLocaleString()} cake delivery pages for ${escapeHtmlText(config.brandName)} across Sector 31, 88, 35 & 42 (5 km unified zone) in Faridabad." />
  <link rel="canonical" href="${escapeHtmlText(`${cleanHost}/seo/faridabad`)}" />
  <script type="application/ld+json">${JSON.stringify(buildBakeryStorefrontSchema(config, cleanHost))}</script>
  ${buildBroomiesSharedStyles()}
</head>
<body class="bb-body">
  ${buildBroomiesHeaderHtml(siteUrl, config.brandName, activeHubs, config.cityName)}

  <main class="bb-main">
    <section class="bb-panel">
      <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#0f5132;">Faridabad Express Delivery · ${stats.coveredLocalitiesCount} Neighbourhoods Served</p>
      <h1 class="bb-section-title" style="margin-bottom:10px;">${escapeHtmlText(config.brandName)} – Faridabad Cake Delivery Areas</h1>
      <p style="margin:0 0 18px;font-size:15px;color:#333333;">Fresh 100% eggless custom &amp; ready-to-eat cakes ordered online at <a href="${escapeHtmlText(siteUrl)}" style="color:#121212;font-weight:600;">${escapeHtmlText(siteUrl.replace(/^https?:\/\//, ''))}</a></p>
      <a href="${escapeHtmlText(siteUrl)}/collections/all" class="bb-btn-solid">Order Cakes on Broomies Bakery</a>
    </section>

    <h2 class="bb-section-title">Faridabad Kitchen Areas</h2>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:16px;margin-bottom:32px;">
      ${hubCards}
    </div>

    <h2 class="bb-section-title">Sectors &amp; Colonies We Deliver To</h2>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:12px;">
      ${localityGrid}
    </div>
  </main>

  <footer class="bb-footer">
    ${escapeHtmlText(config.brandName)} · Serving ${escapeHtmlText(config.cityName)} ·
    <a href="${escapeHtmlText(siteUrl)}" style="color:#121212;text-decoration:none;font-weight:600;">${escapeHtmlText(siteUrl)}</a>
    · <a href="/sitemap.xml" style="color:#1f2937;text-decoration:none;">XML Sitemap</a>
  </footer>

  <a href="https://wa.me/${waDigits}?text=${encodeURIComponent(`Hi ${config.brandName}, I want to order a cake in Faridabad!`)}" target="_blank" rel="noopener noreferrer" class="bb-wa-float">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12.03 2a9.94 9.94 0 0 0-8.49 15.13L2.2 21.8l4.8-1.26A9.95 9.95 0 1 0 12.03 2Zm5.8 14.12c-.25.7-1.42 1.34-1.97 1.41-.51.07-1.15.1-1.85-.12-.43-.14-.98-.32-1.69-.63-2.98-1.29-4.92-4.31-5.07-4.51-.15-.2-1.21-1.61-1.21-3.07 0-1.46.76-2.18 1.03-2.48.27-.3.6-.37.8-.37h.58c.18 0 .44-.07.68.52.25.61.85 2.08.92 2.23.08.15.13.33.03.53-.1.2-.15.33-.3.5-.15.18-.32.4-.45.53-.15.15-.3.31-.13.61.18.3.78 1.29 1.68 2.09 1.15 1.03 2.13 1.35 2.43 1.5.3.15.48.13.66-.08.18-.2.75-.87.95-1.17.2-.3.4-.25.68-.15.28.1 1.75.83 2.05.98.3.15.5.22.58.35.07.12.07.72-.18 1.42Z"/></svg>
    <span>Chat on WhatsApp</span>
  </a>
</body>
</html>`;
}

function buildShopifyProxyScopedStyles(): string {
  return `<style>
    .bb-proxy-wrap {
      max-width: 1320px;
      margin: 0 auto;
      padding: 20px 18px 56px;
      color: #121212;
      box-sizing: border-box;
    }
    .bb-proxy-wrap *, .bb-proxy-wrap *::before, .bb-proxy-wrap *::after {
      box-sizing: border-box;
    }
    .bb-proxy-breadcrumb {
      font-size: 13px;
      color: #1f2937;
      margin-bottom: 14px;
    }
    .bb-proxy-breadcrumb a {
      color: #121212;
      text-decoration: none;
      font-weight: 500;
    }
    .bb-proxy-breadcrumb a:hover {
      text-decoration: underline;
    }
    .bb-proxy-panel {
      background: rgba(255, 255, 255, 0.92);
      border: 1px solid #2b2b2b;
      border-radius: 26px;
      box-shadow: 0 6px 14px rgba(0, 0, 0, 0.16);
      padding: 24px 26px;
      margin-bottom: 26px;
    }
    .bb-proxy-h1 {
      margin: 0 0 12px;
      font-size: clamp(24px, 3vw, 36px);
      line-height: 1.2;
      font-weight: 500;
      color: #121212;
    }
    .bb-proxy-section-title {
      margin: 0 0 16px;
      font-size: clamp(22px, 2.8vw, 32px);
      font-weight: 400;
      color: #121212;
    }
    .bb-proxy-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(205px, 1fr));
      gap: 16px;
      margin-bottom: 30px;
    }
    .bb-proxy-card {
      border-radius: 26px;
      border: 1px solid #2b2b2b;
      background: #efefef;
      box-shadow: 0 6px 14px rgba(0, 0, 0, 0.22);
      overflow: hidden;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .bb-proxy-media {
      width: 100%;
      aspect-ratio: 1 / 1;
      background: #e5dfd7;
      overflow: hidden;
    }
    .bb-proxy-media img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
    .bb-proxy-card-fallback {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 14px;
      text-align: center;
      font-size: 13.5px;
      font-weight: 500;
      color: #3f2a21;
      background: linear-gradient(135deg, #f3e8e0, #e6d7cb);
    }
    .bb-proxy-card-body {
      padding: 14px 14px 16px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      gap: 12px;
      flex: 1;
    }
    .bb-proxy-card-title {
      margin: 0 0 6px;
      font-size: 14px;
      line-height: 1.35;
      color: #121212;
      font-weight: 400;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .bb-proxy-card-price {
      margin: 0;
      font-size: 15px;
      font-weight: 500;
      color: #121212;
      font-variant-numeric: tabular-nums;
    }
    .bb-proxy-btn-outline {
      display: block;
      width: 100%;
      text-align: center;
      padding: 10px 14px;
      border-radius: 9999px;
      border: 1.5px solid #222222;
      background: #ffffff;
      color: #121212;
      font-size: 13px;
      text-decoration: none;
      box-shadow: 0 2px 5px rgba(0, 0, 0, 0.12);
    }
    .bb-proxy-btn-outline:hover {
      background: #121212;
      color: #ffffff;
    }
    .bb-proxy-btn-solid {
      display: inline-block;
      padding: 11px 22px;
      border-radius: 9999px;
      border: 1.5px solid #121212;
      background: #121212;
      color: #ffffff;
      font-size: 13.5px;
      font-weight: 500;
      text-decoration: none;
    }
    .bb-proxy-btn-light {
      display: inline-block;
      padding: 11px 22px;
      border-radius: 9999px;
      border: 1.5px solid #222222;
      background: #ffffff;
      color: #121212;
      font-size: 13.5px;
      text-decoration: none;
    }
    .bb-proxy-link-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 10px;
      padding: 9px 0;
      color: #121212;
      font-size: 13.5px;
      text-decoration: none;
      border-bottom: 1px solid rgba(18, 18, 18, 0.1);
    }
    .bb-proxy-link-row:hover { text-decoration: underline; }
    @media (max-width: 720px) {
      .bb-proxy-wrap { padding: 14px 12px 44px; }
      .bb-proxy-panel { padding: 18px 16px; border-radius: 20px; }
      .bb-proxy-grid { grid-template-columns: repeat(2, 1fr); gap: 12px; }
      .bb-proxy-card { border-radius: 20px; }
      .bb-proxy-card-body { padding: 11px 10px 13px; }
    }
  </style>`;
}

/**
 * Renders an `application/liquid` body fragment served to Shopify App Proxy
 * so Shopify renders the landing page directly inside `broomiesbakery.in`'s own Dawn theme.
 */
export function renderGeoSeoShopifyLiquidFragment(
  data: GeoSeoPageData,
  config: GeoSeoConfig,
  whatsappPhone?: string
): string {
  const proxyPrefix = normalizeShopifyProxyPrefix(config.shopifyProxyPrefix);
  const waDigits = String(whatsappPhone || '919266424088').replace(/\D/g, '') || '919266424088';
  const waMsg = encodeURIComponent(
    `Hi ${data.brandName}, I want to order ${data.category?.name || 'Custom & Ready to Eat Cakes'} in ${data.areaLabel} (${data.pincode}).`
  );

  const productsHtml =
    data.matchedProducts.length > 0
      ? data.matchedProducts
          .map((p) => {
            const productPath = `/products/${encodeURIComponent(p.handle || '')}`;
            const imgBlock = p.imageUrl
              ? `<img src="${escapeHtmlText(p.imageUrl)}" alt="${escapeHtmlText(p.imageAlt || p.title)}" loading="eager" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';" /><div class="bb-proxy-card-fallback" style="display:none;">${escapeHtmlText(p.title)}</div>`
              : `<div class="bb-proxy-card-fallback">${escapeHtmlText(p.title)}</div>`;
            return `<article class="bb-proxy-card">
              <div class="bb-proxy-media">${imgBlock}</div>
              <div class="bb-proxy-card-body">
                <div>
                  <h3 class="bb-proxy-card-title">${escapeHtmlText(p.title)}</h3>
                  <p class="bb-proxy-card-price">${escapeHtmlText(formatInrShopPrice(p.price))}</p>
                </div>
                <a href="${escapeHtmlText(productPath)}" class="bb-proxy-btn-outline">Choose options</a>
              </div>
            </article>`;
          })
          .join('')
      : `<div class="bb-proxy-panel" style="grid-column:1/-1;text-align:center;">
          <p style="margin:0 0 14px;font-size:16px;font-weight:500;">Explore Custom &amp; Ready to Eat Cakes at ${escapeHtmlText(data.brandName)}</p>
          <a href="/collections/all" class="bb-proxy-btn-outline" style="max-width:260px;margin:0 auto;">Shop All Fresh Cakes</a>
        </div>`;

  const faqsHtml = data.faqs
    .map(
      (f) => `<div style="border-bottom:1px solid rgba(18,18,18,0.1);padding:13px 0;">
        <h3 style="margin:0 0 6px;font-size:15.5px;font-weight:600;color:#121212;">${escapeHtmlText(f.question)}</h3>
        <p style="margin:0;font-size:14px;line-height:1.6;color:#374151;">${escapeHtmlText(f.answer)}</p>
      </div>`
    )
    .join('');

  const catLinksHtml = data.siblingCategoryLinks
    .map(
      (l) =>
        `<a href="${escapeHtmlText(l.href)}" class="bb-proxy-link-row"><span>${escapeHtmlText(l.label)}</span><span>→</span></a>`
    )
    .join('');

  const locLinksHtml = data.nearbyLocalityLinks
    .map(
      (l) =>
        `<a href="${escapeHtmlText(l.href)}" class="bb-proxy-link-row"><span>${escapeHtmlText(l.label)}</span><span>→</span></a>`
    )
    .join('');

  return `${buildShopifyProxyScopedStyles()}
<script type="application/ld+json">${JSON.stringify(data.jsonLdGraph)}</script>
<script>
  try {
    document.title = ${JSON.stringify(data.seoTitle)};
    var metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute('content', ${JSON.stringify(data.metaDescription)});
    var canLink = document.querySelector('link[rel="canonical"]');
    if (canLink) canLink.setAttribute('href', ${JSON.stringify(data.canonicalUrl)});
  } catch (e) {}
</script>
<div class="bb-proxy-wrap" data-seo-slug="${escapeHtmlText(data.slug)}">
  <nav aria-label="Breadcrumb" class="bb-proxy-breadcrumb">
    <a href="/">${escapeHtmlText(data.brandName)}</a>
    <span> / </span>
    <a href="${escapeHtmlText(proxyPrefix)}">${escapeHtmlText(data.cityName)}</a>
    <span> / </span>
    <span>${escapeHtmlText(data.areaLabel)}</span>
  </nav>

  <section class="bb-proxy-panel">
    <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#0f5132;">
      Same-Day &amp; Scheduled Delivery · ${escapeHtmlText(data.areaLabel)} (${escapeHtmlText(data.pincode)})
    </p>
    <h1 class="bb-proxy-h1">${escapeHtmlText(data.h1)}</h1>
    <p style="margin:0 0 18px;font-size:15px;line-height:1.6;color:#333333;max-width:74ch;">
      ${escapeHtmlText(data.heroSummary)}
    </p>
    <div style="display:flex;flex-wrap:wrap;gap:12px;align-items:center;">
      <a href="/collections/all" class="bb-proxy-btn-solid">Order Fresh Cakes Now</a>
      <a href="https://wa.me/${waDigits}?text=${waMsg}" target="_blank" rel="noopener noreferrer" class="bb-proxy-btn-light">Custom Cake on WhatsApp</a>
    </div>
  </section>

  <section>
    <div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:baseline;gap:8px;margin-bottom:14px;">
      <h2 class="bb-proxy-section-title" style="margin-bottom:0;">Best Sellers &amp; Fresh Cakes – ${escapeHtmlText(data.areaLabel)}</h2>
      <span style="font-size:13px;color:#1f2937;">100% Eggless · Freshly Baked Daily</span>
    </div>
    <div class="bb-proxy-grid">${productsHtml}</div>
    <div style="text-align:center;margin:0 0 30px;">
      <a href="/collections/all" class="bb-proxy-btn-light">Browse All Cakes &amp; Desserts →</a>
    </div>
  </section>

  <section class="bb-proxy-panel">
    <h2 style="margin:0 0 6px;font-size:20px;font-weight:500;color:#121212;">Frequently Asked Questions – ${escapeHtmlText(data.areaLabel)}</h2>
    ${faqsHtml}
  </section>

  <section style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:18px;">
    <div class="bb-proxy-panel" style="margin-bottom:0;">
      <h3 style="margin:0 0 10px;font-size:17px;font-weight:500;color:#121212;">Explore More Cake Categories</h3>
      ${catLinksHtml}
    </div>
    <div class="bb-proxy-panel" style="margin-bottom:0;">
      <h3 style="margin:0 0 10px;font-size:17px;font-weight:500;color:#121212;">Nearby Faridabad Areas</h3>
      ${locLinksHtml}
    </div>
  </section>
</div>`;
}

/**
 * Renders the Master Directory landing index at `broomiesbakery.in/apps/cakes` inside Shopify theme.
 */
export function renderGeoSeoDirectoryLiquidFragment(
  config: GeoSeoConfig,
  whatsappPhone?: string
): string {
  const siteUrl = normalizeWebsiteBaseUrl(config.primaryWebsiteUrl);
  const proxyPrefix = normalizeShopifyProxyPrefix(config.shopifyProxyPrefix);
  const stats = getGeoSeoStats(config);
  const activeHubs = (config.hubs || []).filter((h) => h.enabled);
  const covered = getCoveredLocalities(config);
  const cats = (config.categories || []).filter((c) => c.enabled);
  const waDigits = String(whatsappPhone || '919266424088').replace(/\D/g, '') || '919266424088';

  const hubCards = activeHubs
    .map(
      (h) => `<a href="${escapeHtmlText(`${proxyPrefix}/${buildTier1Slug(h, config.cityName)}`)}" class="bb-proxy-card" style="text-decoration:none;color:#121212;padding:18px;background:#ffffff;">
        <div>
          <div style="font-weight:500;font-size:18px;color:#121212;">${escapeHtmlText(h.name)} (${h.radiusKm} km Zone)</div>
          <div style="font-size:13px;color:#4b5563;margin:6px 0 14px;">PIN ${escapeHtmlText(h.pincode)} · ${covered.filter((c) => c.matchingHubIds.includes(h.id)).length} Sectors Covered</div>
        </div>
        <span class="bb-proxy-btn-outline">Explore ${escapeHtmlText(h.name)} Cakes</span>
      </a>`
    )
    .join('');

  const localityGrid = covered
    .map((cov) => {
      const customCat = cats[0];
      const href = customCat
        ? `${proxyPrefix}/${buildTier2Slug(customCat, cov.locality, config.cityName)}`
        : proxyPrefix;
      return `<a href="${escapeHtmlText(href)}" style="display:flex;justify-content:space-between;align-items:center;border:1px solid #2b2b2b;border-radius:16px;background:#ffffff;padding:12px 15px;text-decoration:none;color:#121212;font-size:13.5px;box-shadow:0 3px 8px rgba(0,0,0,0.12);">
        <span style="font-weight:500;">${escapeHtmlText(cov.locality.name)}</span>
        <span style="color:#4b5563;font-size:12px;">PIN ${escapeHtmlText(cov.locality.pincode)}</span>
      </a>`;
    })
    .join('');

  const seoTitle = `${config.brandName} – Faridabad Cake Delivery Zones (Sec 31, 88, 35, 42)`;
  const seoDesc = `Order fresh 100% eggless custom cakes & ready to eat cakes from ${config.brandName} across Sector 31, 88, 35 & 42 in Faridabad.`;

  return `${buildShopifyProxyScopedStyles()}
<script type="application/ld+json">${JSON.stringify(buildBakeryStorefrontSchema(config, siteUrl))}</script>
<script>
  try {
    document.title = ${JSON.stringify(seoTitle)};
    var metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute('content', ${JSON.stringify(seoDesc)});
    var canLink = document.querySelector('link[rel="canonical"]');
    if (canLink) canLink.setAttribute('href', ${JSON.stringify(`${siteUrl}${proxyPrefix}`)});
  } catch (e) {}
</script>
<div class="bb-proxy-wrap">
  <section class="bb-proxy-panel">
    <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#0f5132;">Faridabad Express Delivery · ${stats.coveredLocalitiesCount} Neighbourhoods Served</p>
    <h1 class="bb-proxy-h1">${escapeHtmlText(config.brandName)} – Faridabad Cake Delivery Areas</h1>
    <p style="margin:0 0 18px;font-size:15px;color:#333333;">Fresh 100% eggless custom cakes &amp; ready-to-eat cakes from ${escapeHtmlText(siteUrl.replace(/^https?:\/\//, ''))}</p>
    <div style="display:flex;flex-wrap:wrap;gap:12px;">
      <a href="/collections/all" class="bb-proxy-btn-solid">Order Cakes Now</a>
      <a href="https://wa.me/${waDigits}?text=${encodeURIComponent(`Hi ${config.brandName}, I want to order a custom cake in Faridabad!`)}" target="_blank" rel="noopener noreferrer" class="bb-proxy-btn-light">Custom Order on WhatsApp</a>
    </div>
  </section>

  <h2 class="bb-proxy-section-title">Faridabad Kitchen Areas</h2>
  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:16px;margin-bottom:32px;">
    ${hubCards}
  </div>

  <h2 class="bb-proxy-section-title">Sectors &amp; Colonies We Deliver To</h2>
  <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:12px;">
    ${localityGrid}
  </div>
</div>`;
}


