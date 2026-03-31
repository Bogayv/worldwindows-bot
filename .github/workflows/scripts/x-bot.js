const { TwitterApi } = require('twitter-api-v2');

const client = new TwitterApi({
  appKey: process.env.X_API_KEY,
  appSecret: process.env.X_API_SECRET,
  accessToken: process.env.X_ACCESS_TOKEN,
  accessSecret: process.env.X_ACCESS_SECRET,
});

async function test() {
  try {
    await client.v2.tweet("Dünya Penceresi yayına hazırlanıyor... @metadoloji #Test");
    console.log("BAŞARILI: Tweet atıldı!");
  } catch (e) {
    console.error("HATA DETAYI:", JSON.stringify(e.data, null, 2));
    process.exit(1);
  }
}
test();
