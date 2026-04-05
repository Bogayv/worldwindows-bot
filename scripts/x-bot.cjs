const Parser = require('rss-parser');
const http = require('http');

// Render Port Sabitleme
http.createServer((req, res) => {
  res.writeHead(200);
  res.end('World Windows Bot is Active');
}).listen(process.env.PORT || 3000);

const parser = new Parser({ headers: { 'User-Agent': 'Mozilla/5.0' } });
let postedUrls = [];

async function sendPushNotification(title, targetUrl) {
  try {
    const response = await fetch("https://onesignal.com/api/v1/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        // ANAHTARI RENDER'DAN ÇEKİP BAŞINA BASIC EKLİYORUZ
        "Authorization": "Basic " + process.env.ONESIGNAL_KEY
      },
      body: JSON.stringify({
        app_id: "4c3d1977-4ffa-4227-8665-758fe36cce73",
        included_segments: ["Total Subscriptions"],
        headings: { "en": "WORLD WINDOWS", "tr": "WORLD WINDOWS" },
        contents: { "en": title, "tr": title },
        url: targetUrl
      })
    });
    const data = await response.json();
    console.log(`📡 Sonuç: ${JSON.stringify(data)}`);
  } catch (e) { console.error("❌ Hata:", e.message); }
}

async function scanNews() {
  console.log(`🔍 [${new Date().toLocaleTimeString()}] Tarama yapılıyor...`);
  let count = 0;
  const feeds = ["https://www.ft.com/?format=rss", "https://www.bloomberght.com/rss", "https://www.cnbc.com/id/10000664/device/rss/rss.html"];
  
  for (const feedUrl of feeds) {
    try {
      const feed = await parser.parseURL(feedUrl);
      for (const item of feed.items) {
        if (item.link && !postedUrls.includes(item.link) && count < 2) {
          await sendPushNotification(item.title, item.link);
          postedUrls.push(item.link);
          count++;
          await new Promise(r => setTimeout(r, 5000));
        }
      }
    } catch (e) { }
  }
}

scanNews();
setInterval(scanNews, 10 * 60 * 1000);
