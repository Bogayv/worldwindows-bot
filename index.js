import axios from 'axios';
import Redis from 'ioredis';
import http from 'http';

const rawHost = (process.env.UPSTASH_REDIS_REST_URL || "").replace("https://", "");
const token = process.env.UPSTASH_REDIS_REST_TOKEN || "";

const CONFIG = {
    REDIS_URL: `rediss://default:${token}@${rawHost}:6379`,
    ONESIGNAL_APP_ID: "4c3d1977-4ffa-4227-8665-758fe36cce73",
    ONESIGNAL_KEY: process.env.ONESIGNAL_KEY,
    FETCH_INTERVAL: 1.5 * 60 * 1000, // 1.5 Dakikaya indirildi (Hızlandık)
    BATCH_LIMIT: 30,                // 10'dan 30'a çıkarıldı (Görüş alanı genişledi)
    EXPIRE_TIME: 259200
};

const redis = new Redis(CONFIG.REDIS_URL);
redis.on('error', (err) => console.error('❌ Redis Hatası:', err.message));

async function sendNotification(news) {
    const newsId = news.id || news._id || news.guid;
    if (!newsId) return false;

    const cacheKey = `sent_news:${newsId}`;

    try {
        const isSent = await redis.get(cacheKey);
        if (isSent) return false;

        const response = await axios.post(
            "https://onesignal.com/api/v1/notifications",
            {
                app_id: CONFIG.ONESIGNAL_APP_ID,
                included_segments: ["All"],
                headings: { en: "World Windows - Son Dakika", tr: "World Windows - Son Dakika" },
                contents: { en: news.title || news.baslik, tr: news.title || news.baslik },
                url: `https://worldwindows.network/news-detail/${newsId}?utm_source=push&t=${Date.now()}`
            },
            {
                headers: {
                    "Content-Type": "application/json; charset=utf-8",
                    "Authorization": `Basic ${CONFIG.ONESIGNAL_KEY}`
                }
            }
        );

        if (response.data && response.data.id) {
            await redis.set(cacheKey, "true", "EX", CONFIG.EXPIRE_TIME);
            console.log(`✅ Bildirim Gitti: ${news.title || news.baslik}`);
            return true;
        }
    } catch (error) {
        console.error("❌ OneSignal Hatası:", error.response?.data || error.message);
    }
    return false;
}

async function startBot() {
    console.log(`📡 Derin Tarama Başlatıldı... (Gözlem derinliği: ${CONFIG.BATCH_LIMIT} haber)`);
    
    try {
        // Cache Buster: Vercel'i her seferinde taze veri vermeye zorlar
        const timestamp = Date.now();
        const response = await axios.get(`https://worldwindows.network/api/news?v=${timestamp}`, {
            headers: { 
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            }
        }); 
        
        const allNews = response.data.news || response.data;
        
        if (!Array.isArray(allNews)) {
            console.log("⚠️ Veri yapısı uygun değil.");
            setTimeout(startBot, CONFIG.FETCH_INTERVAL);
            return;
        }

        console.log(`📥 Siteden ${allNews.length} haber çekildi. İlk ${CONFIG.BATCH_LIMIT} haber taranıyor...`);
        
        let count = 0;
        // En güncel haberi ıskalamamak için listeyi derinlemesine tara
        for (let i = 0; i < Math.min(allNews.length, CONFIG.BATCH_LIMIT); i++) {
            const news = allNews[i];
            const sent = await sendNotification(news);
            if (sent) {
                count++;
                await new Promise(resolve => setTimeout(resolve, 3000)); // Hızlandırıldı
            }
        }
        console.log(`🔄 Tur bitti. ${count} yeni bildirim çıktı.`);
    } catch (error) {
        console.error("⚠️ Tarama hatası:", error.message);
    }

    setTimeout(startBot, CONFIG.FETCH_INTERVAL);
}

startBot();

const port = process.env.PORT || 10000;
http.createServer((req, res) => {
    res.writeHead(200);
    res.end('Robot Aktif\n');
}).listen(port);
