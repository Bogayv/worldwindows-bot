const Redis = require('ioredis');
const axios = require('axios');

// UPSTASH'in tam istediği format: rediss://default:TOKEN@HOST:6379
const rawHost = (process.env.UPSTASH_REDIS_REST_URL || "").replace("https://", "");
const token = process.env.UPSTASH_REDIS_REST_TOKEN || "";
const REDIS_URI = `rediss://default:${token}@${rawHost}:6379`;

const CONFIG = {
    REDIS_URL: REDIS_URI,
    ONESIGNAL_APP_ID: "4c3d1977-4ffa-4227-8665-758fe36cce73",
    ONESIGNAL_KEY: process.env.ONESIGNAL_KEY,
    FETCH_INTERVAL: 2 * 60 * 1000, 
    BATCH_LIMIT: 10,
    EXPIRE_TIME: 259200
};

const redis = new Redis(CONFIG.REDIS_URL);

// HATA YAKALAYICI: Redis bağlanamazsa program çökmesin, sadece uyarı versin
redis.on('error', (err) => {
    console.error('❌ Redis Bağlantı Uyarısı:', err.message);
});

async function sendNotification(news) {
    if (!news || !news.baslik) return false;
    
    const newsId = news.id || news._id;
    const cacheKey = `sent_news:${newsId}`;
    
    try {
        const isSent = await redis.get(cacheKey);
        if (isSent) return false;

        const response = await axios.post("https://onesignal.com/api/v1/notifications", {
            app_id: CONFIG.ONESIGNAL_APP_ID,
            included_segments: ["All"],
            headings: { en: "World Windows", tr: "World Windows" },
            contents: { en: news.baslik || news.title, tr: news.baslik || news.title },
            url: `https://worldwindows.network/news-detail/${newsId}?utm_source=push&t=${Date.now()}`
        }, {
            headers: { 
                "Content-Type": "application/json; charset=utf-8",
                "Authorization": `Basic ${CONFIG.ONESIGNAL_KEY}` 
            }
        });

        if (response.data.id) {
            await redis.set(cacheKey, "true", "EX", CONFIG.EXPIRE_TIME);
            console.log(`✅ Bildirim Fırlatıldı: ${news.baslik || news.title}`);
            return true;
        }
    } catch (e) { 
        console.error("❌ OneSignal Hatası:", e.response?.data || e.message); 
    }
    return false;
}

async function startBot() {
    console.log(`[${new Date().toLocaleTimeString()}] 📡 Kaynak Taranıyor...`);
    try {
        const freshUrl = `https://worldwindows.network/api/news?_t=${Date.now()}_${Math.random()}`;
        const response = await axios.get(freshUrl, { 
            headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' } 
        }); 
        
        const allNews = response.data.news || response.data;

        // EMNİYET KEMERİ: Eğer gelen veri liste değilse çökmeyi engelle ("allNews is not iterable" hatası çözümü)
        if (!Array.isArray(allNews)) {
            console.log("⚠️ Veri şu an dizi formatında değil. Bir sonraki tur bekleniyor...");
            setTimeout(startBot, CONFIG.FETCH_INTERVAL);
            return;
        }

        console.log(`📥 Siteden ${allNews.length} taze haber okundu. Kontrol ediliyor...`);
        
        let count = 0;
        for (const news of allNews) {
            if (count >= CONFIG.BATCH_LIMIT) break;
            const sent = await sendNotification(news);
            if (sent) { 
                count++; 
                await new Promise(r => setTimeout(r, 5000)); 
            }
        }
        console.log(`✅ Tur bitti. ${count} yeni bildirim gönderildi.`);
    } catch (e) { 
        console.error("⚠️ Robot Hatası:", e.message); 
    }
    setTimeout(startBot, CONFIG.FETCH_INTERVAL);
}

startBot();
