// Cloudflare Pages için uyarlanmış Buffer (Base64) fonksiyonu
function toBase64(str) {
  try { return btoa(unescape(encodeURIComponent(str))); }
  catch(e) { return btoa(str); }
}

async function sendPush(newsItem, env) {
  // CLOUDFLARE ENV KULLANIMI: context.env üzerinden gelir
  const REST_KEY = env.ONESIGNAL_REST_API_KEY;
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
      // BİLDİRİMLERİN ÜST ÜSTE BİNMESİNİ ENGELLER (SIRALI DÜŞMESİNİ SAĞLAR)
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
  // REDIS 3 GÜNLÜK HAFIZA (259200 Saniye)
  await fetch(`${url}/set/${encodeURIComponent(key)}/${encodeURIComponent(value)}/EX/259200`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` }
  });
}

// 🛠 KÖR NOKTA ÇÖZÜMÜ: İlk 1 değil, ilk 3 habere bakıyoruz.
function parseItems(xml, label) {
  const items = [];
  const blocks = xml.match(/<(item|entry)>[\s\S]*?<\/\1>/gi) || [];

  for (let i = 0; i < Math.min(blocks.length, 3); i++) {
    const block = blocks[i];
    const titleRaw = ((block.match(/<title[^>]*><!\[CDATA\[([\s\S]*?)\]\]><\/title>/i) || block.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || "").trim();
    const link = ((block.match(/<link>([\s\S]*?)<\/link>/i) || block.match(/<link[^>]*href="([^"]+)"/i) || [])[1] || "#").trim();
    
    const title = titleRaw.replace(/&amp;/g,"&").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&#39;/g,"'").replace(/&quot;/g,'"').trim();
    if (!title) continue;

    // SAAT HATASINI (GELECEKTEN GELEN HABERLERİ) DÜZELTME
    let pubDateRaw = (block.match(/<pubDate>([\s\S]*?)<\/pubDate>/i) || block.match(/<updated>([\s\S]*?)<\/updated>/i) || block.match(/<dc:date>([\s\S]*?)<\/dc:date>/i) || [])[1];
    let timestamp = Date.now();
    if (pubDateRaw) {
      let cleanDate = pubDateRaw.trim().replace(/\s+[A-Z]{3,5}$/i, "");
      const parsed = Date.parse(cleanDate);
      if (!isNaN(parsed)) {
        timestamp = parsed > Date.now() ? Date.now() - 3600000 : parsed;
      }
    }

    const id = toBase64(title.slice(0,20)).replace(/[^a-zA-Z0-9]/g,"").slice(0,24);
    items.push({ id, baslik: title, url: link, kaynak: label, timestamp });
  }
  return items;
}

// VERCEL'İN "handler(req, res)" YAPISI CLOUDFLARE'İN "onRequest(context)" YAPISINA ÇEVRİLDİ
export async function onRequest(context) {
  const { env } = context;
  const REDIS_URL = env.UPSTASH_REDIS_REST_URL?.replace(/"/g,"").trim();
  const REDIS_TOKEN = env.UPSTASH_REDIS_REST_TOKEN?.replace(/"/g,"").trim();

  // ORİJİNAL KAYNAKLAR
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
    { url: "https://tr.investing.com/rss/news_301.rss", label: "Investing TR" }
  ];

  // YÜK DENGELEME: 50 Fetch limitine takılmamak için 31 siteyi ikiye bölüyoruz
  const currentMinute = new Date().getMinutes();
  const activeFeeds = (currentMinute % 4) === 0 ? FEEDS.slice(0, 16) : FEEDS.slice(16);
  
  const fetchPromises = activeFeeds.map(async (feed) => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000); 
      const response = await fetch(feed.url, { signal: controller.signal }).catch(() => null);
      clearTimeout(timeoutId);

      if (!response || !response.ok) return [];
      return parseItems(await response.text(), feed.label);
    } catch(e) { return []; }
  });

  const rawResults = await Promise.all(fetchPromises);
  const validItems = rawResults.flat().filter(item => item !== null);

  // EN YENİDEN EN ESKİYE DOĞRU SIRALA (ZAMAN HİYERARŞİSİ)
  validItems.sort((a, b) => b.timestamp - a.timestamp);

  let pushedCount = 0;
  let summary = [];

  for (const item of validItems) {
    if (pushedCount >= 10) break; // MAKSİMUM 10 HABER 
    
    const cacheKey = `sent_${item.id}`;
    const isSent = await redisGet(REDIS_URL, REDIS_TOKEN, cacheKey);

    // EĞER 3 GÜN İÇİNDE ATILDIYSA PAS GEÇ
    if (isSent === "true") continue;

    const success = await sendPush(item, env);
    if (success) {
      await redisSet(REDIS_URL, REDIS_TOKEN, cacheKey, "true"); 
      pushedCount++;
      summary.push(item.kaynak);
      
      // BİLDİRİMLERİN TEK TEK VE SIRALI DÜŞMESİ İÇİN 4 SANİYE BEKLE
      await new Promise(r => setTimeout(r, 4000));
    }
  }

  // Cloudflare Pages JSON Yanıt Formatı
  return new Response(JSON.stringify({ ok: true, count: pushedCount, sources: summary }), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
}
