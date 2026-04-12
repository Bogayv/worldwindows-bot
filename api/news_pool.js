export default async function handler(req, res) {
  const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL?.replace(/"/g,"").trim();
  const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN?.replace(/"/g,"").trim();
  try {
    const r = await fetch(`${REDIS_URL}/get/ww_global_pool`, { headers: { Authorization: `Bearer ${REDIS_TOKEN}` } });
    const data = await r.json();
    return res.status(200).json({ news: JSON.parse(data.result || "[]") });
  } catch(e) { return res.status(200).json({ news: [] }); }
}
