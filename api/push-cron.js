let onesignalError = null;

async function redisGet(url, token, key) {
  if (!url || !token) return null;
  try {
    const res = await fetch(`${url}/get/${encodeURIComponent(key)}`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    return data.result ? JSON.parse(data.result) : null;
  } catch(e) { return null; }
}

async function redisSet(url, token, key, value) {
  if (!url || !token) return;
  try {
    await fetch(`${url}/set/${encodeURIComponent(key)}`, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify(value) });
  } catch(e) {}
}

async function sendPush(newsItem) {
  const REST_KEY = process.env.ONESIGNAL_REST_API_KEY;
  try {
    const res = await fetch("https://onesignal.com/api/v1/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8", "Authorization": `Basic ${REST_KEY}` },
      body: JSON.stringify({
        app_id: "4c3d1977-4ffa-4227-8665-758fe36cce73",
        included_segments: ["Subscribed Users"],
        headings: { en: `🌍 ${newsItem.kaynak}` },
        contents: { en: newsItem.baslik },
        chrome_web_image: "https://www.worldwindows.network/logo.jpeg",
        url: `https://worldwindows.network/?newsId=${newsItem.id}`,
        app_url: `https://worldwindows.network/?newsId=${newsItem.id}`,
        web_push_topic: newsItem.id
      })
    });
    const data = await res.json();
    if (!res.ok) onesignalError = data;
    return res.ok;
  } catch(e) { onesignalError = e.message; return false; }
}

function parseItems(xmlText, label) {
  const items = [];
  const itemRegex = /<item[\s>]([\s\S]*?)<\/item>/g;
  let match;
  while ((match = itemRegex.exec(xmlText)) !== null && items.length < 2) {
    const block = match[1];
    const titleMatch = block.match(/<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/);
    const title = titleMatch ? titleMatch[1].trim() : "";
    if (title && title.length > 10) {
      const newsId = Buffer.from(title.slice(0, 30)).toString("base64").replace(/[^a-zA-Z0-9]/g, "");
      items.push({ id: newsId, baslik: title, kaynak: label });
    }
  }
  return items;
}

export default async function handler(req, res) {
  onesignalError = null;
  const REDIS_URL = (process.env.UPSTASH_REDIS_REST_URL || "").replace(/"/g,"").trim();
  const REDIS_TOKEN = (process.env.UPSTASH_REDIS_REST_TOKEN || "").replace(/"/g,"").trim();

  const FEEDS = [
    { url: "https://www.reutersagency.com/feed/", label: "Reuters" },
    { url: "https://www.bloomberght.com/rss", label: "Bloomberg HT" },
    { url: "https://www.ntv.com.tr/ekonomi.rss", label: "NTV" },
    { url: "https://www.sozcu.com.tr/feeds-son-dakika", label: "Sözcü" },
    { url: "https://www.ekonomim.com/rss", label: "Ekonomim" },
    { url: "https://tr.investing.com/rss/news_301.rss", label: "Investing TR" },
    { url: "https://cointelegraph.com/rss", label: "CoinTelegraph" },
    { url: "https://www.coindesk.com/arc/outboundfeeds/rss/", label: "CoinDesk" },
    { url: "https://www.kitco.com/rss/index.xml", label: "Kitco" },
    { url: "https://www.investing.com/rss/news_95.rss", label: "Investing Gold" },
    { url: "https://www.investing.com/rss/market_overview_287.rss", label: "Investing Silver" },
    { url: "https://www.ft.com/markets?format=rss", label: "FT Markets" },
    { url: "https://asia.nikkei.com/rss/feed/category/53", label: "Nikkei Asia" },
    { url: "https://tr.euronews.com/rss?level=vertical&type=all", label: "Euronews TR" },
    { url: "https://www.paraanaliz.com/feed/", label: "Para Analiz" },
    { url: "https://www.hisse.net/haber/?feed=rss2", label: "Hisse.net" }
  ];

  // 1. ADIM: AYNI ANDA TARA (HIZ)
  const results = await Promise.all(FEEDS.map(async f => {
    try {
      const r = await fetch(f.url, { signal: AbortSignal.timeout(3000) });
      return parseItems(await r.text(), f.label);
    } catch { return []; }
  }));

  const allFoundNews = results.flat();
  let pushedCount = 0;

  // 2. ADIM: SIRAYLA GÖNDER (GÜVENLİK)
  for (const item of allFoundNews) {
    if (pushedCount >= 3) break;
    const isSent = await redisGet(REDIS_URL, REDIS_TOKEN, `sent_${item.id}`);
    if (!isSent) {
      const ok = await sendPush(item);
      if (ok) {
        await redisSet(REDIS_URL, REDIS_TOKEN, `sent_${item.id}`, "true");
        pushedCount++;
      }
    }
  }

  res.status(200).json({ 
    pushed: pushedCount, 
    scanned: FEEDS.length, 
    status: onesignalError ? "HATA" : "BASARILI",
    details: onesignalError 
  });
}
