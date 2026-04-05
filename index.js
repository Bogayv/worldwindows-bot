const Redis = require('ioredis');
const axios = require('axios');

// --- YAPILANDIRMA ---
const CONFIG = {
    // Upstash'ten aldığın TCP bağlantı adresi
    // Render Environment Variables (UPSTASH_REDIS_REST_URL ve TOKEN) üzerinden otomatik kurarız
    REDIS_URL: process.env.UPSTASH_REDIS_REST_URL.replace("https://", "rediss://") + ":" + process.env.UPSTASH_REDIS_REST_TOKEN + "@" + process.env.UPSTASH_REDIS_REST_URL.split("//")[1],
    ONESIGNAL_APP_ID: "4c3d1977-4ffa-4227-8665-758fe36cce73",
    ONESIGNAL_KEY: process.env.ONESIGNAL_KEY,
    FETCH_INTERVAL: 2 * 60 * 1000, 
    BATCH_LIMIT: 10,
    EXPIRE_TIME: 259200
};

const redis = new Redis(CONFIG.REDIS_URL);

async function sendNotification(news) {
    // Senin haber yapındaki ID'yi veya başlığı benzersiz kimlik olarak kullanıyoruz
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
                contents: { en: news.baslik || news.title, tr: news.baslik || news.title },
                // KULLANICIYI SENİN SİTENE ÇEKEN LİNK
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
            console.log(`✅ Trafik Yönlendirildi: ${news.baslik || news.title}`);
            return true;
        }
    } catch (error) {
        console.error("❌ OneSignal Hatası:", error.response?.data || error.message);
    }
    return false;
}

async function startBot() {
    console.log(`📡 Robot Aktif: Doğrudan Upstash Redis (sincere-primate) taranıyor...`);
    
    try {
        // Sitenin Redis'e kaydettiği haber havuzunu çekiyoruz
        // Siten muhtemelen 'ww_news_pool' veya benzeri bir isimle kaydediyor.
        // Eğer çekemezse API'ye (Cache-Buster ile) yedek olarak bakar.
        
        let allNews = [];
        const redisData = await redis.get("latest_news_pool"); // Genel isimlendirme
        
        if (redisData) {
            allNews = JSON.parse(redisData);
        } else {
            // Redis boşsa veya anahtar farklıysa API'den taze çekim yap
            const freshUrl = `https://worldwindows.network/api/news?_t=${Date.now()}`;
            const response = await axios.get(freshUrl, { headers: { 'Cache-Control': 'no-cache' } }); 
            allNews = response.data.news || response.data;
        }

        console.log(`📥 Toplam ${allNews.length} haber analiz ediliyor...`);
        
        let count = 0;
        for (const news of allNews) {
            if (count >= CONFIG.BATCH_LIMIT) break;
            const sent = await sendNotification(news);
            if (sent) {
                count++;
                await new Promise(resolve => setTimeout(resolve, 5000));
            }
        }
        console.log(`🔄 Tur tamamlandı. Gönderilen: ${count}`);
    } catch (error) {
        console.error("⚠️ Robot Hatası:", error.message);
    }

    setTimeout(startBot, CONFIG.FETCH_INTERVAL);
}

startBot();
