import { useState, useEffect, memo } from "react";

const SOURCES = [
  { id: "all", label: "TÜMÜ", query: "finance+world+news" },
  { id: "ekonomi", label: "EKONOMİ", query: "economy+markets" },
  { id: "borsa", label: "BORSA", query: "stock+market+analysis" },
  { id: "kripto", label: "KRİPTO", query: "crypto+bitcoin+news" },
  { id: "jeopolitik", label: "JEOPOLİTİK", query: "geopolitics+war+intelligence" }
];

export default function GlobalHaberler() {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTag, setActiveTag] = useState(SOURCES[0]);

  useEffect(() => {
    fetchGoogleNews();
  }, [activeTag]);

  async function fetchGoogleNews() {
    setLoading(true);
    try {
      const rssUrl = `https://news.google.com/rss/search?q=${activeTag.query}&hl=en-US&gl=US&ceid=US:en`;
      const res = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}`);
      const data = await res.json();
      
      if (data.status === "ok") {
        setNews(data.items.map(item => ({
          id: item.guid,
          title: item.title,
          source: item.source || "Global Intelligence",
          link: item.link,
          pubDate: item.pubDate,
          img: `https://picsum.photos/seed/${encodeURIComponent(item.title.slice(0,10))}/800/450`
        })));
      }
    } catch (e) {
      console.error("Hata oluştu");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "#05070a", color: "#e0e0e0", fontFamily: "monospace" }}>
      <header style={{ borderBottom: "1px solid #1e2d4a", padding: "20px 32px", background: "#0a0d14" }}>
        <h1 style={{ color: "#c9a96e", margin: 0, fontSize: "24px", letterSpacing: "4px" }}>WORLD WINDOWS NETWORK</h1>
        <div style={{ color: "#4a6080", fontSize: "11px", marginTop: "5px" }}>STATUS: LIVE_INTELLIGENCE_STREAM</div>
      </header>

      <div style={{ display: "flex", gap: "10px", padding: "15px 32px", background: "#0a0d14", overflowX: "auto", borderBottom: "1px solid #1e2d4a" }}>
        {SOURCES.map(s => (
          <button 
            key={s.id} 
            onClick={() => setActiveTag(s)}
            style={{ 
              padding: "8px 16px", 
              background: activeTag.id === s.id ? "#c9a96e" : "transparent",
              color: activeTag.id === s.id ? "#05070a" : "#4a6080",
              border: "1px solid #1e2d4a",
              cursor: "pointer",
              fontSize: "10px",
              fontWeight: "bold"
            }}
          >
            {s.label}
          </button>
        ))}
      </div>

      <main style={{ padding: "32px" }}>
        {loading ? (
          <div style={{ color: "#c9a96e", textAlign: "center", paddingTop: "50px" }}>> DECRYPTING_DATA_STREAM...</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "25px" }}>
            {news.map(n => (
              <div 
                key={n.id} 
                onClick={() => window.open(n.link, "_blank")}
                style={{ background: "#0a0d14", border: "1px solid #1e2d4a", borderRadius: "4px", overflow: "hidden", cursor: "pointer" }}
              >
                <img src={n.img} style={{ width: "100%", height: "180px", objectFit: "cover", opacity: "0.8" }} />
                <div style={{ padding: "20px" }}>
                  <div style={{ color: "#c9a96e", fontSize: "9px", marginBottom: "10px" }}>[{n.source.toUpperCase()}]</div>
                  <h3 style={{ fontSize: "15px", margin: 0, lineHeight: "1.4", color: "#fff" }}>{n.title}</h3>
                  <div style={{ color: "#3a5278", fontSize: "9px", marginTop: "15px" }}>{n.pubDate}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      
      <footer style={{ textAlign: "center", padding: "40px", color: "#1e2d4a", fontSize: "10px" }}>
        WORLDWINDOWS.NETWORK // EST. 2026
      </footer>
    </div>
  );
}
