const Parser = require('rss-parser');
const http = require('http');

const server = http.createServer((req, res) => {
  res.writeHead(200);
  res.end('World Windows Pro Bot is Active');
});
server.listen(process.env.PORT || 3000);

const ONESIGNAL_APP_ID = "4c3d1977-4ffa-4227-8665-758fe36cce73";
const ONESIGNAL_REST_KEY = "os_v2_app_jq6rs52p7jbcpbtfowh6g3goonqzniep6z3uvcmxxtqkeizan3jquder72evprtidvzp3bxdlb7mjgqmsozsbs4js7vqg4hxih7j5fi";

// Kaynakları zenginleştirdik
const RSS_FEEDS = [
  "https://www.ft.com/?format=rss",
  "https://www.bloomberght.com/rss",
  "https://www.cnbc.com/id/10000664/device/rss/rss.html",
  "https://feeds.a.dj.com/rss/RSSMarketsMain.xml", // Wall Street Journal
  "https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=15839069", // CNBC Investing
  "https://www.investing.com/rss/news.rss" // Investing.com
];

const parser = new Parser({ headers: { 'User-Agent': 'Mozilla/5.0' } });
let postedUrls = [];

async function sendPushNotification(title, targetUrl, newsId) {
  try {
    await fetch("https://onesignal.com/api/v1/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Authorization": `Basic ${ONESIGNAL_REST_KEY}`
      },
      body: JSON.stringify({
        app_id: ONESIGNAL_APP_ID,
        headings: { "en": "WORLD WINDOWS", "tr": "WORLD WINDOWS" },
        contents: { "en": title, "tr": title },
        url: targetUrl, 
        web_push_topic: newsId,
        included_segments: ["Total Subscriptions"]
      })
    });
    console.log(`🚀 JET GÖNDERİM: ${title.substring(0,40)}...`);
  } catch (e) { console.error("❌ Hata:", e.message); }
}

async function scanNews() {
  console.log(`⚡️ [${new Date().toLocaleTimeString()}] Seri tarama başladı...`);
  let totalSent = 0;
  for (const feedUrl of RSS_FEEDS) {
    try {
      const feed = await parser.parseURL(feedUrl);
      for (const item of feed.items) {
        const link = (item.link || "").trim();
        if (link && !postedUrls.includes(link)) {
          const safeTitle = (item.title || "News").slice(0, 50);
          const newsId = Buffer.from(safeTitle).toString('base64').replace(/[^a-zA-Z0-9]/g, "").slice(0, 24);
          const mySiteUrl = `https://worldwindows.network/?newsId=${newsId}`;
          
          await sendPushNotification(item.title, mySiteUrl, newsId);
          postedUrls.push(link);
          totalSent++;
          await new Promise(r => setTimeout(r, 1000)); // Hızlı gönderim
        }
      }
    } catch (e) { console.log(`⚠️ Kaynak beklemede: ${feedUrl}`); }
  }
  if (postedUrls.length > 300) postedUrls = postedUrls.slice(-200);
}

// 2 DAKİKADA BİR TARAMA (Ultra Hız)
scanNews();
setInterval(scanNews, 2 * 60 * 1000);
