const Parser = require('rss-parser');
const http = require('http');

// Render Port Sabitleme
http.createServer((req, res) => {
  res.writeHead(200);
  res.end('World Windows Turbo Bot is Active');
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
        url: targetUrl, // DOĞRUDAN SENİN SİTENDEKİ HABER DETAY SAYFASI
        web_push_topic: uniqueId, // BİLDİRİMLERİN EZİLMESİNİ ENGELLER
        android_group: uniqueId   // BİLDİRİMLERİN EZİLMESİNİ ENGELLER
      })
    });
    const data = await response.json();
    console.log(`📡 OneSignal Yanıtı: ${JSON.stringify(data)}`);
  } catch (e) { console.error("❌ Hata:", e.message); }
}

async function scanNews() {
  console.log(`🔍 [${new Date().toLocaleTimeString()}] Turbo Tarama Başladı...`);
  let count = 0;
  const feeds = [
    "https://www.ft.com/?format=rss", 
    "https://www.bloomberght.com/rss", 
    "https://www.cnbc.com/id/10000664/device/rss/rss.html"
  ];
  
  for (const feedUrl of feeds) {
    try {
      const feed = await parser.parseURL(feedUrl);
      for (const item of feed.items) {
        const link = (item.link || "").trim();
        
        // 10 Habere kadar gönderim
        if (link && !postedUrls.includes(link) && count < 10) {
          
          // Sitenin beklediği Base64 formatındaki newsId'yi tam uyumlu şekilde üretiyoruz
          const safeTitle = (item.title || "News").slice(0, 50);
          const newsId = Buffer.from(safeTitle).toString('base64').replace(/[^a-zA-Z0-9]/g, "").slice(0, 24);
          
          // Trafiği senin sitene çekecek ve spesifik haberi açacak nihai URL
          const targetUrl = `https://www.worldwindows.network/?newsId=${newsId}`;
          
          // Haberi Gönder
          await sendPushNotification(item.title, targetUrl, newsId);
          
          postedUrls.push(link);
          count++;
          
          // Spam koruması
          await new Promise(r => setTimeout(r, 5000));
        }
      }
    } catch (e) { console.log("⚠️ Kaynak hatası"); }
  }
  console.log(`✅ Bu turda ${count} yeni haber gönderildi.`);
}

scanNews();
setInterval(scanNews, 2 * 60 * 1000);
