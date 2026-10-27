// Works out which web address a visitor is using, so links we send them (password reset,
// Stripe return pages, admin emails) bring them back to the same place.
// Only addresses on this approved list are used; anything else falls back to SITE_URL.
const ALLOWED_ORIGINS = [
  'https://christonesunited.org',
  'https://www.christonesunited.org',
  'https://app.christonesunited.com',
];

function siteUrl(req) {
  const fallback = (process.env.SITE_URL || 'https://christonesunited.org').replace(/\/+$/, '');
  const origin = req && req.headers && req.headers.origin;
  if (origin && ALLOWED_ORIGINS.includes(origin)) return origin;
  return fallback;
}

module.exports = { siteUrl, ALLOWED_ORIGINS };
