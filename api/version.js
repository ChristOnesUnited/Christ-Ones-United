// Tells the app which version is live, so open copies can offer a "new version available" refresh.
// Vercel sets these automatically on every deploy; each upload to GitHub makes a new one.
module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  if (req.method === 'OPTIONS') return res.status(200).end();
  const v = process.env.VERCEL_GIT_COMMIT_SHA || process.env.VERCEL_DEPLOYMENT_ID || 'dev';
  return res.status(200).json({ version: String(v).slice(0, 40) });
};
