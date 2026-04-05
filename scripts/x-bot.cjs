const Parser = require('rss-parser');
const http = require('http');

// Render Port Sabitleme
http.createServer((req, res) => {
  res.writeHead(200);
  res.end('World Windows Stable Bot');
}).listen(process.env.PORT || 3000);

const parser = new Parser({ headers: { 'User-Agent': 'Mozilla/5.0' } });
let postedUrls = [];

async function sendPushNotification(title, targetUrl) {
  try {
    const response = await fetch("https://onesignal.com/api/v1/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        // ANAHTARINI BURAYA DİREKT YAZDIM:
        "Authorization": "Basic os_v2_app_jq6rs52p7jbcpbtfowh6g3goonqzniep6z3uvcmxxtqkeizan3jquder72evprtidvzp3bxdlb7mjgqmsozsbs4js7vqg4hxih7j5fi"
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
    console.log(`📡 OneSignal Yanıtı: ${JSON.stringify(data)}`);
  } catch (e) { console.error("❌ Hata:", e.message); }
}

async function scanNews() {
  console.log(`🔍 [${new Date().toLocaleTimeString()}] Tarama yapılıyor...`);
  let count = 0;
  for (const feedUrl of ["https://www.ft.com/?format=rss", "https://www.bloomberght.com/rss", "https://www.cnbc.com/id/10000664/device/rss/rss.html"]) {
    try {
      const feed = await parser.parseURL(feedUrl);
      for (const item of feed.items) {
        const link = (item.link || "").trim();
        if (link && !postedUrls.includes(link) && count < 2) {
          await sendPushNotification(item.title, link);
          postedUrls.push(link);
          count++;
          await new Promise(r => setTimeout(r, 5000));
        }
      }
    } catch (e) { console.log("⚠️ Kaynak hatası"); }
  }
}

scanNews();
setInterval(scanNews, 10 * 60 * 1000);
