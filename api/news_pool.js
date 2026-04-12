export default async function handler(req, res) {
  const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL?.replace(/"/g,"").trim();
  const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN?.replace(/"/g,"").trim();
  try {
    const r = await fetch(`${REDIS_URL}/get/ww_global_pool`, { headers: { Authorization: `Bearer ${REDIS_TOKEN}` } });
    const data = await r.json();
    
    let parsed = [];
    if (data.result) {
        // BEYAZ EKRAN ÇÖZÜMÜ: Çift stringify olmuş veriyi zorla listeye çeviren kalkan
        let temp = typeof data.result === "string" ? JSON.parse(data.result) : data.result;
        parsed = typeof temp === "string" ? JSON.parse(temp) : temp;
    }
    
    // Eğer tüm zorlamalara rağmen liste değilse boş liste döndür ki ekran asla çökmesin
    if (!Array.isArray(parsed)) parsed = [];
    
    return res.status(200).json({ news: parsed });
  } catch(e) {
    return res.status(200).json({ news: [] });
  }
}
