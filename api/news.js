export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  try {
    const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL?.replace(/"/g,'').trim();
    const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN?.replace(/"/g,'').trim();
    const r = await fetch(`${REDIS_URL}/get/latest_news`, {
      headers: { Authorization: `Bearer ${REDIS_TOKEN}` }
    });
    const data = await r.json();
    const news = data.result ? JSON.parse(data.result) : [];
    return res.status(200).json({ news });
  } catch(e) {
    return res.status(200).json({ news: [] });
  }
}
