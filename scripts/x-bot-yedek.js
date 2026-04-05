const { TwitterApi } = require('twitter-api-v2');
const Parser = require('rss-parser');
const fs = require('fs');
const path = require('path');

// Radardaki en sıcak kaynaklar
const RSS_FEEDS = [
  "https://www.ft.com/?format=rss",
  "https://www.bloomberght.com/rss",
  "https://www.reutersagency.com/feed/",
  "https://tr.euronews.com/rss?level=vertical&type=all",
  "https://www.cnbc.com/id/10000664/device/rss/rss.html"
];

const POSTED_FILE = path.join(__dirname, 'posted.json');

// Paylaşılanları hafızadan oku
let postedUrls = [];
if (fs.existsSync(POSTED_FILE)) {
  try {
    postedUrls = JSON.parse(fs.readFileSync(POSTED_FILE, 'utf8'));
  } catch(e) { postedUrls = []; }
}

const client = new TwitterApi({
  appKey: process.env.X_API_KEY,
  appSecret: process.env.X_API_SECRET,
  accessToken: process.env.X_ACCESS_TOKEN,
  accessSecret: process.env.X_ACCESS_SECRET,
});

const parser = new Parser();

async function runBot() {
  console.log("Haber taraması başlatılıyor...");
  let allNews = [];

  for (const url of RSS_FEEDS) {
    try {
      const feed = await parser.parseURL(url);
      feed.items.forEach(item => {
        const link = (item.link || "").trim();
        if (link && !postedUrls.includes(link)) {
          allNews.push({
            title: item.title,
            link: link,
            source: (feed.title || "News").split(" - ")[0],
            date: new Date(item.isoDate || item.pubDate || Date.now()).getTime()
          });
        }
      });
    } catch (e) {
      console.error("RSS okuma hatası:", url);
    }
  }

  // En yeni tarihe göre sırala
  allNews.sort((a, b) => b.date - a.date);
  
  // Saatte 1 haber al
  const newsToPost = allNews.slice(0, 1);

  if (newsToPost.length === 0) {
    console.log("Paylaşılacak yeni haber yok.");
    return;
  }

  const news = newsToPost[0];
  try {
    const tweetText = `🔴 RADAR: ${news.source}\n\n${news.title}\n\nDetaylar: ${news.link}\n\nvia @Metadoloji #GlobalNews #Economy #Geopolitics`;
    await client.v2.tweet(tweetText);
    console.log("Tweet atıldı:", news.title);
    
    // Hafızaya ekle ve kaydet
    postedUrls.push(news.link);
    if (postedUrls.length > 500) postedUrls = postedUrls.slice(postedUrls.length - 500);
    fs.writeFileSync(POSTED_FILE, JSON.stringify(postedUrls, null, 2));
  } catch (error) {
    console.error("Tweet atılamadı:", error);
  }
}

runBot();
