const Parser = require('rss-parser');
const fs = require('fs');
const path = require('path');

// --- BİLDİRİM AYARLARI ---
const ONESIGNAL_APP_ID = "4c3d1977-4ffa-4227-8665-758fe36cce73";
const ONESIGNAL_REST_KEY = "os_v2_app_jq6rs52p7jbcpbtfowh6g3goonqzniep6z3uvcmxxtqkeizan3jquder72evprtidvzp3bxdlb7mjgqmsozsbs4js7vqg4hxih7j5fi";

const RSS_FEEDS = [
  "https://www.ft.com/?format=rss",
  "https://www.bloomberght.com/rss",
  "https://www.reutersagency.com/feed/",
  "https://www.cnbc.com/id/10000664/device/rss/rss.html"
];

const POSTED_FILE = path.join(__dirname, 'posted.json');
const parser = new Parser();

// Eski haberleri hafızaya al
let postedUrls = [];
if (fs.existsSync(POSTED_FILE)) {
  try {
    postedUrls = JSON.parse(fs.readFileSync(POSTED_FILE, 'utf8'));
  } catch (e) { postedUrls = []; }
}

// Bildirim Gönderme (Hedef Link Artık Kendi Siten)
async function sendPushNotification(title, targetUrl) {
  try {
    const response = await fetch("https://onesignal.com/api/v1/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Authorization": `Basic ${ONESIGNAL_REST_KEY}`
      },
      body: JSON.stringify({
        app_id: ONESIGNAL_APP_ID,
        headings: { "en": "WORLD WINDOWS", "tr": "DÜNYA PENCERESİ" },
        contents: { "en": title, "tr": title },
        url: targetUrl, // Orijinal kaynak yerine senin sitene giden link!
        included_segments: ["Total Subscriptions"]
      })
    });
    const data = await response.json();
    if (!data.errors) {
      console.log(`✅ Bildirim Gitti! -> ${title.substring(0,40)}...`);
    }
  } catch (e) {
    console.error("❌ OneSignal Hatası:", e.message);
  }
}

// Tarama Motoru
async function scanNews() {
  console.log(`\n🔍 [${new Date().toLocaleTimeString()}] Haberler taranıyor...`);
  let newItemsFound = 0;

  for (const feedUrl of RSS_FEEDS) {
    try {
      const feed = await parser.parseURL(feedUrl);
      for (const item of feed.items) {
        const link = (item.link || "").trim();
        const title = item.title || "";
        
        if (link && title && !postedUrls.includes(link)) {
          
          // SİTENİN FRONTEND'İ İLE BİREBİR AYNI ID OLUŞTURMA MANTIĞI
          const safeTitle = title.slice(0, 50);
          const newsId = Buffer.from(safeTitle, 'utf-8').toString('base64').replace(/[^a-zA-Z0-9]/g, "").slice(0, 24);
          
          // TRAFİĞİ SİTENE ÇEKEN LİNK
          const mySiteUrl = `https://worldwindows.network/?newsId=${newsId}`;

          await sendPushNotification(title, mySiteUrl);
          postedUrls.push(link);
          newItemsFound++;
          
          // Tek seferde insanları bildirime boğmamak için limit
          if (newItemsFound >= 3) break; 
        }
      }
    } catch (e) {
      console.log(`⚠️ RSS okunamadı: ${feedUrl}`);
    }
  }

  // Hafızayı kaydet (Son 150 haberi tutarak şişmesini engelle)
  fs.writeFileSync(POSTED_FILE, JSON.stringify(postedUrls.slice(-150)));
  console.log(`🏁 Tarama bitti. ${newItemsFound > 0 ? newItemsFound + ' yeni haber gönderildi.' : 'Yeni haber yok.'}`);
}

// --- OTOMASYON DÖNGÜSÜ ---
console.log("=========================================");
console.log("🤖 WORLD WINDOWS OTO-ROBOT BAŞLADI!");
console.log("Her 15 dakikada bir otomatik tarama yapacak.");
console.log("Kapatmak için terminalde CTRL + C yapabilirsin.");
console.log("=========================================\n");

// 1. Robotu açar açmaz ilk taramayı başlat
scanNews();

// 2. Ardından her 15 dakikada bir (15 * 60 * 1000 milisaniye) tekrarla
setInterval(scanNews, 15 * 60 * 1000);
