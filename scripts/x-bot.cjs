const Parser = require('rss-parser');
const http = require('http');

http.createServer((req, res) => { res.writeHead(200); res.end('Bot Active'); }).listen(process.env.PORT || 3000);

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
        "Authorization": `Basic ${ONESIGNAL_REST_KEY}`
      },
      body: JSON.stringify({
        app_id: ONESIGNAL_APP_ID,
        // BURASI DEĞİŞTİ: En garanti hedefleme yöntemi
        included_segments: ["Total Subscriptions"], 
        isAnyWeb: true, 
        headings: { "en": "WORLD WINDOWS", "tr": "WORLD WINDOWS" },
        contents: { "en": title, "tr": title },
        url: targetUrl,
        web_push_topic: newsId
      })
    });
    const resData = await response.json();
    console.log(`✅ OneSignal Çıkışı: ${JSON.stringify(resData)}`);
  } catch (e) { console.error("❌ Hata:", e.message); }
}

async function scanNews() {
  console.log(`🔍 [${new Date().toLocaleTimeString()}] Tarama yapılıyor...`);
  for (const feedUrl of RSS_FEEDS) {
    try {
      const feed = await parser.parseURL(feedUrl);
      for (const item of feed.items) {
        const link = (item.link || "").trim();
        if (link && !postedUrls.includes(link)) {
          const safeTitle = (item.title || "News").slice(0, 50);
          const newsId = Buffer.from(safeTitle).toString('base64').replace(/[^a-zA-Z0-9]/g, "").slice(0, 24);
          await sendPushNotification(item.title, `https://worldwindows.network/?newsId=${newsId}`, newsId);
          postedUrls.push(link);
          await new Promise(r => setTimeout(r, 2000));
        }
      }
    } catch (e) { console.log(`⚠️ Hata: ${feedUrl}`); }
  }
  if (postedUrls.length > 200) postedUrls = postedUrls.slice(-100);
}

scanNews();
setInterval(scanNews, 5 * 60 * 1000);
