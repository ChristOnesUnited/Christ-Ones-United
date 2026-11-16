const supabase = require('./supabase');
const { requireMember } = require('./_lib/memberAuth');
const { requireAdmin } = require('./_lib/adminAuth');
const { parseImage, storeImage, removeImage } = require('./_lib/media');

// Picture uploads.
//   kind "logo"            member uploads their own business logo   { business_id, image }
//   kind "logo_remove"     member removes their logo                { business_id }
//   kind "newsletter"      admin uploads a newsletter banner        { image }
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { kind, business_id, image } = req.body || {};
  try {
    if (kind === 'newsletter') {
      const auth = await requireAdmin(req, res); if (!auth) return;
      const img = parseImage(image);
      if (img.error) return res.status(400).json({ error: img.error });
      return res.status(200).json({ success: true, url: await storeImage(supabase, 'newsletter', img) });
    }

    if (kind === 'logo' || kind === 'logo_remove') {
      const auth = await requireMember(req, res); if (!auth) return;
      if (!business_id) return res.status(400).json({ error: 'Business ID required.' });
      const { data: biz } = await supabase.from('businesses').select('id, user_id, logo_url').eq('id', business_id).single();
      if (!biz || String(biz.user_id) !== String(auth.user.id)) return res.status(403).json({ error: 'You can only change your own logo.' });

      let url = '';
      if (kind === 'logo') {
        const img = parseImage(image);
        if (img.error) return res.status(400).json({ error: img.error });
        url = await storeImage(supabase, 'logos', img);
      }
      const { error } = await supabase.from('businesses').update({ logo_url: url }).eq('id', biz.id);
      if (error) { if (url) await removeImage(supabase, url); throw error; }
      if (biz.logo_url) await removeImage(supabase, biz.logo_url);
      return res.status(200).json({ success: true, logo_url: url });
    }
    return res.status(400).json({ error: 'Unknown upload type.' });
  } catch (err) {
    console.error('Upload error:', err.message);
    return res.status(500).json({ error: 'The picture could not be saved. Please try again.' });
  }
};
