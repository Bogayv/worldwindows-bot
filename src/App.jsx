import { useState, useEffect, useRef, memo, useMemo } from "react";

const GLOBAL_TAGS = [
  { id: "all", label: "TÜMÜ", query: "top+stories+finance+world" },
  { id: "ekonomi", label: "EKONOMİ", query: "global+economy+markets+inflation" },
  { id: "finans", label: "FİNANS", query: "investing+fed+interest+rates" },
  { id: "jeopolitik", label: "JEOPOLİTİK", query: "geopolitics+intelligence+military" },
  { id: "siyaset", label: "SİYASET", query: "politics+government+elections" },
  { id: "borsa", label: "BORSA", query: "stock+market+nasdaq+sp500" },
  { id: "kripto", label: "KRİPTO", query: "crypto+bitcoin+blockchain" },
];

const Ticker = memo(() => {
  const container = useRef();
  useEffect(() => {
    if (!container.current) return;
    container.current.innerHTML = "";
    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js";
    script.async = true;
    script.innerHTML = JSON.stringify({
      "symbols": [
        { "proName": "OANDA:XAUUSD", "title": "GOLD" },
        { "proName": "FX:USDTRY", "title": "USD/TRY" },
        { "proName": "BINANCE:BTCUSDT", "title": "BTC" },
        { "proName": "TVC:UKOIL", "title": "BRENT" }
      ],
      "colorTheme": "dark", "isTransparent": false, "displayMode": "regular", "locale": "tr", "backgroundColor": "#000000"
    });
    container.current.appendChild(script);
  }, []);
  return <div style={{ borderBottom: "1px solid #1e2d4a" }} ref={container}></div>;
});

export default function GlobalHaberler() {
  const [newsPool, setNewsPool] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTag, setActiveTag] = useState(GLOBAL_TAGS[0]);
  const [timeLeft, setTimeLeft] = useState(60);
  const [modalType, setModalType] = useState(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => (prev <= 1 ? 60 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => { fetchNews(); setTimeLeft(60); }, [activeTag]);

  async function fetchNews() {
    setLoading(true);
    try {
      const rssUrl = `https://news.google.com/rss/search?q=${activeTag.query}&hl=en-US&gl=US&ceid=US:en`;
      const res = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}&api_key=oyncyf0mgh8v7e5lq9w5z9yqyv8u78moxg8p9r9j&count=50`);
      const data = await res.json();
      
      if (data.status === "ok") {
        const processed = data.items.map(item => {
          const parts = item.title.split(" - ");
          const sourceName = parts.pop();
          const cleanTitle = parts.join(" - ");
          
          return {
            id: item.guid,
            title: cleanTitle || item.title,
            link: item.link,
            source: sourceName || item.source || "GLOBAL",
            pubDate: item.pubDate,
            img: `https://picsum.photos/seed/${encodeURIComponent(item.title.slice(0,8))}/800/450`,
            timestamp: new Date(item.pubDate).getTime()
          };
        });
        setNewsPool(processed);
      }
    } catch (e) { console.error("Sync Error"); }
    setLoading(false);
  }

  const displayData = useMemo(() => ({
    radar: newsPool.slice(0, 8),
    archive: newsPool.slice(8, 50)
  }), [newsPool]);

  return (
    <div style={{ minHeight: "100vh", background: "#080c14", color: "#e8e6e0", fontFamily: "serif" }}>
      <style>{`
        .tag-bar { display: flex; gap: 8px; overflow-x: auto; padding: 12px 32px; background: #0d1424; border-bottom: 1px solid #1e2d4a; position: sticky; top: 0; z-index: 100; }
        .tag-pill { padding: 6px 16px; background: #080c14; border: 1px solid #1e2d4a; border-radius: 4px; color: #4a6080; font-size: 10px; font-weight: 900; cursor: pointer; white-space: nowrap; transition: 0.2s; }
        .tag-pill.active { background: #c9a96e; border-color: #c9a96e; color: #0d1424; }
        .news-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 25px; padding: 32px; }
        .news-card { background: #0d1424; border: 1px solid #1e2d4a; border-radius: 12px; cursor: pointer; overflow: hidden; transition: 0.3s; }
        .news-card:hover { transform: translateY(-5px); border-color: #c9a96e; }
        .news-card img { width: 100%; height: 200px; object-fit: cover; border-bottom: 2px solid #c9a96e; opacity: 0.8; }
        .footer-link { color: #4a6080; text-decoration: none; margin: 0 15px; font-size: 11px; font-weight: bold; cursor: pointer; }
        .modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(8,12,20,0.98); backdrop-filter: blur(15px); z-index: 10000; display: flex; justify-content: center; align-items: center; padding: 20px; }
        .modal-content { background: #0d1424; border: 1px solid #c9a96e; border-radius: 12px; max-width: 500px; width: 100%; padding: 40px; text-align: center; }
      `}</style>

      {modalType && (
        <div className="modal-overlay" onClick={() => setModalType(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2 style={{ color: "#c9a96e" }}>{modalType.toUpperCase()}</h2>
            <p style={{ color: "#8a9ab0", lineHeight: "1.8" }}>
              {modalType === 'about' && "WorldWindows.network, küresel finans ve jeopolitik istihbaratı anlık olarak sunan profesyonel bir haber terminalidir."}
              {modalType === 'privacy' && "Gizliliğiniz bizim için önemlidir. Sitemiz çerezler (cookies) kullanmaktadır."}
              {modalType === 'contact' && "İletişim: iletisim@worldwindows.network"}
            </p>
            <button onClick={() => setModalType(null)} style={{ background: "#c9a96e", border: "none", padding: "10px 20px", borderRadius: "4px", cursor: "pointer", fontWeight: "bold" }}>KAPAT</button>
          </div>
        </div>
      )}

      <header style={{ background: "#0d1424", padding: "20px 32px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1 style={{ color: "#c9a96e", margin: 0, fontSize: "28px", letterSpacing: "3px", fontWeight: "900" }}>WORLD WINDOWS</h1>
            <div style={{ color: "#4a6080", fontSize: "10px", letterSpacing: "2px" }}>.NETWORK INTELLIGENCE</div>
          </div>
          <div style={{ color: "#c9a96e", fontWeight: "bold", fontSize: "12px" }}>SYNC: {timeLeft}s</div>
        </div>
      </header>

      <div className="tag-bar">
        {GLOBAL_TAGS.map(t => (
          <div key={t.id} className={`tag-pill ${activeTag.id === t.id ? 'active' : ''}`} onClick={() => setActiveTag(t)}>#{t.label}</div>
        ))}
      </div>

      <Ticker />

      <main style={{ maxWidth: "1400px", margin: "0 auto" }}>
        {loading && newsPool.length === 0 ? (
          <div style={{ textAlign: "center", padding: "100px", color: "#c9a96e" }}>[ ANALYZING_CHANNELS... ]</div>
        ) : (
          <>
            <h2 style={{ color: "#c9a96e", fontSize: "18px", padding: "32px 32px 0", marginBottom: "-10px" }}>LIVE RADAR</h2>
            <div className="news-grid">
              {displayData.radar.map(n => (
                <div key={n.id} className="news-card" onClick={() => window.open(n.link, "_blank")}>
                  <img src={n.img} />
                  <div style={{ padding: "20px" }}>
                    <div style={{ color: "#c9a96e", fontSize: "10px", fontWeight: "900", marginBottom: "10px" }}>{n.source.toUpperCase()}</div>
                    <h3 style={{ fontSize: "16px", margin: 0, lineHeight: "1.4" }}>{n.title}</h3>
                  </div>
                </div>
              ))}
            </div>

            <h2 style={{ color: "#4a6080", fontSize: "18px", padding: "0 32px", marginBottom: "20px" }}>ARCHIVE</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))", gap: "15px", padding: "0 32px 60px" }}>
              {displayData.archive.map(n => (
                <div key={n.id} onClick={() => window.open(n.link, "_blank")} style={{ background: "#0d1424", border: "1px solid #1e2d4a", padding: "15px", borderRadius: "8px", cursor: "pointer" }}>
                  <div style={{ color: "#c9a96e", fontSize: "9px", fontWeight: "900", marginBottom: "5px" }}>{n.source}</div>
                  <h4 style={{ fontSize: "14px", margin: 0, color: "#e8e6e0", fontWeight: "normal" }}>{n.title}</h4>
                </div>
              ))}
            </div>
          </>
        )}
      </main>

      <footer style={{ padding: "50px", textAlign: "center", background: "#0d1424", borderTop: "1px solid #1e2d4a" }}>
        <div style={{ color: "#c9a96e", fontWeight: "900", marginBottom: "20px" }}>WORLDWINDOWS.NETWORK</div>
        <div>
          <span className="footer-link" onClick={() => setModalType('about')}>ABOUT</span>
          <span className="footer-link" onClick={() => setModalType('privacy')}>PRIVACY</span>
          <span className="footer-link" onClick={() => setModalType('contact')}>CONTACT</span>
        </div>
      </footer>
    </div>
  );
}
