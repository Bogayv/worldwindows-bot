let onesignalError = null;

// REDIS BAĞLANTI FONKSİYONLARI
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
    await fetch(`${url}/set/${encodeURIComponent(key)}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(value)
    });
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
        included_segments: ["All", "Subscribed Users", "Active Users"], // En güvenli hedef kitle
        headings: { en: `🌍 ${newsItem.kaynak}` },
        contents: { en: newsItem.baslik },
        chrome_web_image: "https://www.worldwindows.network/logo.jpeg",
        url: `https://worldwindows.network/?newsId=${newsItem.id}`,
        app_url: `https://worldwindows.network/?newsId=${newsItem.id}`,
        web_push_topic: newsItem.id,
        android_group: newsItem.id
      })
    });
    const data = await res.json();
    if (!res.ok || data.errors) onesignalError = data;
    return (res.ok && !data.errors);
  } catch(e) {
    onesignalError = e.message;
    return false;
  }
}

function parseItems(xmlText, label, maxItems = 3) {
  const items = [];
  const itemRegex = /<item[\s>]([\s\S]*?)<\/item>/g;
  let itemMatch;
  while ((itemMatch = itemRegex.exec(xmlText)) !== null && items.length < maxItems) {
    const block = itemMatch[1];
    const titleMatch = block.match(/<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/);
    const title = titleMatch ? titleMatch[1].trim() : "";
    if (title && title.length > 10) {
      const newsId = Buffer.from(title.slice(0, 30)).toString("base64").replace(/[^a-zA-Z0-9]/g, "");
      items.push({ id: newsId, baslik: title, kaynak: label, time: Date.now() });
    }
  }
  return items;
}

export default async function handler(req, res) {
  onesignalError = null;
  const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL ? process.env.UPSTASH_REDIS_REST_URL.replace(/"/g,"").trim() : "";
  const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN ? process.env.UPSTASH_REDIS_REST_TOKEN.replace(/"/g,"").trim() : "";

  const FEEDS = [
    { url: "https://www.reutersagency.com/feed/", label: "Reuters" },
    { url: "https://www.bloomberght.com/rss", label: "Bloomberg HT" },
    { url: "https://www.ntv.com.tr/ekonomi.rss", label: "NTV" },
    { url: "https://www.sozcu.com.tr/feeds-son-dakika", label: "Sözcü" },
    { url: "https://www.ekonomim.com/rss", label: "Ekonomim" },
    { url: "https://tr.investing.com/rss/news_301.rss", label: "Investing TR" },
    { url: "https://www.ft.com/markets?format=rss", label: "FT Markets" },
    { url: "https://cointelegraph.com/rss", label: "CoinTelegraph" },
    { url: "https://www.coindesk.com/arc/outboundfeeds/rss/", label: "CoinDesk" },
    { url: "https://www.scmp.com/rss/4/feed", label: "SCMP" },
    { url: "https://asia.nikkei.com/rss/feed/category/53", label: "Nikkei Asia" },
    { url: "https://en.yna.co.kr/RSS/news.xml", label: "Yonhap News" },
    { url: "https://tr.euronews.com/rss?level=vertical&type=all", label: "Euronews TR" },
    { url: "https://www.france24.com/en/rss", label: "France 24" },
    { url: "https://www.foreignaffairs.com/rss.xml", label: "Foreign Affairs" },
    { url: "https://rss.dw.com/rdf/rss-en-all", label: "Deutsche Welle" },
    { url: "https://www.theguardian.com/politics/rss", label: "Guardian Politics" },
    { url: "https://www.abc.net.au/news/feed/45910/rss.xml", label: "ABC Australia" },
    { url: "https://www.kitco.com/rss/index.xml", label: "Kitco" },
    { url: "https://www.investing.com/rss/news_95.rss", label: "Investing Gold" },
    { url: "https://www.investing.com/rss/market_overview_287.rss", label: "Investing Silver" },
    { url: "https://gazeteoksijen.com/rss", label: "Gazete Oksijen" },
    { url: "https://www.paraanaliz.com/feed/", label: "Para Analiz" },
    { url: "https://www.borsagundem.com.tr/rss", label: "Borsa Gündem" },
    { url: "https://www.hisse.net/haber/?feed=rss2", label: "Hisse.net" }
  ];

  // 10 SANİYE LİMİTİNE TAKILMAMAK İÇİN RASTGELE 5 KAYNAK SEÇ
  const randomFeeds = FEEDS.sort(() => 0.5 - Math.random()).slice(0, 5);
  let pushedCount = 0;

  // PARALEL TARAMA (Çok Hızlı)
  const fetchPromises = randomFeeds.map(async (feed) => {
    try {
      const response = await fetch(feed.url, { signal: AbortSignal.timeout(4000) });
      const text = await response.text();
      return parseItems(text, feed.label);
    } catch (err) { return []; }
  });

  const results = await Promise.all(fetchPromises);
  
  for (const items of results) {
    for (const item of items) {
      try {
        // REDIS HAFIZA KONTROLÜ
        const isSent = await redisGet(REDIS_URL, REDIS_TOKEN, `sent_${item.id}`);
        
        // Eğer gönderilmediyse ve bu turda henüz 3 haber atmadıysak
        if (!isSent && pushedCount < 3) {
          const ok = await sendPush(item);
          if (ok) {
            // BAŞARILIYSA REDİS'E "GÖNDERİLDİ" DİYE KAYDET (1 Haftalık ömür verilebilir ama şimdilik kalıcı)
            await redisSet(REDIS_URL, REDIS_TOKEN, `sent_${item.id}`, "true");
            pushedCount++;
          }
        }
      } catch(e) {}
    }
  }

  res.status(200).json({ 
    pushed: pushedCount, 
    scanned_feeds: randomFeeds.map(f => f.label),
    status: onesignalError ? "HATA" : "BASARILI",
    error_details: onesignalError 
  });
}
