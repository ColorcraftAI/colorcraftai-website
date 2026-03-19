// api/maps-key.js
// Vercel serverless function — serves the Maps API key securely
// The key is stored in Vercel environment variables, never in code

export default function handler(req, res) {
  const key = process.env.GOOGLE_MAPS_API_KEY;

  if (!key) {
    return res.status(500).json({ error: 'Maps API key not configured' });
  }

  // Only allow requests from your own domains
  const origin = req.headers.origin || req.headers.referer || '';
  const allowed = [
    'https://colorcraftai-website.vercel.app',
    'https://colorcraftai.in',
    'http://localhost',
    'http://127.0.0.1',
  ];

  const isAllowed = allowed.some(d => origin.startsWith(d));

  if (!isAllowed && process.env.NODE_ENV === 'production') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  // Cache for 1 hour — key doesn't change often
  res.setHeader('Cache-Control', 's-maxage=3600');
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.status(200).json({ key });
}
