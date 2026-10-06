const supabase = require('../supabase');
const { lookupZip, cleanZip, normalizeChurchName } = require('./geo');

// Finds a church with the same normalized name and ZIP, or creates one.
async function findOrCreateChurch(name, zip) {
  const cleanName = String(name || '').trim().replace(/\s+/g, ' ');
  const z = cleanZip(zip);
  if (!cleanName) throw new Error('Church name is required.');
  const loc = lookupZip(z);
  if (!loc) throw new Error('Please enter a valid 5-digit church ZIP code.');

  const nameKey = normalizeChurchName(cleanName);
  const { data: existing, error: findErr } = await supabase
    .from('churches').select('*').eq('name_key', nameKey).eq('zip', z).limit(1);
  if (findErr) throw findErr;
  if (existing && existing.length) return existing[0];

  const { data, error } = await supabase
    .from('churches')
    .insert([{ name: cleanName, name_key: nameKey, zip: z, city: loc.city, state: loc.state, lat: loc.lat, lng: loc.lng }])
    .select().single();
  if (error) {
    // Someone added the same church a moment ago (unique name + ZIP) — use theirs
    if (error.code === '23505') {
      const { data: again } = await supabase
        .from('churches').select('*').eq('name_key', nameKey).eq('zip', z).limit(1);
      if (again && again.length) return again[0];
    }
    throw error;
  }
  return data;
}

module.exports = { findOrCreateChurch };
