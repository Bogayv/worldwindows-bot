export default async function handler(req, res) {
  // VERCEL'İN ESKİ VERİ GÖSTERMESİNİ (CACHE) KESİN OLARAK YASAKLIYORUZ
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL?.replace(/"/g,"").trim();
  const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN?.replace(/"/g,"").trim();
  try {
    const r = await fetch(REDIS_URL, {
      method: "POST",
      headers: { "Authorization": `Bearer ${REDIS_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify(["GET", "ww_global_pool"])
    });
    const data = await r.json();
    
    let parsed = [];
    if (data.result) {
        let temp = typeof data.result === "string" ? JSON.parse(data.result) : data.result;
        parsed = typeof temp === "string" ? JSON.parse(temp) : temp;
    }
    
    if (!Array.isArray(parsed)) parsed = [];
    return res.status(200).json({ news: parsed });
  } catch(e) {
    return res.status(200).json({ news: [] });
  }
}
