async function upstashCmd(url, token, cmdArray) {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(cmdArray)
    });
    const data = await res.json();
    return data.result;
  } catch(e) { return null; }
}

async function sendPush(newsItem) {
  const REST_KEY = process.env.ONESIGNAL_REST_API_KEY;
  if (!REST_KEY) return false;
  try {
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
        web_push_topic: newsItem.id,
        android_group: newsItem.id,
        collapse_id: newsItem.id
      })
    });
    return res.ok;
  } catch(e) { return false; }
}

function parseItems(xml, label, feedUrl) {
  const items = [];
  const blocks = xml.match(/<(item|entry)>[\s\S]*?<\/\1>/gi) || [];

  let baseDomain = "";
  try {
    const urlObj = new URL(feedUrl);
    baseDomain = urlObj.protocol + "//" + urlObj.hostname;
  } catch(e) {
    const parts = feedUrl.split('/');
    baseDomain = parts[0] + "//" + parts[2];
  }
  
  for (let i = 0; i < Math.min(blocks.length, 5); i++) {
    const block = blocks[i];
    const titleRaw = ((block.match(/<title[^>]*><!\[CDATA\[([\s\S]*?)\]\]><\/title>/i) || block.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || "").trim();
    const title = titleRaw.replace(/&amp;/g,"&").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&#39;/g,"'").replace(/&quot;/g,'"').trim();
    if (!title) continue;
    
    let link = ((block.match(/<link>([\s\S]*?)<\/link>/i) || block.match(/<link[^>]*href="([^"]+)"/i) || [])[1] || "").replace(/<!\[CDATA\[|\]\]>/g, "").trim();
    if (!link) {
      link = ((block.match(/<guid[^>]*>([\s\S]*?)<\/guid>/i) || [])[1] || "").replace(/<!\[CDATA\[|\]\]>/g, "").trim();
    }

    if (link.startsWith("/")) {
      link = baseDomain + link;
    } else if (!link.startsWith("http")) {
      if (link.startsWith("www.") || link.includes(".com") || link.includes(".net") || link.includes(".tr")) {
        link = "https://" + link.replace(/^www\./, "");
      } else {
        link = baseDomain + "/" + link;
      }
    }

    if (link.includes("bloomberght.com") && !link.includes("www.bloomberght.com")) {
      link = link.replace("bloomberght.com", "www.bloomberght.com");
    }
    link = link.replace(/^http:\/\//i, "https://");

    let pubDateRaw = (block.match(/<pubDate>([\s\S]*?)<\/pubDate>/i) || block.match(/<updated>([\s\S]*?)<\/updated>/i) || block.match(/<dc:date>([\s\S]*?)<\/dc:date>/i) || [])[1];
    let timestamp = Date.now();
    if (pubDateRaw) {
      let cleanDate = pubDateRaw.trim().replace(/\s+[A-Z]{3,5}$/i, "");
      const parsed = Date.parse(cleanDate);
      if (!isNaN(parsed)) { timestamp = parsed > Date.now() ? Date.now() - 3600000 : parsed; }
    }
    
    const id = Buffer.from(title.slice(0,20)).toString("base64").replace(/[^a-zA-Z0-9]/g,"").slice(0,24);
    let imageUrl = block.match(/<media:content[^>]+url="([^"]+)"/i)?.[1] || block.match(/<enclosure[^>]+url="([^"]+)"/i)?.[1] || "https://worldwindows.network/logo.jpeg";
    
    let detail = title;
    let descMatch = block.match(/<description[^>]*><!\[CDATA\[([\s\S]*?)\]\]><\/description>/i) || block.match(/<description[^>]*>([\s\S]*?)<\/description>/i);
    if (descMatch && descMatch[1]) detail = descMatch[1].replace(/<[^>]*>?/gm, '').trim();

    items.push({ id, baslik: title, detay: detail, kaynak: label, url: link, img: imageUrl, timestamp });
  }
  return items;
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
    { url: "https://tr.investing.com/rss/news_301.rss", label: "Investing TR" }
  ];

  // 1. ESKİ HAVUZU GÜVENLE OKU
  let oldPool = [];
  const oldRaw = await upstashCmd(REDIS_URL, REDIS_TOKEN, ["GET", "ww_global_pool"]);
  if (oldRaw) {
    try {
      let temp = typeof oldRaw === "string" ? JSON.parse(oldRaw) : oldRaw;
      oldPool = typeof temp === "string" ? JSON.parse(temp) : temp;
      if (!Array.isArray(oldPool)) oldPool = [];
    } catch(e) { oldPool = []; }
  }

  // 2. YENİ HABERLERİ ÇEK
  const fetchPromises = FEEDS.map(async (f) => {
    try {
      const r = await fetch(f.url, { signal: AbortSignal.timeout(4500) });
      if (!r.ok) return [];
      return parseItems(await r.text(), f.label, f.url);
    } catch(e) { return []; }
  });
  const rawResults = await Promise.all(fetchPromises);
  const freshItems = rawResults.flat();

  // 3. HAVUZLARI BİRLEŞTİR VE ZAMANA GÖRE DİZ (600 Habere Kadar)
  const combinedMap = new Map();
  oldPool.forEach(item => combinedMap.set(item.id, item));
  freshItems.forEach(item => combinedMap.set(item.id, item));
  
  const finalPool = Array.from(combinedMap.values())
    .sort((a,b) => b.timestamp - a.timestamp)
    .slice(0, 600);

  // 4. BİRLEŞMİŞ HAVUZU ÇÖKMEYECEK ŞEKİLDE KAYDET (3 Günlük Süre = 259200 sn)
  await upstashCmd(REDIS_URL, REDIS_TOKEN, ["SET", "ww_global_pool", JSON.stringify(finalPool), "EX", 259200]);

  // 5. BİLDİRİMLERİ SADECE YENİ DÜŞEN HABERLERDEN AT
  let pushed = 0;
  const newestFreshItems = freshItems.sort((a,b) => b.timestamp - a.timestamp);
  
  for (const item of newestFreshItems.slice(0, 15)) {
    if (pushed >= 10) break;
    const isSent = await upstashCmd(REDIS_URL, REDIS_TOKEN, ["GET", `sent_${item.id}`]);
    if (isSent === "true") continue;
    
    const pushOk = await sendPush(item);
    if (pushOk) {
      await upstashCmd(REDIS_URL, REDIS_TOKEN, ["SET", `sent_${item.id}`, "true", "EX", 259200]);
      pushed++;
      await new Promise(r => setTimeout(r, 4000));
    }
  }

  return res.status(200).json({ ok: true, poolSize: finalPool.length, pushed });
}
