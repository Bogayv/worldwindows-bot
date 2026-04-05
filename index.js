const axios = require('axios');
const Redis = require('ioredis');
const http = require('http'); // Render'ın fişi çekmesini engellemek için eklendi

// Upstash'in talep ettiği tam bağlantı formatı
const rawHost = (process.env.UPSTASH_REDIS_REST_URL || "").replace("https://", "");
const token = process.env.UPSTASH_REDIS_REST_TOKEN || "";

// --- YAPILANDIRMA ---
const CONFIG = {
    // Upstash Redis Bağlantısı (WRONGPASS hatasını önleyen güvenli format)
    REDIS_URL: `rediss://default:${token}@${rawHost}:6379`,
    ONESIGNAL_APP_ID: "4c3d1977-4ffa-4227-8665-758fe36cce73", // Senin OneSignal ID'n
    ONESIGNAL_KEY: process.env.ONESIGNAL_KEY,
    FETCH_INTERVAL: 2 * 60 * 1000, // 2 Dakikada Bir Tarama
    BATCH_LIMIT: 10,               // Her Turda Maksimum 10 Haber Gönderimi
    EXPIRE_TIME: 259200            // Haber Hafıza Süresi (3 Gün - Saniye cinsinden)
};

const redis = new Redis(CONFIG.REDIS_URL);

// HATA YAKALAYICI: Şifre yanlışsa veya koparsa robot çökmesin
redis.on('error', (err) => {
    console.error('❌ Redis Bağlantı Hatası:', err.message);
});

async function sendNotification(news) {
    const newsId = news.id || news._id;
    if (!newsId) return false;

    const cacheKey = `sent_news:${newsId}`;

    // Redis kontrolü: Bu haber daha önce gönderildi mi?
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
                // KRİTİK: Tarayıcıyı ana sayfada bırakmayıp doğrudan haber detayına zorlayan link yapısı
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
            // Haber başarıyla gönderildi, Redis'e kaydet (3 gün sonra kendi kendini silecek)
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
        // Haberleri çektiğimiz API veya Proxy kaynağı (SENİN İSTEDİĞİN GİBİ ANA SİTENDEN ÇEKİYOR)
        const response = await axios.get("https://worldwindows.network/api/news"); 
        const allNews = response.data.news || response.data;
        
        // Emniyet Kemeri: Eğer siten veri döndürmezse robot çökmesin
        if (!Array.isArray(allNews)) {
            console.log("⚠️ Siteden veri gelmedi, bir sonraki tur bekleniyor...");
            setTimeout(startBot, CONFIG.FETCH_INTERVAL);
            return;
        }

        let count = 0;
        for (const news of allNews) {
            if (count >= CONFIG.BATCH_LIMIT) break;
            
            const sent = await sendNotification(news);
            if (sent) {
                count++;
                // OneSignal API'sini yormamak ve banlanmamak için her gönderim arası 5 saniye bekleme
                await new Promise(resolve => setTimeout(resolve, 5000));
            }
        }
        console.log(`🔄 Tur tamamlandı. ${count} yeni haber gönderildi.`);
    } catch (error) {
        console.error("⚠️ Haber çekme hatası:", error.message);
    }

    setTimeout(startBot, CONFIG.FETCH_INTERVAL);
}

// Robotu çalıştır
startBot();

// RENDER'I KANDIRMA KODU (Timeout Hatasını Önler)
const port = process.env.PORT || 3000;
http.createServer((req, res) => {
    res.writeHead(200, {'Content-Type': 'text/plain'});
    res.end('Robot Calisiyor\n');
}).listen(port, () => {
    console.log(`🌐 Render için sahte port (${port}) açıldı. Fiş çekilmeyecek.`);
});
