import { useState, useEffect, useRef, memo, useMemo } from "react";
import { Analytics } from "@vercel/analytics/react";

const GLOBAL_TAGS = [
  { id: "all", label: "ALL", urls: [] },
  { id: "trump", label: "TRUMP", urls: ["https://www.reutersagency.com/feed/", "https://rss.nytimes.com/services/xml/rss/nyt/Politics.xml", "https://www.politico.com/rss/politicopicks.xml"]},
  { id: "war", label: "WAR", urls: ["https://www.aljazeera.com/xml/rss/all.xml", "https://www.theguardian.com/world/rss", "http://feeds.bbci.co.uk/news/world/rss.xml"]},
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

const SOURCE_LINKS = [
  { name: "Reuters", url: "https://www.reuters.com", color: "#FF8000" },
  { name: "Financial Times", url: "https://www.ft.com", color: "#FCD0B4" },
  { name: "The Wall Street Journal", url: "https://www.wsj.com", color: "#E8E6E0" },
  { name: "The Economist", url: "https://www.economist.com", color: "#E3120B" },
  { name: "Bloomberg HT", url: "https://www.bloomberght.com", color: "#E8E6E0" },
  { name: "BBC News", url: "https://www.bbc.com/news", color: "#EB3323" },
  { name: "The New York Times", url: "https://www.nytimes.com", color: "#E8E6E0" },
  { name: "CNBC", url: "https://www.cnbc.com", color: "#00ACFF" },
  { name: "The Guardian", url: "https://www.theguardian.com", color: "#0582CA" },
  { name: "Forbes", url: "https://www.forbes.com", color: "#E8E6E0" },
  { name: "Barron's", url: "https://www.barrons.com", color: "#E8E6E0" },
  { name: "Politico", url: "https://www.politico.com", color: "#FF3344" },
  { name: "Al Jazeera", url: "https://www.aljazeera.com", color: "#F9B000" },
  { name: "Bigpara", url: "https://bigpara.hurriyet.com.tr/", color: "#FF3333" },
  { name: "KAP", url: "https://www.kap.org.tr", color: "#00BFFF" },
  { name: "Dünya", url: "https://www.dunya.com", color: "#FF3333" },
  { name: "Para Analiz", url: "https://www.paraanaliz.com", color: "#E8E6E0" },
  { name: "Kitco", url: "https://www.kitco.com", color: "#00D46A" },
  { name: "Investing.com", url: "https://www.investing.com", color: "#F38B00" },
];

const LANGUAGE_MAP = {
  "Türkçe": "Turkish", "İngilizce": "English", "Almanca": "German", "Fransızca": "French",
  "İspanyolca": "Spanish", "Arapça": "Arabic", "Çince": "Chinese", "Rusça": "Russian",
  "Hintçe": "Hindi", "Japonca": "Japanese", "Korece": "Korean", "Tayca": "Thai",
  "Kazakça": "Kazakh", "Azerice": "Azerbaijani", "Yunanca": "Greek", "Portekizce": "Portuguese",
  "Çekçe": "Czech", "Danca": "Danish", "Felemenkçe": "Dutch"
};

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
      "symbols": [{ "proName": "OANDA:XAUUSD", "title": "GOLD" }, { "proName": "OANDA:XAGUSD", "title": "SILVER" }, { "proName": "TVC:UKOIL", "title": "BRENT" }, { "proName": "FX:USDTRY", "title": "USD/TRY" }, { "proName": "BINANCE:BTCUSDT", "title": "BTC" }],
      "showSymbolLogo": true, "colorTheme": "dark", "isTransparent": false, "displayMode": "regular", "locale": "en", "backgroundColor": "#000000"
    });
    container.current.appendChild(script);
  }, []);
  return <div style={{ background: "#000", borderBottom: "1px solid #1e2d4a", minHeight: "46px" }} ref={container}></div>;
});

let persistentTimeCache = {};
try {
  const saved = localStorage.getItem('ww_time_cache');
  if (saved) persistentTimeCache = JSON.parse(saved);
} catch (e) {}

export default function GlobalHaberler() {
  const [newsPool, setNewsPool] = useState([]);
  const [selectedNews, setSelectedNews] = useState(null);
  const [activeTag, setActiveTag] = useState(GLOBAL_TAGS[0]);
  const [timeLeft, setTimeLeft] = useState(60);
  const [modalType, setModalType] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [refreshBit, setRefreshBit] = useState(0);

  useEffect(() => {
    document.title = "WORLD WINDOWS";
    
    const silentCleanup = () => {
      // GOOGLE BANTLARINI SIFIRLA
      const badSelectors = ['.goog-te-banner-frame', '.goog-te-banner', 'iframe.goog-te-banner-frame', '.goog-tooltip', '#goog-gt-tt', '.goog-te-balloon-frame'];
      badSelectors.forEach(s => {
        document.querySelectorAll(s).forEach(el => {
          el.style.setProperty("display", "none", "important");
          el.style.setProperty("height", "0px", "important");
          el.style.setProperty("visibility", "hidden", "important");
        });
      });
      // SAYFA KAYMASINI SIFIRLA
      document.body.style.setProperty("top", "0px", "important");
      document.documentElement.style.setProperty("margin-top", "0px", "important");
    };

    const observer = new MutationObserver(silentCleanup);
    observer.observe(document.body, { childList: true, subtree: true });

    window.googleTranslateElementInit = () => {
      new window.google.translate.TranslateElement({ 
        pageLanguage: 'en', // Sayfayı İngilizce kabul et, böylece bant çıkmaz
        includedLanguages: 'en,tr,es,de,fr,ar,zh-CN,ru,hi,ja,ko,th,kk,az,el,pt,cs,da,nl', 
        autoDisplay: false, 
        multilanguagePage: true 
      }, 'google_translate_element');
    };

    if (!document.getElementById('google-translate-script')) {
      const script = document.createElement("script");
      script.id = 'google-translate-script';
      script.src = "//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
      script.async = true; document.body.appendChild(script);
    }

    const styleInterval = setInterval(() => {
      silentCleanup();
      const combo = document.querySelector('.goog-te-combo');
      if (combo) {
        if (combo.options && combo.options.length > 0) {
          Array.from(combo.options).forEach(opt => {
            if (LANGUAGE_MAP[opt.textContent]) opt.textContent = LANGUAGE_MAP[opt.textContent];
          });
          const hasEnglish = Array.from(combo.options).some(opt => opt.value === 'en');
          if (!hasEnglish) {
            const enOpt = document.createElement('option'); enOpt.value = 'en'; enOpt.textContent = 'English';
            combo.insertBefore(enOpt, combo.firstChild);
          }
          if (combo.value === "") { combo.value = "en"; combo.dispatchEvent(new Event('change')); }
          if (combo.options[0] && (combo.options[0].value === "" || combo.options[0].textContent.includes('Select'))) {
            combo.options[0].textContent = "LANG";
          }
        }
        combo.style.cssText = "background-color: #c9a96e !important; color: #0d1424 !important; border: none !important; padding: 0px 8px !important; border-radius: 4px !important; font-size: 11px !important; font-weight: 900 !important; font-family: 'Source Sans 3', sans-serif !important; text-transform: uppercase !important; cursor: pointer !important; height: 30px !important; width: 75px !important; outline: none !important; margin: 0 !important; display: block !important;";
      }
    }, 100);

    return () => { clearInterval(styleInterval); observer.disconnect(); };
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => { if (prev <= 1) { fetchCollectiveNews(); return 60; } return prev - 1; });
      setRefreshBit(b => b + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [activeTag]);

  useEffect(() => { fetchCollectiveNews(); setTimeLeft(60); }, [activeTag]);

  async function fetchCollectiveNews() {
    try {
      const targetUrls = activeTag.id === "all" ? ALL_URLS : activeTag.urls;
      const fetchPromises = targetUrls.map(async (url) => {
        try {
          const res = await fetch(`/api/proxy?url=${encodeURIComponent(url)}`);
          if (!res.ok) return [];
          const xmlText = await res.text();
          const parser = new DOMParser();
          const xmlDoc = parser.parseFromString(xmlText, "text/xml");
          const items = Array.from(xmlDoc.querySelectorAll("item, entry")).slice(0, 15);
          const feedTitle = xmlDoc.querySelector("channel > title, feed > title")?.textContent || "Global";
          const feedOrigin = new URL(url).origin;
          return items.map(item => {
            const title = item.querySelector("title")?.textContent || "News";
            const linkElem = item.querySelector("link");
            let rawLink = (linkElem?.textContent || linkElem?.getAttribute("href") || "#").trim();
            if (rawLink.startsWith("/")) rawLink = feedOrigin + rawLink;
            if (rawLink.includes('bigpara.com')) rawLink = rawLink.replace('www.bigpara.com', 'bigpara.hurriyet.com.tr');
            const newsId = btoa(unescape(encodeURIComponent(title.slice(0,50) + feedTitle)));
            if (!persistentTimeCache[newsId]) {
              persistentTimeCache[newsId] = Date.now();
              localStorage.setItem('ww_time_cache', JSON.stringify(persistentTimeCache));
            }
            return { id: Math.random(), baslik: title, detay: (item.querySelector("description")?.textContent || "").replace(/<[^>]*>?/gm, ''), kaynak: feedTitle.replace(/ - BBC News| \| World/gi, ''), url: rawLink, img: `https://picsum.photos/seed/${encodeURIComponent(title.slice(0,5))}/800/450`, tagId: activeTag.id, timestamp: persistentTimeCache[newsId] };
          });
        } catch (e) { return []; }
      });
      const results = await Promise.all(fetchPromises);
      setNewsPool(results.flat().sort((a, b) => b.timestamp - a.timestamp));
    } catch (e) {}
  }

  const displayData = useMemo(() => {
    let filtered = activeTag.id === "all" ? newsPool : newsPool.filter(i => i.tagId === activeTag.id);
    if (searchTerm.trim() !== "") {
      filtered = filtered.filter(i => i.baslik.toLowerCase().includes(searchTerm.toLowerCase()));
      return { radar: [], archive: filtered };
    }
    const radar = []; const sourceCount = {};
    for (const item of filtered) {
      if (radar.length >= 40) break;
      if (!sourceCount[item.kaynak] || sourceCount[item.kaynak] < 3) {
        radar.push(item); sourceCount[item.kaynak] = (sourceCount[item.kaynak] || 0) + 1;
      }
    }
    return { radar, archive: filtered.filter(f => !radar.find(r => r.id === f.id)).slice(0, 500) };
  }, [newsPool, activeTag, searchTerm, refreshBit]);

  return (
    <div style={{ paddingTop: "40px", minHeight: "100vh", background: "#080c14", color: "#e8e6e0", fontFamily: "'Georgia', serif", overflowX: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,400;1,700&family=Source+Sans+3:wght@400;700&display=swap');
        
        /* BANNER GIZLEME - KESIN COZUM */
        .goog-te-banner-frame, .goog-te-banner, iframe[id=":1.container"], #goog-gt-tt, .goog-tooltip, .goog-te-balloon-frame { 
          display: none !important; visibility: hidden !important; height: 0 !important; opacity: 0 !important;
        }
        
        html, body { 
          top: 0px !important; margin-top: 0px !important; position: static !important; background-color: #080c14 !important; 
        }

        h1, h2, h3, h4, p, span, font { pointer-events: none !important; user-select: none !important; }
        .news-card, .archive-card, .tag-pill, button, a, .close-btn, .footer-link, #google_translate_element, .goog-te-combo { pointer-events: auto !important; }

        .radar-container { overflow-x: auto; display: flex; gap: 20px; padding: 20px 32px 40px; -webkit-overflow-scrolling: touch; scroll-snap-type: x mandatory; }
        .news-card { min-width: 400px; max-width: 400px; background: #0d1424; border: 1px solid #1e2d4a; border-radius: 12px; cursor: pointer; overflow: hidden; flex-shrink: 0; scroll-snap-align: start; position: relative; transition: 0.3s; }
        .news-card img { width: 100%; height: 220px; object-fit: cover; border-bottom: 3px solid #c9a96e; pointer-events: none; }
        .top-header-container { padding: 20px 32px 5px; display: flex; justify-content: space-between; align-items: center; max-width: 1400px; margin: 0 auto; }
        .tag-pill { padding: 6px 16px; background: #080c14; border: 1px solid #1e2d4a; border-radius: 4px; color: #4a6080; font-size: 10px; font-weight: 900; cursor: pointer; }
        .tag-pill.active { background: #c9a96e; color: #0d1424; }
        .archive-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(350px, 1fr)); gap: 20px; padding: 32px; max-width: 1400px; margin: 0 auto; }
        .archive-card { background: #0d1424; border: 1px solid #1e2d4a; border-radius: 10px; padding: 25px; cursor: pointer; }
        .modal-content { background: #0d1424; border: 1px solid #c9a96e; border-radius: 12px; max-width: 800px; width: 100%; padding: 40px; position: relative; }
        @media (max-width: 768px) { .news-card { min-width: 78vw; max-width: 78vw; } }
      `}</style>

      <header style={{ background: "#0d1424" }}>
        <div className="top-header-container">
          <div style={{ display: "flex", alignItems: "center" }}>
             <img src="/logo.jpeg" style={{ width: "50px", height: "50px", marginRight: "12px", objectFit: "contain" }} />
             <div><h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "32px", color: "#c9a96e", fontWeight: "900", margin: 0 }}>WORLD WINDOWS</h1><div style={{ fontStyle: "italic", color: "#c9a96e", opacity: 0.9, fontSize: "15px" }}>Global news to understand the world</div></div>
          </div>
          <div className="header-right-panel" translate="no" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
             <div id="google_translate_element"></div>
             <div style={{ fontSize: "11px", color: "#c9a96e", fontWeight: "bold" }}>SYNC: {timeLeft}s</div>
             <button onClick={() => { fetchCollectiveNews(); setTimeLeft(60); }} style={{ background: "#c9a96e", border: "none", padding: "0 12px", height: "30px", borderRadius: "4px", fontWeight: "900", cursor: "pointer", fontSize: "10px" }}>SYNC NOW</button>
          </div>
        </div>
        <div style={{ display: "flex", gap: "8px", overflowX: "auto", padding: "12px 32px", background: "#0d1424", borderBottom: "1px solid #1e2d4a" }}>{GLOBAL_TAGS.map(t => (<div key={t.id} className={`tag-pill ${activeTag.id === t.id ? 'active' : ''}`} onClick={() => setActiveTag(t)}>#{t.label}</div>))}</div>
        <TradingViewLiveTicker />
      </header>

      <main>
        <section style={{ padding: "20px 32px 0", maxWidth: "1400px", margin: "0 auto" }}>
          <input type="text" style={{ background: "#080c14", border: "1px solid #c9a96e", color: "#e8e6e0", padding: "6px 12px", borderRadius: "4px", width: "250px" }} placeholder="Search news..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </section>
        <div className="radar-container" style={{ overflowX: "auto", display: "flex", gap: "20px", padding: "20px 32px 40px" }}>
          {displayData.radar.map(n => (
            <div key={n.id} className="news-card" onClick={() => { setSelectedNews(n); setModalType('news'); }}>
              <img src={n.img} /><div style={{ padding: "15px" }}><div style={{ color: "#c9a96e", fontWeight: "900", fontSize: "10px" }}>{n.kaynak.toUpperCase()}</div><h3 style={{ fontSize: "16px", color: "#e8e6e0", margin: "8px 0 0" }}>{n.baslik}</h3></div>
            </div>
          ))}
        </div>
        <div className="archive-grid">{displayData.archive.map(n => (<div key={n.id} className="archive-card" onClick={() => { setSelectedNews(n); setModalType('news'); }}><div style={{ fontSize: "10px", color: "#c9a96e", fontWeight: "900" }}>{n.kaynak.toUpperCase()} • {getRelativeTime(n.timestamp)}</div><h4 style={{ fontSize: "15px", margin: "8px 0 0" }}>{n.baslik}</h4></div>))}</div>
      </main>

      {modalType === 'news' && selectedNews && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(8,12,20,0.98)", zIndex: 10000, display: "flex", justifyContent: "center", alignItems: "center", padding: "20px" }} onClick={() => setModalType(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <img src={selectedNews.img} style={{ width: "100%", height: "250px", objectFit: "cover", borderRadius: "8px", marginBottom: "20px" }} />
            <h2 style={{ color: "#fff", margin: "15px 0", fontSize: "22px" }}>{selectedNews.baslik}</h2>
            <p style={{ color: "#8a9ab0", lineHeight: "1.6" }}>{selectedNews.detay}</p>
            <a href={selectedNews.url} target="_blank" rel="noreferrer" style={{ background: "#c9a96e", color: "#0d1424", padding: "12px 25px", textDecoration: "none", fontWeight: "bold", borderRadius: "4px", display: "inline-block", marginTop: "20px" }}>GO TO SOURCE ↗</a>
          </div>
        </div>
      )}
      <footer style={{ padding: "40px", textAlign: "center", borderTop: "1px solid #1e2d4a", marginTop: "40px" }}><div style={{ color: "#3a5278", fontSize: "10px" }}>© 2026 World Windows Terminal. All Rights Reserved.</div></footer>
      <Analytics />
    </div>
  );
}
