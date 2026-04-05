async function sendPush(newsItem) {
  const REST_KEY = process.env.ONESIGNAL_REST_API_KEY;
  if (!REST_KEY) return;
  const res = await fetch("https://onesignal.com/api/v1/notifications", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8", "Authorization": `Basic ${REST_KEY}` },
    body: JSON.stringify({
      app_id: "4c3d1977-4ffa-4227-8665-758fe36cce73",
      included_segments: ["Subscribed Users"],
      headings: { en: `🌍 ${newsItem.kaynak}` },
      contents: { en: newsItem.baslik.slice(0, 200) },
      url: `https://worldwindows.network/?newsId=${newsItem.id}`,
      chrome_web_icon: "https://worldwindows.network/logo.jpeg"
    })
  });
  const data = await res.json();
  console.log(res.ok ? `✅ Push: ${data.recipients} alıcı` : `❌ Hata: ${JSON.stringify(data.errors)}`);
}

async function redisGet(url, token, key) {
  const res = await fetch(`${url}/get/${key}`, { headers: { Authorization: `Bearer ${token}` } });
  const data = await res.json();
  return data.result ?? null;
}

async function redisSet(url, token, key, value) {
  await fetch(`${url}/set/${key}/${encodeURIComponent(value)}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` }
  });
}

function parseFirstItem(xml, label) {
  const block = (xml.match(/<item[\s\S]*?<\/item>/) || [])[0];
  if (!block) return null;
  const titleRaw = ((block.match(/<title[^>]*><!\[CDATA\[([\s\S]*?)\]\]><\/title>/) || block.match(/<title[^>]*>([\s\S]*?)<\/title>/) || [])[1] || "").trim();
  const link = ((block.match(/<link>([\s\S]*?)<\/link>/) || [])[1] || "#").trim();
  const title = titleRaw.replace(/&amp;/g,"&").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&#39;/g,"'").trim();
  if (!title) return null;
  const id = Buffer.from(title.slice(0,20)).toString("base64").replace(/[^a-zA-Z0-9]/g,"").slice(0,24);
  return { id, baslik: title, url: link, kaynak: label };
}

export default async function handler(req, res) {
  const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL?.replace(/"/g,"").trim();
  const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN?.replace(/"/g,"").trim();
  if (!REDIS_URL || !REDIS_TOKEN) return res.status(500).json({ error: "Redis env eksik" });

  const FEEDS = [
    { url: "https://www.aljazeera.com/xml/rss/all.xml", label: "Al Jazeera" },
    { url: "https://cointelegraph.com/rss", label: "CoinTelegraph" },
    { url: "https://www.bloomberght.com/rss", label: "Bloomberg HT" },
    { url: "https://www.sozcu.com.tr/feeds-son-dakika", label: "Sözcü" },
  ];

  const lastId = await redisGet(REDIS_URL, REDIS_TOKEN, "last_pushed_id");

  for (const feed of FEEDS) {
    try {
      const controller = new AbortController();
      setTimeout(() => controller.abort(), 5000);
      const response = await fetch(feed.url, { signal: controller.signal });
      if (!response.ok) continue;
      const item = parseFirstItem(await response.text(), feed.label);
      if (!item || item.id === lastId) continue;
      await sendPush(item);
      await redisSet(REDIS_URL, REDIS_TOKEN, "last_pushed_id", item.id);
      return res.status(200).json({ ok: true, pushed: true, source: feed.label, title: item.baslik.slice(0,80) });
    } catch(e) { continue; }
  }
  return res.status(200).json({ ok: true, pushed: false, message: "Yeni haber yok" });
}
