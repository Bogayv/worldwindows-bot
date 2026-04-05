import axios from 'axios';
import Redis from 'ioredis';
import http from 'http';

// Upstash'in talep ettiği tam bağlantı formatı (Şifre hatasını çözer)
const rawHost = (process.env.UPSTASH_REDIS_REST_URL || "").replace("https://", "");
const token = process.env.UPSTASH_REDIS_REST_TOKEN || "";

// --- YAPILANDIRMA ---
const CONFIG = {
    REDIS_URL: `rediss://default:${token}@${rawHost}:6379`,
    ONESIGNAL_APP_ID: "4c3d1977-4ffa-4227-8665-758fe36cce73", // Senin OneSignal ID'n
    ONESIGNAL_KEY: process.env.ONESIGNAL_KEY,
    FETCH_INTERVAL: 2 * 60 * 1000, // 2 Dakikada Bir Tarama
    BATCH_LIMIT: 10,               // Her Turda Maksimum 10 Haber Gönderimi
    EXPIRE_TIME: 259200            // Haber Hafıza Süresi (3 Gün)
};

const redis = new Redis(CONFIG.REDIS_URL);

// Hata Yakalayıcı: Redis koparsa robot çökmesin
redis.on('error', (err) => console.error('❌ Redis Baglanti Hatasi:', err.message));

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
                // Kullanıcıyı doğrudan haber detayına zorlayan link
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
            console.log(`✅ Gonderildi: ${news.title || news.baslik}`);
            return true;
        }
    } catch (error) {
        console.error("❌ OneSignal Hatasi:", error.response?.data || error.message);
    }
    return false;
}

async function startBot() {
    console.log(`📡 Haber taramasi baslatildi... (Siteden cekiliyor)`);
    
    try {
        // ESKİ SİSTEM: Veriyi doğrudan senin API'nden çeker
        const response = await axios.get("https://worldwindows.network/api/news", {
            headers: { 'Cache-Control': 'no-cache' }
        }); 
        
        const allNews = response.data.news || response.data;
        
        // Emniyet Kemeri: Site HTML veya boş dönerse çökmeyi engeller ve sebebi yazdırır
        if (!Array.isArray(allNews)) {
            console.log("⚠️ Siteden haber listesi (array) gelmedi!");
            console.log("🔍 Sitenin verdigi yanit (ilk 100 karakter):", typeof allNews === 'string' ? allNews.substring(0, 100) : JSON.stringify(allNews).substring(0, 100));
            setTimeout(startBot, CONFIG.FETCH_INTERVAL);
            return;
        }

        console.log(`📥 Siteden ${allNews.length} adet haber okundu.`);
        
        let count = 0;
        for (const news of allNews) {
            if (count >= CONFIG.BATCH_LIMIT) break;
            
            const sent = await sendNotification(news);
            if (sent) {
                count++;
                await new Promise(resolve => setTimeout(resolve, 5000));
            }
        }
        console.log(`🔄 Tur tamamlandi. ${count} yeni haber gonderildi.`);
    } catch (error) {
        console.error("⚠️ Haber cekme hatasi:", error.message);
    }

    setTimeout(startBot, CONFIG.FETCH_INTERVAL);
}

// Robotu çalıştır
startBot();

// RENDER'IN FİŞİ ÇEKMESİNİ ENGELLEYEN LİMAN (PORT) KODU
const port = process.env.PORT || 10000;
http.createServer((req, res) => {
    res.writeHead(200);
    res.end('Robot Aktif\n');
}).listen(port, () => {
    console.log(`🌐 Render icin port (${port}) acildi. Fis cekilmeyecek.`);
});
