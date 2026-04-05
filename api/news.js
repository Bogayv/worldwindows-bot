// OneSignal Bildirim Fırlatma Motoru
async function sendTerminalPushNotification(newsItem) {
  const ONESIGNAL_APP_ID = "4c3d1977-4ffa-4227-8665-758fe36cce73";
  const ONESIGNAL_REST_API_KEY = process.env.ONESIGNAL_REST_API_KEY;

  if (!ONESIGNAL_REST_API_KEY) {
    console.error("KRİTİK HATA: Vercel'de ONESIGNAL_REST_API_KEY tanımlı değil!");
    return;
  }

  const notificationBody = {
    app_id: ONESIGNAL_APP_ID,
    included_segments: ["Subscribed Users"],
    headings: { en: `🚨 ${newsItem.kaynak.toUpperCase()}` },
    contents: { en: newsItem.baslik },
    url: `https://worldwindows.network/?newsId=${newsItem.id}`
  };

  try {
    const response = await fetch("https://onesignal.com/api/v1/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Authorization": `Basic ${ONESIGNAL_REST_API_KEY}`
      },
      body: JSON.stringify(notificationBody)
    });
    const data = await response.json();
    if (response.ok) {
      console.log(`✅ Bildirim Fırlatıldı: [${newsItem.id}] - Alıcı: ${data.recipients}`);
    } else {
      console.error(`❌ Bildirim Gönderilemedi:`, data.errors);
    }
  } catch (error) {
    console.error("❌ OneSignal API Bağlantı Hatası:", error);
  }
}

export default async function handler(req, res) {
  const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL?.replace(/"/g, "").trim();
  const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN?.replace(/"/g, "").trim();

  if (!REDIS_URL || !REDIS_TOKEN) {
    return res.status(500).json({ error: "Upstash ayarlari eksik! Vercel panelini kontrol edin." });
  }

  const urls = [
    "https://www.reutersagency.com/feed/",
    "https://rss.nytimes.com/services/xml/rss/nyt/Politics.xml",
    "https://www.aljazeera.com/xml/rss/all.xml",
    "https://cointelegraph.com/rss",
    "https://www.bloomberght.com/rss",
    "https://www.sozcu.com.tr/feeds-son-dakika",
    "https://www.ntv.com.tr/ekonomi.rss"
  ];

  try {
    let newsPool = [];
    
    // Haberleri tek tek tara, hata vereni atla
    for (const url of urls) {
      try {
        const response = await fetch(url, { signal: AbortSignal.timeout(4000) });
        const xmlText = await response.text();
        const items = xmlText.match(/<item[\s\S]*?<\/item>/g) || [];
        
        items.slice(0, 8).forEach(item => {
          const title = (item.match(/<title[^>]*>([\s\S]*?)<\/title>/) || [])[1] || "News";
          const link = (item.match(/<link[^>]*>([\s\S]*?)<\/link>/) || [])[1] || "#";
          const cleanTitle = title.replace(/<!\[CDATA\[|\]\]>/g, "").trim();
          
          if (cleanTitle !== "News") {
            newsPool.push({
              id: Buffer.from(cleanTitle.slice(0,20)).toString('base64').replace(/[^a-zA-Z0-9]/g, ""),
              baslik: cleanTitle,
              url: link.trim(),
              timestamp: Date.now(),
              kaynak: url.includes("reuters") ? "Reuters" : url.includes("sozcu") ? "Sözcü" : "Global"
            });
          }
        });
      } catch (e) {
        console.log(`${url} taranamadi, atliyorum...`);
        continue; 
      }
    }

    if (newsPool.length === 0) {
       return res.status(200).json({ success: true, message: "Yeni haber bulunamadı." });
    }

    // Redis'e Kaydet (JSON formatinda gonderiyoruz)
    const redisResponse = await fetch(`${REDIS_URL}/set/latest_news`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${REDIS_TOKEN}` },
      body: JSON.stringify(newsPool)
    });

    if (!redisResponse.ok) {
      const errText = await redisResponse.text();
      throw new Error(`Redis Hatasi: ${errText}`);
    }

    // --- ONESIGNAL BİLDİRİM KONTROLÜ VE FIRLATMA ---
    try {
      const lastIdRes = await fetch(`${REDIS_URL}/get/last_pushed_id`, {
        headers: { Authorization: `Bearer ${REDIS_TOKEN}` }
      });
      const lastIdData = await lastIdRes.json();
      const lastPushedId = lastIdData.result;

      // Havuzdaki en taze haber
      const tazeHaber = newsPool[0];

      // Eğer bu haberin ID'si bir önceki gönderdiğimiz ID ile aynı değilse (YENİ haber)
      if (tazeHaber && tazeHaber.id !== lastPushedId) {
        await sendTerminalPushNotification(tazeHaber);
        
        // Spam kilidi: Gönderilen haberin ID'sini Redis'e kaydet
        await fetch(`${REDIS_URL}/set/last_pushed_id`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${REDIS_TOKEN}` },
          body: `"${tazeHaber.id}"`
        });
      }
    } catch (pushErr) {
      console.error("Bildirim motoru çalışırken hata:", pushErr);
    }

    return res.status(200).json({ 
      success: true, 
      count: newsPool.length, 
      message: "Haberler Redis'e ulasti ve Bildirim Motoru çalisti!" 
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
