async function sendPush(newsItem) {
  const REST_KEY = process.env.ONESIGNAL_KEY;
  if (!REST_KEY) return false;
  const res = await fetch("https://onesignal.com/api/v1/notifications", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8", "Authorization": `Basic ${REST_KEY}` },
    body: JSON.stringify({
      app_id: "4c3d1977-4ffa-4227-8665-758fe36cce73",
      included_segments: ["All"],
      headings: { en: `🌍 ${newsItem.kaynak}` },
      contents: { en: newsItem.baslik.slice(0, 200) },
      url: `https://www.worldwindows.network/?newsId=${newsItem.id}`,
      chrome_web_icon: "https://www.worldwindows.network/logo.jpeg",
      // BİLDİRİMLERİN BİRBİRİNİ EZMESİNİ (ÜST ÜSTE BİNMESİNİ) ENGELEYEN SİHİRLİ SATIRLAR:
      web_push_topic: newsItem.id,
      android_group: newsItem.id,
      collapse_id: newsItem.id
    })
  });
  return res.ok;
}

async function redisGet(url, token, key) {
  const res = await fetch(`${url}/get/${encodeURIComponent(key)}`, { headers: { Authorization: `Bearer ${token}` } });
  const data = await res.json();
  return data.result ?? null;
}

async function redisSet(url, token, key, value) {
  await fetch(`${url}/set/${encodeURIComponent(key)}/${encodeURIComponent(value)}/EX/259200`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` }
  });
}

function parseFirstItem(xml, label) {
  const block = (xml.match(/<item[\s\S]*?<\/item>/) || [])[0];
  if (!block) return null;
  const titleRaw = ((block.match(/<title[^>]*><!\[CDATA\[([\s\S]*?)\]\]><\/title>/) || block.match(/<title[^>]*>([\s\S]*?)<\/title>/) || [])[1] || "").trim();
  const link = ((block.match(/<link>([\s\S]*?)<\/link>/) || [])[1] || "#").trim();
  const title = titleRaw.replace(/&amp;/g,"&").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&#39;/g,"'").replace(/&quot;/g,'"').trim();
  if (!title) return null;
  const id = Buffer.from(title.slice(0,20)).toString("base64").replace(/[^a-zA-Z0-9]/g,"").slice(0,24);
  return { id, baslik: title, url: link, kaynak: label };
}

export default async function handler(req, res) {
  const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL?.replace(/"/g,"").trim();
  const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN?.replace(/"/g,"").trim();

  const FEEDS = [
    { url: "https://www.reutersagency.com/feed/", label: "Reuters" },
    { url: "https://www.ft.com/?format=rss", label: "Financial Times" },
    { url: "https://www.bloomberght.com/rss", label: "Bloomberg HT" },
    { url: "https://www.economist.com/sections/economics/rss.xml", label: "The Economist" },
    { url: "https://www.wsj.com/xml/rss/3_7014.xml", label: "WSJ" },
    { url: "https://rss.nytimes.com/services/xml/rss/nyt/World.xml", label: "NY Times" },
    { url: "https://www.politico.com/rss/politicopicks.xml", label: "Politico" },
    { url: "https://www.aljazeera.com/xml/rss/all.xml", label: "Al Jazeera" },
    { url: "https://feeds.barrons.com/v1/barrons/rss?xml=1", label: "Barrons" },
    { url: "https://cointelegraph.com/rss", label: "CoinTelegraph" },
    { url: "https://www.coindesk.com/arc/outboundfeeds/rss/", label: "CoinDesk" },
    { url: "https://gazeteoksijen.com/rss", label: "Gazete Oksijen" },
    { url: "https://tr.euronews.com/rss?level=vertical&type=all", label: "Euronews TR" },
    { url: "https://www.ntv.com.tr/ekonomi.rss", label: "NTV" },
    { url: "https://www.sozcu.com.tr/feeds-son-dakika", label: "Sözcü" },
    { url: "https://www.foreignaffairs.com/rss.xml", label: "Foreign Affairs" },
    { url: "https://asia.nikkei.com/rss/feed/category/53", label: "Nikkei Asia" },
    { url: "https://www.scmp.com/rss/4/feed", label: "SCMP" },
    { url: "https://en.yna.co.kr/RSS/news.xml", label: "Yonhap" },
    { url: "https://rss.dw.com/rdf/rss-en-all", label: "Deutsche Welle" },
    { url: "https://www.france24.com/en/rss", label: "France 24" },
    { url: "https://www.abc.net.au/news/feed/45910/rss.xml", label: "ABC Australia" },
    { url: "https://www.cnbc.com/id/10000664/device/rss/rss.html", label: "CNBC" },
    { url: "https://www.theguardian.com/world/rss", label: "The Guardian" },
    { url: "https://www.paraanaliz.com/feed/", label: "Para Analiz" },
    { url: "https://www.kitco.com/rss/index.xml", label: "Kitco" },
    { url: "http://feeds.bbci.co.uk/news/world/rss.xml", label: "BBC News" },
    { url: "https://www.borsagundem.com.tr/rss", label: "Borsa Gündem" },
    { url: "https://www.ekonomim.com/rss", label: "Ekonomim" },
    { url: "https://www.hisse.net/haber/?feed=rss2", label: "Hisse.net" },
    { url: "https://tr.investing.com/rss/news_301.rss", label: "Investing TR" },
    { url: "https://feeds.bloomberg.com/markets/news.xml", label: "Bloomberg" },
    { url: "https://feeds.washingtonpost.com/rss/world", label: "Washington Post" },
    { url: "https://techcrunch.com/feed/", label: "TechCrunch" },
    { url: "https://www.jpost.com/rss/rssfeedsfrontpage.aspx", label: "Jerusalem Post" },
    { url: "https://timesofindia.indiatimes.com/rssfeeds/1898055.cms", label: "Times of India" }
  ];

  let pushedCount = 0;
  let summary = [];

  for (const feed of FEEDS) {
    if (pushedCount >= 10) break; 
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); 
      const response = await fetch(feed.url, { signal: controller.signal }).catch(() => null);
      clearTimeout(timeoutId);

      if (!response || !response.ok) continue;
      const item = parseFirstItem(await response.text(), feed.label);
      if (!item) continue;

      const cacheKey = `sent_${item.id}`;
      const isSent = await redisGet(REDIS_URL, REDIS_TOKEN, cacheKey);

      if (isSent === "true") continue;

      const success = await sendPush(item);
      if (success) {
        await redisSet(REDIS_URL, REDIS_TOKEN, cacheKey, "true"); 
        pushedCount++;
        summary.push(feed.label);
      }
    } catch(e) { continue; }
  }

  return res.status(200).json({ ok: true, count: pushedCount, sources: summary });
}
