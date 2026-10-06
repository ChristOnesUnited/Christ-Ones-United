// Shared location helpers. Files in api/_lib are not deployed as endpoints.
// zips.json: { "80470": [lat, lng, "City", "ST"], ... }
// Coordinates: US Census ZCTA Gazetteer (public domain); city/state names: US-Zip-Codes-JSON (MIT).
const ZIPS = require('./zips.json');

function cleanZip(zip) {
  const m = String(zip || '').match(/\d{5}/);
  return m ? m[0] : '';
}

// Returns { zip, lat, lng, city, state } or null if the ZIP is unknown
function lookupZip(zip) {
  const z = cleanZip(zip);
  const row = z && ZIPS[z];
  if (!row) return null;
  return { zip: z, lat: row[0], lng: row[1], city: row[2], state: row[3] };
}

// Great-circle distance in miles
function distanceMiles(lat1, lng1, lat2, lng2) {
  if ([lat1, lng1, lat2, lng2].some(v => v === null || v === undefined || isNaN(v))) return null;
  const R = 3958.8;
  const toRad = d => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// Normalizes a church name so "First Baptist", "First Baptist Church" and
// "first baptist church." group together when matching.
function normalizeChurchName(name) {
  const key = String(name || '')
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/&/g, ' and ')
    .replace(/^st\.?\s/, 'saint ')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\b(the|church|inc)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  // e.g. "The Church" would strip to nothing — fall back to the plain lowercase name
  return key || String(name || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

const SERVICE_TYPES = ['storefront', 'service_area', 'national'];
const DEFAULT_STOREFRONT_RADIUS = 25;

function cleanServiceType(t) {
  return SERVICE_TYPES.includes(t) ? t : 'storefront';
}

function cleanRadius(r, type) {
  if (type === 'national') return null;
  const n = parseInt(r, 10);
  if (!n || n < 1) return DEFAULT_STOREFRONT_RADIUS;
  return Math.min(n, 500);
}

module.exports = {
  cleanZip, lookupZip, distanceMiles, normalizeChurchName,
  SERVICE_TYPES, DEFAULT_STOREFRONT_RADIUS, cleanServiceType, cleanRadius,
};
