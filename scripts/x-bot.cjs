const Parser = require('rss-parser');
const http = require('http');

// Render Port Sabitleme
http.createServer((req, res) => {
  res.writeHead(200);
  res.end('World Windows Multi-Source Bot is Active');
}).listen(process.env.PORT || 3000);

const parser = new Parser({ headers: { 'User-Agent': 'Mozilla/5.0' } });
let postedUrls = [];

async function sendPushNotification(title, targetUrl, uniqueId) {
  try {
    const response = await fetch("https://onesignal.com/api/v1/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Authorization": "Basic " + process.env.ONESIGNAL_KEY
      },
      body: JSON.stringify({
        app_id: "4c3d1977-4ffa-4227-8665-758fe36cce73",
        included_segments: ["Total Subscriptions"],
        headings: { "en": "WORLD WINDOWS", "tr": "WORLD WINDOWS" },
        contents: { "en": title, "tr": title },
        url: targetUrl, 
        web_push_topic: uniqueId, 
        android_group: uniqueId   
      })
    });
    const data = await response.json();
    console.log(`📡 OneSignal Yanıtı: ${JSON.stringify(data)}`);
  } catch (e) { console.error("❌ Hata:", e.message); }
}

async function scanNews() {
  console.log(`🔍 [${new Date().toLocaleTimeString()}] Çoklu Kaynak Taraması Başladı...`);
  let count = 0;
  
  // 34 Kaynağın Gerçek RSS/XML Linkleri
  const feeds = [
    "https://www.reutersagency.com/feed/", 
    "https://www.ft.com/?format=rss",
    "https://www.bloomberght.com/rss",
    "https://www.economist.com/finance-and-economics/rss.xml",
    "https://feeds.a.dj.com/rss/RSSWorldNews.xml",
    "https://rss.nytimes.com/services/xml/rss/nyt/World.xml",
    "https://rss.politico.com/politics-news.xml",
    "https://www.aljazeera.com/xml/rss/all.xml",
    "https://www.forbes.com/business/feed/",
    "https://www.barrons.com/rss",
    "https://cointelegraph.com/rss",
    "https://www.coindesk.com/arc/outboundfeeds/rss/",
    "https://gazeteoksijen.com/rss",
    "https://tr.euronews.com/rss",
    "https://www.ntv.com.tr/son-dakika.rss",
    "https://www.sozcu.com.tr/rss/tum-haberler.xml",
    "https://www.foreignaffairs.com/rss.xml",
    "https://asia.nikkei.com/rss/feed/fyira",
    "https://www.scmp.com/rss/91/feed",
    "https://en.yna.co.kr/RSS/news.xml",
    "https://rss.dw.com/rdf/rss-en-world",
    "https://www.france24.com/en/rss",
    "https://www.abc.net.au/news/feed/51120/rss.xml",
    "https://www.cnbc.com/id/10000664/device/rss/rss.html",
    "https://www.theguardian.com/world/rss",
    "https://www.dunya.com/rss",
    "https://www.paraanaliz.com/feed/",
    "https://www.kitco.com/news/rss",
    "https://www.investing.com/rss/news.rss",
    "http://feeds.bbci.co.uk/news/rss.xml",
    "https://www.borsagundem.com.tr/rss",
    "https://www.ekonomim.com/rss",
    "https://tr.investing.com/rss/news.rss",
    "https://www.hisse.net/haber/?feed=rss2"
  ];
  
  for (const feedUrl of feeds) {
    try {
      const feed = await parser.parseURL(feedUrl);
      for (const item of feed.items) {
        const link = (item.link || "").trim();
        
        // HIZLANDIRILMIŞ LİMİT: Tur başına 25 habere kadar gönderim
        if (link && !postedUrls.includes(link) && count < 25) {
          
          const safeTitle = (item.title || "News").slice(0, 50);
          const newsId = Buffer.from(safeTitle).toString('base64').replace(/[^a-zA-Z0-9]/g, "").slice(0, 24);
          
          const targetUrl = `https://www.worldwindows.network/?newsId=${newsId}`;
          
          await sendPushNotification(item.title, targetUrl, newsId);
          
          postedUrls.push(link);
          count++;
          
          // Spam koruması (5 sn)
          await new Promise(r => setTimeout(r, 5000));
        }
      }
    } catch (e) { console.log(`⚠️ Kaynak atlandı (Yanıt yok veya yapısı farklı): ${feedUrl}`); }
  }
  console.log(`✅ Bu turda ${count} yeni haber gönderildi.`);
}

// HIZLANDIRILMIŞ SÜRE: 5 Dakikada bir çalıştır
scanNews();
setInterval(scanNews, 5 * 60 * 1000);
