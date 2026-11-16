// Image upload helpers (business logos, newsletter banners).
// Images are stored in the public Supabase Storage bucket "media".
const crypto = require('crypto');
const BUCKET = 'media';
const MAX_BYTES = 1.5 * 1024 * 1024; // the app shrinks photos before upload, so this is generous

// Accepts a data URL ("data:image/jpeg;base64,...") and checks the bytes really are a
// JPEG, PNG or WebP picture (the browser's claim about the type is not trusted).
function parseImage(dataUrl) {
  const m = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=\s]+)$/.exec(String(dataUrl || ''));
  if (!m) return { error: 'Please choose a JPG, PNG or WebP picture.' };
  const buf = Buffer.from(m[2].replace(/\s/g, ''), 'base64');
  if (buf.length < 100) return { error: 'That picture looks empty. Please try another.' };
  if (buf.length > MAX_BYTES) return { error: 'That picture is too large. Please choose a smaller one.' };
  let type = null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) type = 'jpeg';
  else if (buf.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) type = 'png';
  else if (buf.slice(0, 4).toString('latin1') === 'RIFF' && buf.slice(8, 12).toString('latin1') === 'WEBP') type = 'webp';
  if (!type) return { error: 'That file is not a valid picture.' };
  return { buf, type };
}

// Uploads and returns the public URL
async function storeImage(supabase, folder, img) {
  const path = folder + '/' + Date.now() + '-' + crypto.randomBytes(6).toString('hex') + '.' + (img.type === 'jpeg' ? 'jpg' : img.type);
  const { error } = await supabase.storage.from(BUCKET).upload(path, img.buf, { contentType: 'image/' + img.type, upsert: false, cacheControl: '31536000' });
  if (error) throw error;
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

// Best effort: delete a stored picture given its public URL (ignored if it is not ours)
async function removeImage(supabase, url) {
  try {
    const marker = '/storage/v1/object/public/' + BUCKET + '/';
    const s = String(url || ''); const i = s.indexOf(marker);
    if (i < 0) return;
    await supabase.storage.from(BUCKET).remove([decodeURIComponent(s.slice(i + marker.length).split('?')[0])]);
  } catch (e) { /* the record is what matters */ }
}

// Only pictures that live in our own bucket may be shown
function isOurImage(url) {
  try {
    const base = new URL(process.env.SUPABASE_URL || '');
    const u = new URL(String(url || ''));
    return u.protocol === 'https:' && u.host === base.host && u.pathname.startsWith('/storage/v1/object/public/' + BUCKET + '/');
  } catch (e) { return false; }
}

// Turns a YouTube or Vimeo link into { provider, id, url, embed, thumb } or null
function parseVideo(link) {
  let u; try { u = new URL(String(link || '').trim()); } catch (e) { return null; }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
  const host = u.hostname.replace(/^www\.|^m\./, '');
  let id = null;
  if (host === 'youtu.be') id = u.pathname.slice(1).split('/')[0];
  else if (host === 'youtube.com') {
    if (u.pathname === '/watch') id = u.searchParams.get('v');
    else { const mm = /^\/(embed|shorts|live)\/([^/]+)/.exec(u.pathname); if (mm) id = mm[2]; }
  }
  if (id && /^[A-Za-z0-9_-]{6,15}$/.test(id)) {
    return { provider: 'youtube', id, url: 'https://www.youtube.com/watch?v=' + id, embed: 'https://www.youtube-nocookie.com/embed/' + id, thumb: 'https://img.youtube.com/vi/' + id + '/hqdefault.jpg' };
  }
  if (host === 'vimeo.com') {
    const mm = /^\/(\d{5,12})/.exec(u.pathname);
    if (mm) return { provider: 'vimeo', id: mm[1], url: 'https://vimeo.com/' + mm[1], embed: 'https://player.vimeo.com/video/' + mm[1], thumb: '' };
  }
  return null;
}

module.exports = { parseImage, storeImage, removeImage, isOurImage, parseVideo, BUCKET };
