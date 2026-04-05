const axios = require('axios');
const Redis = require('ioredis');

// --- YAPILANDIRMA ---
const CONFIG = {
    // Upstash Redis Bağlantısı (Render Environment Variables üzerinden)
    REDIS_URL: process.env.UPSTASH_REDIS_REST_URL.replace("https://", "rediss://") + ":" + process.env.UPSTASH_REDIS_REST_TOKEN + "@" + process.env.UPSTASH_REDIS_REST_URL.split("//")[1],
    ONESIGNAL_APP_ID: "4c3d1977-4ffa-4227-8665-758fe36cce73", 
    ONESIGNAL_KEY: process.env.ONESIGNAL_KEY,
    FETCH_INTERVAL: 2 * 60 * 1000, // 2 Dakikada Bir Tarama
    BATCH_LIMIT: 10,               // Tur başına 10 haber sınırı
    EXPIRE_TIME: 259200            // 3 Günlük Hafıza
};

const redis = new Redis(CONFIG.REDIS_URL);

async function sendNotification(news) {
    const newsId = news.id || news._id;
    const cacheKey = `sent_news:${newsId}`;

    const isSent = await redis.get(cacheKey);
    if (isSent) return false;

    try {
        const response = await axios.post(
            "https://onesignal.com/api/v1/notifications",
            {
                app_id: CONFIG.ONESIGNAL_APP_ID,
                included_segments: ["All"],
                headings: { en: "World Windows - Son Dakika", tr: "World Windows - Son Dakika" },
                contents: { en: news.title || news.baslik, tr: news.title || news.baslik },
                // KRİTİK: Detay sayfasına doğrudan uçuran ve cache'i bypass eden link yapısı
                url: `https://worldwindows.network/news-detail/${newsId}?utm_source=push&utm_medium=notification&t=${Date.now()}`
            },
            {
                headers: {
                    "Content-Type": "application/json; charset=utf-8",
                    "Authorization": `Basic ${CONFIG.ONESIGNAL_KEY}`
                }
            }
        );

        if (response.data.id) {
            await redis.set(cacheKey, "true", "EX", CONFIG.EXPIRE_TIME);
            console.log(`✅ Gönderildi: ${news.title || news.baslik}`);
            return true;
        }
    } catch (error) {
        console.error("❌ OneSignal Hatası:", error.response?.data || error.message);
    }
    return false;
}

async function startBot() {
    console.log(`📡 Haber taraması başlatıldı... (Her ${CONFIG.FETCH_INTERVAL / 60000} dakikada bir)`);
    
    try {
        // Vercel'in bayat haber vermesini engelleyen tazeleyici link
        const freshUrl = `https://worldwindows.network/api/news?_t=${Date.now()}_${Math.random()}`;
        const response = await axios.get(freshUrl, {
            headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            }
        }); 
        
        const allNews = response.data.news || response.data;
        console.log(`📥 Kaynaktan toplam ${allNews.length} haber okundu. Kontrol ediliyor...`);
        
        let count = 0;
        for (const news of allNews) {
            if (count >= CONFIG.BATCH_LIMIT) break;
            
            const sent = await sendNotification(news);
            if (sent) {
                count++;
                // OneSignal'ı darlamamak için 5 saniye bekleme süresi
                await new Promise(resolve => setTimeout(resolve, 5000));
            }
        }
        console.log(`🔄 Tur tamamlandı. ${count} yeni haber gönderildi.`);
    } catch (error) {
        console.error("⚠️ Haber çekme hatası:", error.message);
    }

    setTimeout(startBot, CONFIG.FETCH_INTERVAL);
}

startBot();
