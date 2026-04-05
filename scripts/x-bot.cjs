const Parser = require('rss-parser');
const http = require('http');

// Render Port Sabitleme
http.createServer((req, res) => {
  res.writeHead(200);
  res.end('World Windows Stable Bot');
}).listen(process.env.PORT || 3000);

const ONESIGNAL_APP_ID = "4c3d1977-4ffa-4227-8665-758fe36cce73";
// BURAYA SADECE ANAHTARINI KOY (Örn: NmY0Z...)
const MY_KEY = "os_v2_app_jq6rs52p7jbcpbtfowh6g3gooowupw43jhbe3onxaetgmdck6ys24vaq2rck3fxs7e4vaajz63b5val3oepfgutqq2l5b7ljkgatifa";

const RSS_FEEDS = [
  "https://www.ft.com/?format=rss",
  "https://www.bloomberght.com/rss",
  "https://www.cnbc.com/id/10000664/device/rss/rss.html"
];

const parser = new Parser({ headers: { 'User-Agent': 'Mozilla/5.0' } });
let postedUrls = [];

async function sendPushNotification(title, targetUrl) {
  try {
    const response = await fetch("https://onesignal.com/api/v1/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        // HATA BURADAYDI: "Basic " ifadesini ve boşluğu buraya sabitledim.
        "Authorization": "Basic " + MY_KEY.trim()
      },
      body: JSON.stringify({
        app_id: ONESIGNAL_APP_ID,
        included_segments: ["Total Subscriptions"],
        headings: { "en": "WORLD WINDOWS", "tr": "WORLD WINDOWS" },
        contents: { "en": title, "tr": title },
        url: targetUrl
      })
    });
    const data = await response.json();
    console.log(`📡 OneSignal Yanıtı: ${JSON.stringify(data)}`);
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
        // Spam koruması: Açılışta sadece en taze 2 haberi gönder
        if (link && !postedUrls.includes(link) && count < 2) {
          await sendPushNotification(item.title, link);
          postedUrls.push(link);
          count++;
          await new Promise(r => setTimeout(r, 5000));
        }
      }
    } catch (e) { console.log(`⚠️ Kaynak Hatası: ${feedUrl}`); }
  }
}

scanNews();
setInterval(scanNews, 10 * 60 * 1000);
