const Parser = require('rss-parser');
const http = require('http');

// 1. RENDER PORT HATASINI ÇÖZEN KISIM
const server = http.createServer((req, res) => {
  res.writeHead(200);
  res.end('World Windows Bot is Active');
});
server.listen(process.env.PORT || 3000);

// 2. KİMLİK BİLGİLERİ (REST KEY'İ DİKKATLİ KONTROL EDİN)
const ONESIGNAL_APP_ID = "4c3d1977-4ffa-4227-8665-758fe36cce73";
const ONESIGNAL_REST_KEY = "os_v2_app_jq6rs52p7jbcpbtfowh6g3goonqzniep6z3uvcmxxtqkeizan3jquder72evprtidvzp3bxdlb7mjgqmsozsbs4js7vqg4hxih7j5fi";

const RSS_FEEDS = [
  "https://www.ft.com/?format=rss",
  "https://www.bloomberght.com/rss",
  "https://www.cnbc.com/id/10000664/device/rss/rss.html"
];

const parser = new Parser({ headers: { 'User-Agent': 'Mozilla/5.0' } });
let postedUrls = [];

async function sendPushNotification(title, targetUrl, newsId) {
  try {
    const response = await fetch("https://onesignal.com/api/v1/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Authorization": `Basic ${ONESIGNAL_REST_KEY}` // Anahtarın başına 'Basic ' eklemeyi unutma
      },
      body: JSON.stringify({
        app_id: ONESIGNAL_APP_ID,
        included_segments: ["Total Subscriptions"],
        headings: { "en": "WORLD WINDOWS", "tr": "WORLD WINDOWS" },
        contents: { "en": title, "tr": title },
        url: targetUrl,
        web_push_topic: newsId
      })
    });
    const resData = await response.json();
    console.log(`📡 OneSignal Yanıtı: ${JSON.stringify(resData)}`);
  } catch (e) { console.error("❌ Hata:", e.message); }
}

async function scanNews() {
  console.log(`🔍 [${new Date().toLocaleTimeString()}] Tarama yapılıyor...`);
  let count = 0;
  for (const feedUrl of RSS_FEEDS) {
    try {
      const feed = await parser.parseURL(feedUrl);
      for (const item of feed.items) {
        const link = (item.link || "").trim();
        // Hafızadaki linkleri gönderme ve tur başına max 3 haber fırlat
        if (link && !postedUrls.includes(link) && count < 3) {
          const safeTitle = (item.title || "News").slice(0, 50);
          const newsId = Buffer.from(safeTitle).toString('base64').replace(/[^a-zA-Z0-9]/g, "").slice(0, 24);
          await sendPushNotification(item.title, `https://worldwindows.network/?newsId=${newsId}`, newsId);
          postedUrls.push(link);
          count++;
          await new Promise(r => setTimeout(r, 5000)); // OneSignal'ı yormamak için 5 saniye mola
        }
      }
    } catch (e) { console.log(`⚠️ Hata: ${feedUrl}`); }
  }
}

// 10 DAKİKADA BİR (Daha stabil olması için arayı biraz açtık)
scanNews();
setInterval(scanNews, 10 * 60 * 1000);
