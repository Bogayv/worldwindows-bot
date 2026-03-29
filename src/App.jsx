import { useState, useEffect, useRef, memo, useMemo } from "react";
import { Analytics } from "@vercel/analytics/react";

const GLOBAL_TAGS = [
  { id: "all", label: "ALL", urls: [] },
  { id: "ekonomi", label: "ECONOMY", urls: ["https://www.ft.com/?format=rss", "https://www.economist.com/sections/economics/rss.xml", "https://www.wsj.com/xml/rss/3_7014.xml", "https://www.forbes.com/economics/feed/"]},
  { id: "finans", label: "FINANCE", urls: ["https://www.wsj.com/xml/rss/3_7031.xml", "https://www.cnbc.com/id/10000664/device/rss/rss.html", "https://feeds.barrons.com/v1/barrons/rss?xml=1", "https://www.ft.com/markets?format=rss"]},
  { id: "kripto", label: "CRYPTO", urls: ["https://cointelegraph.com/rss", "https://www.coindesk.com/arc/outboundfeeds/rss/"]},
  { id: "asya", label: "ASIA PACIFIC", urls: ["https://www.scmp.com/rss/4/feed", "https://asia.nikkei.com/rss/feed/category/53", "https://en.yna.co.kr/RSS/news.xml"]},
  { id: "jeopolitik", label: "GEOPOLITICS", urls: ["https://www.theguardian.com/world/rss", "https://www.aljazeera.com/xml/rss/all.xml", "https://rss.dw.com/rdf/rss-en-biz", "https://www.telegraph.co.uk/business/rss.xml", "http://feeds.bbci.co.uk/news/world/rss.xml", "https://rss.nytimes.com/services/xml/rss/nyt/World.xml", "https://www.reutersagency.com/feed/"]},
  { id: "siyaset", label: "POLITICS", urls: ["https://www.politico.com/rss/politicopicks.xml", "https://www.theguardian.com/politics/rss"]},
  { id: "gold", label: "GOLD/SILVER", urls: ["https://www.kitco.com/rss/index.xml", "https://www.investing.com/rss/news_95.rss"]},
  { id: "borsa", label: "MARKETS", urls: ["https://www.bloomberght.com/rss", "https://finance.yahoo.com/news/rss", "https://www.bigpara.com/rss/"]},
  { id: "kap", label: "KAP & CORP", urls: ["https://www.kap.org.tr/tr/rss", "https://www.paraanaliz.com/feed/", "https://www.dunya.com/rss"]},
];

const ALL_URLS = Array.from(new Set(GLOBAL_TAGS.flatMap(tag => tag.urls)));

const getRelativeTime = (ts) => {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  const h = Math.floor(m / 60);
  if (m < 1) return "Just now";
  if (m < 60) return `${m} mins ago`;
  if (h < 24) return `${h} hours ago`;
  return `${Math.floor(h / 24)} days ago`;
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
        { "proName": "OANDA:XAGUSD", "title": "SILVER" },
        { "proName": "TVC:UKOIL", "title": "BRENT" },
        { "proName": "FX:USDTRY", "title": "USD/TRY" },
        { "proName": "BINANCE:BTCUSDT", "title": "BTC" }
      ],
      "showSymbolLogo": true, "colorTheme": "dark", "isTransparent": false, "displayMode": "regular", "locale": "en", "backgroundColor": "#000000"
    });
    container.current.appendChild(script);
  }, []);
  return <div style={{ background: "#000", borderBottom: "1px solid #1e2d4a", minHeight: "46px" }} ref={container}></div>;
});

export default function GlobalHaberler() {
  const [newsPool, setNewsPool] = useState([]);
  const [selectedNews, setSelectedNews] = useState(null);
  const [activeTag, setActiveTag] = useState(GLOBAL_TAGS[0]);
  const [timeLeft, setTimeLeft] = useState(60);
  const [modalType, setModalType] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const scrollRef = useRef(null);

  useEffect(() => {
    document.documentElement.lang = "en";
    window.googleTranslateElementInit = () => {
      new window.google.translate.TranslateElement({ pageLanguage: 'en', includedLanguages: 'en,tr,es,de,fr,ar,zh-CN,ru,hi,ja,ko,th,kk,az,el,pt,cs,da,nl' }, 'google_translate_element');
    };
    const script = document.createElement("script");
    script.src = "//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit&hl=en";
    script.async = true;
    document.body.appendChild(script);
  }, []);

  // JAVASCRIPT TABANLI KAYDIRMA MOTORU
  useEffect(() => {
    let animationId;
    const scroll = () => {
      if (scrollRef.current) {
        scrollRef.current.scrollLeft += 1; // Her karede 1 piksel kaydır
        // Eğer sona yaklaştıysa başa sar (Sonsuzluk illüzyonu)
        if (scrollRef.current.scrollLeft >= scrollRef.current.scrollWidth / 2) {
          scrollRef.current.scrollLeft = 0;
        }
      }
      animationId = requestAnimationFrame(scroll);
    };
    animationId = requestAnimationFrame(scroll);
    return () => cancelAnimationFrame(animationId);
  }, [newsPool]);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => { if (prev <= 1) { fetchCollectiveNews(); return 60; } return prev - 1; });
    }, 1000);
    return () => clearInterval(timer);
  }, [activeTag]);

  useEffect(() => { fetchCollectiveNews(); setTimeLeft(60); }, [activeTag]);

  async function fetchCollectiveNews() {
    try {
      const allFetchedNews = [];
      const targetUrls = activeTag.id === "all" ? ALL_URLS : activeTag.urls;
      const fetchPromises = targetUrls.map(async (url) => {
        try {
          const res = await fetch(`/api/proxy?url=${encodeURIComponent(url)}`);
          if (!res.ok) return [];
          const xmlText = await res.text();
          const parser = new DOMParser();
          const xmlDoc = parser.parseFromString(xmlText, "text/xml");
          const items = Array.from(xmlDoc.querySelectorAll("item, entry")).slice(0, 10);
          const feedTitle = xmlDoc.querySelector("channel > title, feed > title")?.textContent || "Global";
          return items.map(item => {
            const title = item.querySelector("title")?.textContent || "News";
            const linkElem = item.querySelector("link");
            let rawLink = (linkElem?.textContent || linkElem?.getAttribute("href") || "#").trim();
            const desc = item.querySelector("description")?.textContent || "";
            const cleanDesc = desc.replace(/<[^>]*>?/gm, '');
            let imgUrl = `https://picsum.photos/seed/${encodeURIComponent(title.slice(0,5))}/800/450`;
            const pubDate = item.querySelector("pubDate")?.textContent || item.querySelector("published")?.textContent;
            return { id: Math.random(), baslik: title, detay: cleanDesc, kaynak: feedTitle.replace(/ - BBC News/gi, ''), url: rawLink, img: imgUrl, tagId: activeTag.id, timestamp: new Date(pubDate).getTime() };
          });
        } catch (e) { return []; }
      });
      const results = await Promise.all(fetchPromises);
      results.forEach(batch => { if(batch) allFetchedNews.push(...batch); });
      setNewsPool(allFetchedNews);
    } catch (e) {}
  }

  const displayData = useMemo(() => {
    let filtered = activeTag.id === "all" ? newsPool : newsPool.filter(i => i.tagId === activeTag.id);
    const sorted = [...filtered].sort((a, b) => b.timestamp - a.timestamp);
    return { radar: sorted.slice(0, 8), archive: sorted.slice(8, 500) };
  }, [newsPool, activeTag]);

  return (
    <div style={{ paddingTop: "40px", minHeight: "100vh", background: "#080c14", color: "#e8e6e0", fontFamily: "'Georgia', serif", overflowX: "hidden" }}>
      <style>{`
        .radar-container { overflow: hidden; white-space: nowrap; width: 100vw; padding: 20px 0; cursor: pointer; }
        .radar-track { display: flex; gap: 24px; padding-left: 32px; width: max-content; }
        .news-card { min-width: 420px; max-width: 420px; background: #0d1424; border: 1px solid #1e2d4a; border-radius: 12px; display: inline-block; vertical-align: top; white-space: normal; }
        .news-card img { width: 100%; height: 240px; object-fit: cover; border-bottom: 3px solid #c9a96e; }
        .tag-bar { display: flex; gap: 8px; overflow-x: auto; padding: 12px 32px; background: #0d1424; border-bottom: 1px solid #1e2d4a; position: sticky; top: 0; z-index: 100; }
        .tag-pill { padding: 6px 16px; background: #080c14; border: 1px solid #1e2d4a; border-radius: 4px; color: #4a6080; font-size: 10px; font-weight: 900; cursor: pointer; }
        .tag-pill.active { background: #c9a96e; color: #0d1424; }
        .archive-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(350px, 1fr)); gap: 20px; padding: 32px; }
        .archive-card { background: #0d1424; border: 1px solid #1e2d4a; border-radius: 10px; padding: 25px; cursor: pointer; border-left: 4px solid #1e2d4a; }
        @media (max-width: 768px) { .news-card { min-width: 85vw; } }
      `}</style>

      {modalType === 'news' && selectedNews && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(8,12,20,0.95)", zIndex: 10000, display: "flex", justifyContent: "center", alignItems: "center", padding: "20px" }} onClick={() => setModalType(null)}>
          <div style={{ background: "#0d1424", padding: "30px", maxWidth: "600px", borderRadius: "12px", border: "1px solid #c9a96e" }} onClick={e => e.stopPropagation()}>
            <img src={selectedNews.img} style={{ width: "100%", borderRadius: "8px" }} />
            <h2 style={{ color: "#fff" }}>{selectedNews.baslik}</h2>
            <p style={{ color: "#8a9ab0", maxHeight: "200px", overflowY: "auto" }}>{selectedNews.detay}</p>
            <button onClick={() => window.open(selectedNews.url, '_blank')} style={{ background: "#c9a96e", border: "none", padding: "10px 20px", borderRadius: "4px", fontWeight: "bold", cursor: "pointer" }}>SOURCE ↗</button>
          </div>
        </div>
      )}

      <header style={{ background: "#0d1424" }}>
        <div style={{ padding: "20px 32px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            <img src="/logo.jpeg" style={{ width: "65px", height: "65px", marginRight: "15px" }} />
            <div><h1 style={{ color: "#c9a96e", margin: 0, fontSize: "28px" }}>WORLD WINDOWS</h1><div style={{ color: "#c9a96e", opacity: 0.7, fontSize: "13px" }}>Global Intelligence News Network</div></div>
          </div>
          <div id="google_translate_element"></div>
        </div>
        <div className="tag-bar">{GLOBAL_TAGS.map(t => (<div key={t.id} className={`tag-pill ${activeTag.id === t.id ? 'active' : ''}`} onClick={() => setActiveTag(t)}>#{t.label}</div>))}</div>
        <TradingViewLiveTicker />
      </header>

      <main>
        {displayData.radar.length > 0 && (
          <div className="radar-container" ref={scrollRef}>
            <div className="radar-track">
              {/* İlk Set */}
              {displayData.radar.map(n => (
                <div key={n.id} className="news-card" onClick={() => { setSelectedNews(n); setModalType('news'); }}>
                  <img src={n.img} />
                  <div style={{ padding: "20px" }}>
                    <div style={{ color: "#c9a96e", fontSize: "10px", fontWeight: "bold" }}>{n.kaynak.toUpperCase()}</div>
                    <h3 style={{ fontSize: "17px", margin: "10px 0" }}>{n.baslik}</h3>
                  </div>
                </div>
              ))}
              {/* İkinci Set (Akış için) */}
              {displayData.radar.map(n => (
                <div key={n.id + '_2'} className="news-card" onClick={() => { setSelectedNews(n); setModalType('news'); }}>
                  <img src={n.img} />
                  <div style={{ padding: "20px" }}>
                    <div style={{ color: "#c9a96e", fontSize: "10px", fontWeight: "bold" }}>{n.kaynak.toUpperCase()}</div>
                    <h3 style={{ fontSize: "17px", margin: "10px 0" }}>{n.baslik}</h3>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="archive-grid">
          {displayData.archive.map(n => (
            <div key={n.id} className="archive-card" onClick={() => { setSelectedNews(n); setModalType('news'); }}>
              <div style={{ color: "#c9a96e", fontSize: "10px" }}>{n.kaynak.toUpperCase()} • {getRelativeTime(n.timestamp)}</div>
              <h4 style={{ margin: "10px 0 0" }}>{n.baslik}</h4>
            </div>
          ))}
        </div>
      </main>

      <footer style={{ padding: "40px", textAlign: "center", borderTop: "1px solid #1e2d4a" }}>
        <div style={{ color: "#c9a96e", fontWeight: "bold" }}>WORLD WINDOWS NETWORK</div>
        <div style={{ color: "#4a6080", fontSize: "11px", marginTop: "10px" }}>© 2026 Global Intelligence Network. All Rights Reserved.</div>
      </footer>
      <Analytics />
    </div>
  );
}
