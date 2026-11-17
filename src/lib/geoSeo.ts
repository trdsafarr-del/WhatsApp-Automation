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

export function matchCatalogProductsForCategory(
  products: ProductCatalogItem[],
  category: GeoCakeCategory | null,
  pincode?: string
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
  if (!category || !category.matchTerms || category.matchTerms.length === 0) {
    return pool.slice(0, 8);
  }

  const terms = category.matchTerms.map((t) => t.toLowerCase().trim()).filter(Boolean);
  const scored = pool.map((p) => {
    const hay = `${p.title} ${p.productType} ${p.tags} ${p.seoTitle}`.toLowerCase();
    let hits = 0;
    for (const term of terms) {
      if (hay.includes(term)) hits += 1;
    }
    return { product: p, hits };
  });

  scored.sort((a, b) => b.hits - a.hits);
  const matched = scored.filter((s) => s.hits > 0).map((s) => s.product);
  if (matched.length >= 4) return matched.slice(0, 8);
  return scored.slice(0, 8).map((s) => s.product);
}

export interface GeoSeoPageData {
  slug: string;
  tier: 1 | 2 | 3;
  pageUrl: string;
  canonicalUrl: string;
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
  hostOrigin: string
): GeoSeoPageData {
  const cleanHost = (hostOrigin || 'https://whatsa86.vercel.app').replace(/\/+$/, '');
  const siteUrl = normalizeWebsiteBaseUrl(config.primaryWebsiteUrl);
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
      ? `${brand} ${ref.hub.name} ${city} (${ref.hub.radiusKm} km Radius) – Custom & Ready to Eat Cakes`
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
      ? `Order fresh custom cakes & ready to eat cakes in ${ref.hub.name} ${city} within ${ref.hub.radiusKm} km radius (${pincode}). Same-day & midnight delivery from ${siteUrl.replace(/^https?:\/\//, '')}.`
      : `Buy freshly baked ${catName.toLowerCase()} in ${areaName}, ${city} (${pincode}) — ${distanceKm.toFixed(1)} km from ${ref.hub.name} Hub. ${modLabel} at ${brand}.`;
  const metaDescription = clampSeoString(rawDesc, 160);

  const pageUrl = `${cleanHost}/seo/faridabad/${ref.slug}`;
  const matchedProducts = matchCatalogProductsForCategory(products, ref.category, pincode);

  const targetKeywords = [
    `${catName.toLowerCase()} in ${areaName.toLowerCase()} ${city.toLowerCase()}`,
    `custom cakes ${areaName.toLowerCase()}`,
    `ready to eat cakes ${areaName.toLowerCase()}`,
    `cake bakery near ${areaName.toLowerCase()} ${pincode}`,
    `${brand.toLowerCase()} ${ref.hub.name.toLowerCase()} ${city.toLowerCase()}`,
    ...(ref.category?.keywords || []).map((k) => `${k} ${areaName.toLowerCase()}`),
  ].slice(0, 10);

  const faqs = [
    {
      question: `How fast does ${brand} deliver ${catName.toLowerCase()} to ${areaName}, ${city} (${pincode})?`,
      answer: `${areaName} is just ${distanceKm.toFixed(1)} km from our ${ref.hub.name} Kitchen Hub (${ref.hub.radiusKm} km express radius). Ready to eat cakes dispatch same-day, and custom photo/theme cakes can be scheduled for fixed afternoon or midnight slots.`,
    },
    {
      question: `Are custom cakes & ready to eat cakes available eggless in ${areaName}?`,
      answer: `Yes! All custom cakes, truffle cakes, butterscotch cakes, bento cakes, and ready to eat desserts crafted at ${brand} are available in 100% pure eggless options for delivery in ${areaName} (${pincode}) and nearby ${activeHubs.map((h) => h.name).join(', ')} sectors.`,
    },
    {
      question: `Where can I order ${catName.toLowerCase()} online for ${areaName} delivery?`,
      answer: `You can browse live prices and order directly on ${siteUrl} with instant pincode availability check for ${pincode}.`,
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
          href: `/seo/faridabad/${buildTier2Slug(c, currentLoc, city)}`,
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
          href: `/seo/faridabad/${buildTier2Slug(targetCat, cov.locality, city)}`,
          distanceKm: dist,
        }))
    : [];

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
          { '@type': 'ListItem', position: 2, name: `${city} Cake Zones`, item: `${cleanHost}/seo/faridabad` },
          {
            '@type': 'ListItem',
            position: 3,
            name: `${ref.hub.name} Zone`,
            item: `${cleanHost}/seo/faridabad/${buildTier1Slug(ref.hub, city)}`,
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
    primaryWebsiteUrl: siteUrl,
    brandName: brand,
    cityName: city,
    stateName: state,
    seoTitle,
    metaDescription,
    h1,
    heroSummary: `Serving freshly handcrafted ${catName.toLowerCase()} across ${areaName} (${pincode}) — ${distanceKm.toFixed(1)} km from our ${ref.hub.name} hub as part of ${brand}'s unified ${activeHubs.map((h) => h.name).join(' · ')} 5 km delivery zone.`,
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

export function buildSitemapIndexXml(hostOrigin: string, totalPages: number): string {
  const cleanHost = (hostOrigin || 'https://whatsa86.vercel.app').replace(/\/+$/, '');
  const shardCount = Math.max(1, Math.ceil(totalPages / SITEMAP_URLS_PER_SHARD));
  const lastMod = new Date().toISOString().split('T')[0];

  const entries: string[] = [];
  for (let s = 1; s <= shardCount; s += 1) {
    entries.push(
      `  <sitemap>\n    <loc>${escapeXml(`${cleanHost}/sitemap-geo/${s}.xml`)}</loc>\n    <lastmod>${lastMod}</lastmod>\n  </sitemap>`
    );
  }

  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join('\n')}\n</sitemapindex>\n`;
}

export function buildGeoSitemapShardXml(
  hostOrigin: string,
  config: GeoSeoConfig,
  shardNumber: number
): string {
  const cleanHost = (hostOrigin || 'https://whatsa86.vercel.app').replace(/\/+$/, '');
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
      `  <url>\n    <loc>${escapeXml(`${cleanHost}/seo/faridabad`)}</loc>\n    <lastmod>${lastMod}</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>1.0</priority>\n  </url>`
    );
  }

  for (let i = start; i < end; i += 1) {
    const ref = getGeoSeoRefAtIndex(config, i, precomputed);
    if (!ref) continue;
    const priority = ref.tier === 1 ? '0.9' : ref.tier === 2 ? '0.8' : '0.7';
    urls.push(
      `  <url>\n    <loc>${escapeXml(`${cleanHost}/seo/faridabad/${ref.slug}`)}</loc>\n    <lastmod>${lastMod}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>${priority}</priority>\n  </url>`
    );
  }

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
}

export function renderGeoSeoLandingHtml(
  data: GeoSeoPageData,
  config: GeoSeoConfig
): string {
  const activeHubs = data.allActiveHubs;
  const productsHtml =
    data.matchedProducts.length > 0
      ? data.matchedProducts
          .map((p) => {
            const productUrl = `${data.primaryWebsiteUrl}/products/${encodeURIComponent(p.handle || '')}`;
            const imgBlock = p.imageUrl
              ? `<img src="${escapeHtmlText(p.imageUrl)}" alt="${escapeHtmlText(p.imageAlt || p.title)}" loading="lazy" style="width:100%;height:190px;object-fit:cover;border-radius:10px;display:block;background:#f3ede4;" />`
              : `<div style="width:100%;height:190px;border-radius:10px;background:linear-gradient(135deg,#f3e8dd,#ead5c3);display:flex;align-items:center;justify-content:center;color:#7c2d12;font-weight:700;font-size:14px;padding:12px;text-align:center;">${escapeHtmlText(p.title)}</div>`;
            return `<article style="border:1px solid #e7dfd4;border-radius:14px;background:#ffffff;padding:14px;display:flex;flex-direction:column;justify-content:space-between;gap:12px;">
              <div>
                ${imgBlock}
                <h3 style="margin:12px 0 4px;font-size:16px;line-height:1.35;color:#1f1612;font-weight:700;">${escapeHtmlText(p.title)}</h3>
                <p style="margin:0;font-size:12.5px;color:#6b5b52;">${escapeHtmlText(p.productType || 'Fresh Bakery Cake')} · PIN ${escapeHtmlText(data.pincode)} Express</p>
              </div>
              <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding-top:8px;border-top:1px solid #f1ece4;">
                <span style="font-size:16px;font-weight:700;color:#7c2d12;">${escapeHtmlText(p.currency || 'INR')} ${escapeHtmlText(p.price || '599')}</span>
                <a href="${escapeHtmlText(productUrl)}" style="display:inline-block;padding:8px 14px;border-radius:8px;background:#7c2d12;color:#ffffff;font-size:12.5px;font-weight:600;text-decoration:none;white-space:nowrap;">Order Cake</a>
              </div>
            </article>`;
          })
          .join('')
      : `<div style="grid-column:1/-1;border:1px dashed #d6c8b8;border-radius:14px;padding:24px;text-align:center;background:#fff;">
          <p style="margin:0 0 10px;font-size:15px;font-weight:600;color:#1f1612;">Explore Custom & Ready to Eat Cakes at ${escapeHtmlText(data.brandName)}</p>
          <a href="${escapeHtmlText(data.primaryWebsiteUrl)}/collections/all" style="display:inline-block;padding:10px 18px;border-radius:8px;background:#7c2d12;color:#fff;font-weight:600;text-decoration:none;">Browse Full Menu on broomiesbakery.in</a>
        </div>`;

  const faqsHtml = data.faqs
    .map(
      (f) => `<div style="border-bottom:1px solid #e7dfd4;padding:14px 0;">
        <h3 style="margin:0 0 6px;font-size:15px;font-weight:700;color:#1f1612;">${escapeHtmlText(f.question)}</h3>
        <p style="margin:0;font-size:14px;line-height:1.6;color:#4f433d;">${escapeHtmlText(f.answer)}</p>
      </div>`
    )
    .join('');

  const catLinksHtml = data.siblingCategoryLinks
    .map(
      (l) =>
        `<a href="${escapeHtmlText(l.href)}" style="display:block;padding:8px 0;color:#7c2d12;font-size:13.5px;text-decoration:none;border-bottom:1px solid #f1ece4;">${escapeHtmlText(l.label)} →</a>`
    )
    .join('');

  const locLinksHtml = data.nearbyLocalityLinks
    .map(
      (l) =>
        `<a href="${escapeHtmlText(l.href)}" style="display:flex;justify-content:space-between;gap:8px;padding:8px 0;color:#7c2d12;font-size:13.5px;text-decoration:none;border-bottom:1px solid #f1ece4;"><span>${escapeHtmlText(l.label)}</span><span style="color:#6b5b52;font-size:12px;">${l.distanceKm.toFixed(1)} km</span></a>`
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
</head>
<body style="margin:0;background:#fbf8f3;color:#1f1612;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <header style="background:#ffffff;border-bottom:1px solid #e7dfd4;padding:14px 20px;">
    <div style="max-width:1120px;margin:0 auto;display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:16px;">
      <a href="${escapeHtmlText(data.primaryWebsiteUrl)}" style="font-size:20px;font-weight:800;color:#7c2d12;text-decoration:none;letter-spacing:-0.02em;">${escapeHtmlText(data.brandName)}</a>
      <nav style="display:flex;flex-wrap:wrap;gap:18px;font-size:13.5px;font-weight:600;">
        <a href="${escapeHtmlText(data.primaryWebsiteUrl)}/collections/all" style="color:#4f433d;text-decoration:none;">All Cakes</a>
        <a href="/seo/faridabad" style="color:#4f433d;text-decoration:none;">Faridabad Zones</a>
        ${activeHubs
          .slice(0, 4)
          .map(
            (h) =>
              `<a href="/seo/faridabad/${escapeHtmlText(buildTier1Slug(h, data.cityName))}" style="color:#4f433d;text-decoration:none;">${escapeHtmlText(h.name)}</a>`
          )
          .join('')}
      </nav>
      <a href="${escapeHtmlText(data.primaryWebsiteUrl)}" style="padding:9px 16px;border-radius:8px;background:#7c2d12;color:#ffffff;font-size:13px;font-weight:600;text-decoration:none;">Order on Store</a>
    </div>
  </header>

  <main style="max-width:1120px;margin:0 auto;padding:28px 20px 56px;">
    <nav aria-label="Breadcrumb" style="font-size:12.5px;color:#6b5b52;margin-bottom:14px;">
      <a href="${escapeHtmlText(data.primaryWebsiteUrl)}" style="color:#7c2d12;text-decoration:none;">${escapeHtmlText(data.brandName)}</a>
      <span> / </span>
      <a href="/seo/faridabad" style="color:#7c2d12;text-decoration:none;">${escapeHtmlText(data.cityName)} Zones</a>
      <span> / </span>
      <span>${escapeHtmlText(data.areaLabel)}</span>
    </nav>

    <section style="background:#ffffff;border:1px solid #e7dfd4;border-radius:16px;padding:26px 24px;margin-bottom:28px;">
      <p style="margin:0 0 8px;font-size:12.5px;font-weight:600;color:#166534;">
        ${escapeHtmlText(data.nearestHub.name)} Hub · ${data.distanceKm.toFixed(1)} km Express Radius · PIN ${escapeHtmlText(data.pincode)}
      </p>
      <h1 style="margin:0 0 12px;font-size:clamp(24px,3.6vw,36px);line-height:1.18;font-weight:800;color:#1f1612;">
        ${escapeHtmlText(data.h1)}
      </h1>
      <p style="margin:0 0 18px;font-size:15.5px;line-height:1.6;color:#4f433d;max-width:74ch;">
        ${escapeHtmlText(data.heroSummary)}
      </p>
      <div style="display:flex;flex-wrap:wrap;gap:12px;align-items:center;">
        <a href="${escapeHtmlText(data.primaryWebsiteUrl)}/collections/all" style="padding:11px 20px;border-radius:9px;background:#7c2d12;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;">Order Fresh Cakes Now</a>
        <a href="${escapeHtmlText(data.primaryWebsiteUrl)}" style="padding:11px 18px;border-radius:9px;border:1px solid #d6c8b8;background:#fbf8f3;color:#1f1612;font-size:14px;font-weight:600;text-decoration:none;">Visit ${escapeHtmlText(data.primaryWebsiteUrl.replace(/^https?:\/\//, ''))}</a>
      </div>
    </section>

    <section style="margin-bottom:32px;">
      <div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:baseline;gap:8px;margin-bottom:14px;">
        <h2 style="margin:0;font-size:21px;font-weight:800;color:#1f1612;">Fresh Cakes Deliverable to ${escapeHtmlText(data.areaLabel)}</h2>
        <span style="font-size:12.5px;color:#6b5b52;">Custom Design · Ready to Eat · 100% Eggless Options</span>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(235px,1fr));gap:16px;">
        ${productsHtml}
      </div>
    </section>

    <section style="background:#ffffff;border:1px solid #e7dfd4;border-radius:16px;padding:22px;margin-bottom:28px;">
      <h2 style="margin:0 0 10px;font-size:19px;font-weight:800;color:#1f1612;">Unified 5 km Faridabad Cake Delivery Zone Coverage</h2>
      <p style="margin:0 0 14px;font-size:14px;line-height:1.6;color:#4f433d;">
        Our unified cake kitchen network merges 5 km rapid delivery circles across
        <strong>${escapeHtmlText(activeHubs.map((h) => `${h.name} (${h.pincode})`).join(', '))}</strong>
        so customers searching for <strong>custom cakes</strong> or <strong>ready to eat cakes</strong> receive oven-fresh cakes with local rider care.
      </p>
      <p style="margin:0;font-size:12.5px;color:#6b5b52;">
        Popular Searches: ${escapeHtmlText(data.targetKeywords.join(' · '))}
      </p>
    </section>

    <section style="background:#ffffff;border:1px solid #e7dfd4;border-radius:16px;padding:22px;margin-bottom:28px;">
      <h2 style="margin:0 0 6px;font-size:19px;font-weight:800;color:#1f1612;">Frequently Asked Questions – ${escapeHtmlText(data.areaLabel)}</h2>
      ${faqsHtml}
    </section>

    <section style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:18px;">
      <div style="background:#ffffff;border:1px solid #e7dfd4;border-radius:14px;padding:18px;">
        <h3 style="margin:0 0 10px;font-size:16px;font-weight:700;color:#1f1612;">More Cake Categories Nearby</h3>
        ${catLinksHtml}
      </div>
      <div style="background:#ffffff;border:1px solid #e7dfd4;border-radius:14px;padding:18px;">
        <h3 style="margin:0 0 10px;font-size:16px;font-weight:700;color:#1f1612;">Nearby Faridabad Sectors (Within 5 km)</h3>
        ${locLinksHtml}
      </div>
    </section>
  </main>

  <footer style="border-top:1px solid #e7dfd4;background:#ffffff;padding:20px;text-align:center;font-size:12.5px;color:#6b5b52;">
    ${escapeHtmlText(data.brandName)} · Serving ${escapeHtmlText(config.cityName || 'Faridabad')} ·
    <a href="${escapeHtmlText(data.primaryWebsiteUrl)}" style="color:#7c2d12;text-decoration:none;font-weight:600;">${escapeHtmlText(data.primaryWebsiteUrl)}</a>
    · <a href="/sitemap.xml" style="color:#6b5b52;text-decoration:none;">XML Sitemap</a>
  </footer>
</body>
</html>`;
}

export function renderGeoSeoDirectoryHtml(
  config: GeoSeoConfig,
  hostOrigin: string
): string {
  const cleanHost = (hostOrigin || 'https://whatsa86.vercel.app').replace(/\/+$/, '');
  const siteUrl = normalizeWebsiteBaseUrl(config.primaryWebsiteUrl);
  const stats = getGeoSeoStats(config);
  const activeHubs = (config.hubs || []).filter((h) => h.enabled);
  const covered = getCoveredLocalities(config);
  const cats = (config.categories || []).filter((c) => c.enabled);

  const hubCards = activeHubs
    .map(
      (h) => `<a href="/seo/faridabad/${escapeHtmlText(buildTier1Slug(h, config.cityName))}" style="display:block;border:1px solid #e7dfd4;border-radius:12px;background:#fff;padding:16px;text-decoration:none;color:#1f1612;">
        <div style="font-weight:800;font-size:17px;color:#7c2d12;">${escapeHtmlText(h.name)} (${h.radiusKm} km Zone)</div>
        <div style="font-size:12.5px;color:#6b5b52;margin-top:4px;">PIN ${escapeHtmlText(h.pincode)} · ${covered.filter((c) => c.matchingHubIds.includes(h.id)).length} Sectors Covered</div>
      </a>`
    )
    .join('');

  const localityGrid = covered
    .map((cov) => {
      const customCat = cats[0];
      const href = customCat ? `/seo/faridabad/${buildTier2Slug(customCat, cov.locality, config.cityName)}` : '/seo/faridabad';
      return `<a href="${escapeHtmlText(href)}" style="display:flex;justify-content:space-between;align-items:center;border:1px solid #e7dfd4;border-radius:10px;background:#fff;padding:10px 12px;text-decoration:none;color:#1f1612;font-size:13px;">
        <span style="font-weight:600;">${escapeHtmlText(cov.locality.name)}</span>
        <span style="color:#6b5b52;font-size:11.5px;">${cov.distanceKm.toFixed(1)} km · ${escapeHtmlText(cov.locality.pincode)}</span>
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
</head>
<body style="margin:0;background:#fbf8f3;color:#1f1612;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <main style="max-width:1120px;margin:0 auto;padding:28px 20px 56px;">
    <p style="margin:0 0 6px;font-size:13px;font-weight:600;color:#166534;">${stats.totalPages.toLocaleString()} Live Geo-SEO Cake Pages · ${stats.coveredLocalitiesCount} Faridabad Localities</p>
    <h1 style="margin:0 0 12px;font-size:32px;font-weight:800;">${escapeHtmlText(config.brandName)} – Faridabad Unified Cake Zones</h1>
    <p style="margin:0 0 22px;font-size:15px;color:#4f433d;">Direct Storefront: <a href="${escapeHtmlText(siteUrl)}" style="color:#7c2d12;font-weight:700;">${escapeHtmlText(siteUrl)}</a></p>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px;margin-bottom:28px;">
      ${hubCards}
    </div>
    <h2 style="font-size:20px;font-weight:800;margin:0 0 12px;">All Covered Faridabad Sectors & Colonies (≤ 5 km Radius)</h2>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:10px;">
      ${localityGrid}
    </div>
  </main>
</body>
</html>`;
}
