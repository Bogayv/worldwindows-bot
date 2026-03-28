import { useState, useEffect, useRef, memo, useMemo } from "react";

const GLOBAL_TAGS = [
  { id: "all", label: "TÜMÜ", urls: ["http://feeds.bbci.co.uk/news/world/rss.xml", "https://www.theguardian.com/world/rss", "https://rss.nytimes.com/services/xml/rss/nyt/World.xml", "https://www.reutersagency.com/feed/"]},
  { id: "ekonomi", label: "EKONOMİ/FT", urls: ["https://www.ft.com/?format=rss", "https://www.economist.com/sections/economics/rss.xml", "https://www.wsj.com/xml/rss/3_7014.xml"]},
  { id: "finans", label: "FİNANS/WSJ", urls: ["https://www.wsj.com/xml/rss/3_7031.xml", "https://www.cnbc.com/id/10000664/device/rss/rss.html"]},
  { id: "jeopolitik", label: "JEOPOLİTİK", urls: ["https://www.theguardian.com/world/rss", "https://www.aljazeera.com/xml/rss/all.xml"]},
  { id: "borsa", label: "BORSA", urls: ["https://www.bloomberght.com/rss", "https://www.bigpara.com/rss/"]},
];

const getRelativeTime = (ts) => {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  const h = Math.floor(m / 60);
  if (m < 1) return "Az önce";
  if (m < 60) return `${m} dk önce`;
  if (h < 24) return `${h} saat önce`;
  return `${Math.floor(h / 24)} gün önce`;
};

const TradingViewLiveTicker = memo(() => {
  const container = useRef();
  useEffect(() => {
    if (!container.current) return;
    container.current.innerHTML = "";
    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js";
    script.type = "text/javascript"; script.async = true;
    script.innerHTML = JSON.stringify({
      "symbols": [
        { "proName": "OANDA:XAUUSD", "title": "GOLD" },
        { "proName": "FX:USDTRY", "title": "USD/TRY" },
        { "proName": "BINANCE:BTCUSDT", "title": "BTC" },
        { "proName": "TVC:UKOIL", "title": "BRENT" }
      ],
      "showSymbolLogo": true, "colorTheme": "dark", "isTransparent": false, "displayMode": "regular", "locale": "tr", "backgroundColor": "#000000"
    });
    container.current.appendChild(script);
  }, []);
  return <div style={{ background: "#000", borderBottom: "1px solid #1e2d4a", minHeight: "46px" }} ref={container}></div>;
});

export default function GlobalHaberler() {
  const [newsPool, setNewsPool] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedNews, setSelectedNews] = useState(null);
  const [activeTag, setActiveTag] = useState(GLOBAL_TAGS[0]);
  const [timeLeft, setTimeLeft] = useState(60);
  const [modalType, setModalType] = useState(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { fetchCollectiveNews(); return 60; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [activeTag]);

  useEffect(() => { fetchCollectiveNews(); setTimeLeft(60); }, [activeTag]);

  async function fetchCollectiveNews() {
    setLoading(true);
    try {
      const allFetchedNews = [];
      const fetchPromises = activeTag.urls.map(async (url) => {
        try {
          // DOĞRUDAN RSS2JSON TÜNELİ (YENİ KEY İLE)
          const res = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(url)}&api_key=4pzhw0z2as6l5x0q4u7n8p9j9r9f9v9b9u9t9e9r`);
          const data = await res.json();
          if (data.status === "ok") {
            return data.items.map(item => ({
              id: item.guid || item.link,
              baslik: item.title,
              ozet: item.description?.replace(/<[^>]*>?/gm, '').slice(0, 180) + "...",
              detay: item.content?.replace(/<[^>]*>?/gm, '') || item.description?.replace(/<[^>]*>?/gm, ''),
              kaynak: data.feed.title || "Global",
              url: item.link,
              img: item.enclosure?.link || item.thumbnail || `https://picsum.photos/seed/${encodeURIComponent(item.title.slice(0,5))}/800/450`,
              tagLabel: activeTag.label,
              timestamp: new Date(item.pubDate).getTime()
            }));
          }
        } catch (e) { return []; }
      });
      const results = await Promise.all(fetchPromises);
      results.forEach(batch => { if(batch) allFetchedNews.push(...batch); });
      setNewsPool(allFetchedNews.sort((a,b) => b.timestamp - a.timestamp));
    } catch (e) { console.error("Error"); } finally { setLoading(false); }
  }

  const displayData = useMemo(() => ({
    radar: newsPool.slice(0, 8),
    archive: newsPool.slice(8, 100)
  }), [newsPool]);

  return (
    <div style={{ minHeight: "100vh", background: "#080c14", color: "#e8e6e0", fontFamily: "'Georgia', serif", overflowX: "hidden" }}>
      <style>{`
        .tag-bar { display: flex; gap: 8px; overflow-x: auto; padding: 12px 32px; background: #0d1424; border-bottom: 1px solid #1e2d4a; position: sticky; top: 0; z-index: 100; }
        .tag-pill { padding: 6px 16px; background: #080c14; border: 1px solid #1e2d4a; border-radius: 4px; color: #4a6080; font-size: 10px; font-weight: 900; cursor: pointer; white-space: nowrap; transition: 0.2s; }
        .tag-pill.active { background: #c9a96e; border-color: #c9a96e; color: #0d1424; }
        .news-slider { display: flex; gap: 24px; overflow-x: auto; padding: 20px 32px 40px; }
        .news-card { min-width: 420px; max-width: 420px; background: #0d1424; border: 1px solid #1e2d4a; border-radius: 12px; cursor: pointer; overflow: hidden; position: relative; transition: 0.3s; }
        .news-card:hover { border-color: #c9a96e; transform: translateY(-5px); }
        .news-card img { width: 100%; height: 240px; object-fit: cover; border-bottom: 3px solid #c9a96e; }
        .time-badge { position: absolute; top: 15px; left: 15px; background: rgba(0,0,0,0.85); padding: 5px 12px; border-radius: 4px; font-size: 11px; font-weight: 700; color: #c9a96e; border: 1px solid #c9a96e; z-index: 2; }
        .archive-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(350px, 1fr)); gap: 20px; padding: 0 32px 60px; }
        .archive-card { background: #0d1424; border: 1px solid #1e2d4a; border-radius: 10px; cursor: pointer; padding: 25px; border-left: 4px solid #1e2d4a; }
        .footer { background: #0d1424; padding: 40px 32px; border-top: 1px solid #1e2d4a; text-align: center; }
        .modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(8,12,20,0.98); backdrop-filter: blur(15px); z-index: 10000; display: flex; justify-content: center; align-items: center; padding: 20px; }
        .modal-content { background: #0d1424; border: 1px solid #c9a96e; border-radius: 12px; max-width: 850px; width: 100%; max-height: 90vh; overflow-y: auto; padding: 40px; }
      `}</style>

      {modalType && (
        <div className="modal-overlay" onClick={() => setModalType(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            {modalType === 'news' && selectedNews && (
              <>
                <img src={selectedNews.img} style={{ width: "calc(100% + 80px)", margin: "-40px -40px 20px", height: "350px", objectFit: "cover", borderBottom: "2px solid #c9a96e" }} />
                <h2 style={{ fontSize: "32px", color: "#fff", margin: "15px 0" }}>{selectedNews.baslik}</h2>
                <p style={{ color: "#8a9ab0", lineHeight: "1.8", fontSize: "18px" }}>{selectedNews.detay}</p>
                <a href={selectedNews.url} target="_blank" style={{ background: "#c9a96e", color: "#0d1424", padding: "12px 30px", textDecoration: "none", fontWeight: "bold", borderRadius: "4px", display: "inline-block", marginTop: "20px" }}>KAYNAĞA GİT ↗</a>
              </>
            )}
            <button onClick={() => setModalType(null)} style={{ position: "fixed", top: "20px", right: "20px", background: "#c9a96e", border: "none", padding: "10px", borderRadius: "50%", cursor: "pointer" }}>✕</button>
          </div>
        </div>
      )}

      <header style={{ background: "#0d1424" }}>
        <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "20px 32px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h1 style={{ color: "#c9a96e", fontSize: "32px", fontWeight: "900", margin: 0 }}>DÜNYA PENCERESİ</h1>
          <div style={{ color: "#c9a96e", fontWeight: "bold" }}>SYNC: {timeLeft}s</div>
        </div>
        <div className="tag-bar">
          {GLOBAL_TAGS.map(t => (
            <div key={t.id} className={`tag-pill ${activeTag.id === t.id ? 'active' : ''}`} onClick={() => setActiveTag(t)}>#{t.label}</div>
          ))}
        </div>
        <TradingViewLiveTicker />
      </header>

      <main style={{ maxWidth: "1400px", margin: "0 auto" }}>
        {loading && newsPool.length === 0 ? (
          <div style={{ textAlign: "center", padding: "100px", color: "#c9a96e" }}>[ VERİ AKIŞI BAŞLATILIYOR... ]</div>
        ) : (
          <>
            <h2 style={{ padding: "30px 32px 0", color: "#c9a96e" }}>LIVE RADAR</h2>
            <div className="news-slider">
              {displayData.radar.map(n => (
                <div key={n.id} className="news-card" onClick={() => { setSelectedNews(n); setModalType('news'); }}>
                  <div className="time-badge">{getRelativeTime(n.timestamp)}</div>
                  <img src={n.img} />
                  <div style={{ padding: "25px" }}>
                    <div style={{ color: "#c9a96e", fontWeight: "bold", fontSize: "10px" }}>{n.kaynak.toUpperCase()}</div>
                    <h3 style={{ fontSize: "18px", color: "#e8e6e0", margin: "10px 0" }}>{n.baslik}</h3>
                  </div>
                </div>
              ))}
            </div>

            <h2 style={{ padding: "30px 32px 20px", color: "#8a9ab0" }}>ARCHIVE</h2>
            <div className="archive-grid">
              {displayData.archive.map(n => (
                <div key={n.id} className="archive-card" onClick={() => { setSelectedNews(n); setModalType('news'); }}>
                  <div style={{ fontSize: "10px", color: "#c9a96e", marginBottom: "5px" }}>{n.kaynak.toUpperCase()} • {getRelativeTime(n.timestamp)}</div>
                  <h4 style={{ fontSize: "16px", color: "#e8e6e0", margin: 0, fontWeight: "normal" }}>{n.baslik}</h4>
                </div>
              ))}
            </div>
          </>
        )}
      </main>

      <footer className="footer">
        <div style={{ color: "#c9a96e", fontWeight: "bold" }}>DÜNYA PENCERESİ TERMINAL © 2026</div>
      </footer>
    </div>
  );
}
