import { useState, useEffect, useRef, memo, useMemo } from "react";
import { Analytics } from "@vercel/analytics/react";
import { ThemeProvider, useTheme } from "next-themes";

const GLOBAL_TAGS = [
  { id: "all", label: "ALL", urls: [] },
  { id: "trump", label: "TRUMP", urls: ["https://www.reutersagency.com/feed/", "https://rss.nytimes.com/services/xml/rss/nyt/Politics.xml", "https://www.politico.com/rss/politicopicks.xml"]},
  { id: "war", label: "WAR", urls: ["https://www.aljazeera.com/xml/rss/all.xml", "https://www.theguardian.com/world/rss", "http://feeds.bbci.co.uk/news/world/rss.xml"]},
  { id: "ekonomi", label: "ECONOMY", urls: ["https://www.ft.com/?format=rss", "https://www.economist.com/sections/economics/rss.xml", "https://www.wsj.com/xml/rss/3_7014.xml", "https://www.forbes.com/economics/feed/"]},
  { id: "finans", label: "FINANCE", urls: ["https://www.wsj.com/xml/rss/3_7031.xml", "https://www.cnbc.com/id/10000664/device/rss/rss.html", "https://feeds.barrons.com/v1/barrons/rss?xml=1", "https://www.ft.com/markets?format=rss"]},
  { id: "kripto", label: "CRYPTO", urls: ["https://cointelegraph.com/rss", "https://www.coindesk.com/arc/outboundfeeds/rss/"]},
  { id: "asya", label: "ASIA PACIFIC", urls: ["https://www.scmp.com/rss/4/feed", "https://asia.nikkei.com/rss/feed/category/53", "https://en.yna.co.kr/RSS/news.xml"]},
  { id: "jeopolitik", label: "GEOPOLITICS", urls: ["https://tr.euronews.com/rss?level=vertical&type=all", "https://www.france24.com/en/rss", "https://www.foreignaffairs.com/rss.xml", "https://rss.dw.com/rdf/rss-en-all", "https://www.theguardian.com/world/rss", "https://www.aljazeera.com/xml/rss/all.xml"]},
  { id: "siyaset", label: "POLITICS", urls: ["https://www.sozcu.com.tr/feeds-son-dakika", "https://www.politico.com/rss/politicopicks.xml", "https://www.theguardian.com/politics/rss", "https://www.abc.net.au/news/feed/45910/rss.xml"]},
  { id: "gold", label: "GOLD", urls: ["https://www.kitco.com/rss/index.xml", "https://www.investing.com/rss/news_95.rss"]},
  { id: "silver", label: "SILVER", urls: ["https://www.kitco.com/rss/index.xml", "https://www.investing.com/rss/market_overview_287.rss"]},
  { id: "borsa", label: "MARKETS", urls: ["https://www.bloomberght.com/rss", "https://gazeteoksijen.com/rss", "https://www.paraanaliz.com/feed/", "https://www.ntv.com.tr/ekonomi.rss", "https://www.borsagundem.com.tr/rss", "https://www.ekonomim.com/rss", "https://tr.investing.com/rss/news_301.rss", "https://www.hisse.net/haber/?feed=rss2"]},
];

const SOURCE_LINKS = [
  { name: "Reuters", url: "https://www.reuters.com", color: "#FF8000" },
  { name: "Financial Times", url: "https://www.ft.com", color: "#FCD0B4" },
  { name: "Bloomberg HT", url: "https://www.bloomberght.com", color: "#E8E6E0" },
  { name: "The Economist", url: "https://www.economist.com", color: "#E3120B" },
  { name: "WSJ", url: "https://www.wsj.com", color: "#E8E6E0" },
  { name: "New York Times", url: "https://www.nytimes.com", color: "#FFFFFF" },
  { name: "Politico", url: "https://www.politico.com", color: "#ED1C24" },
  { name: "Al Jazeera", url: "https://www.aljazeera.com", color: "#FFA500" },
  { name: "Forbes", url: "https://www.forbes.com", color: "#E8E6E0" },
  { name: "Barron's", url: "https://www.barrons.com", color: "#A9A9A9" },
  { name: "CoinTelegraph", url: "https://cointelegraph.com", color: "#FABF2C" },
  { name: "CoinDesk", url: "https://www.coindesk.com", color: "#00D1B2" },
  { name: "Gazete Oksijen", url: "https://gazeteoksijen.com", color: "#FFFFFF" },
  { name: "Euronews TR", url: "https://tr.euronews.com", color: "#005596" },
  { name: "NTV", url: "https://www.ntv.com.tr", color: "#FFE000" },
  { name: "Sözcü", url: "https://www.sozcu.com.tr", color: "#D92128" },
  { name: "Foreign Affairs", url: "https://www.foreignaffairs.com", color: "#5DADE2" },
  { name: "Nikkei Asia", url: "https://asia.nikkei.com", color: "#FFCC00" },
  { name: "SCMP", url: "https://www.scmp.com", color: "#FFD700" },
  { name: "Yonhap News", url: "https://en.yna.co.kr", color: "#C0392B" },
  { name: "Deutsche Welle", url: "https://www.dw.com", color: "#00ADFF" },
  { name: "France 24", url: "https://www.france24.com/en/", color: "#00AEEF" },
  { name: "ABC Australia", url: "https://www.abc.net.au/news", color: "#FF5500" },
  { name: "CNBC", url: "https://www.cnbc.com", color: "#00ACFF" },
  { name: "The Guardian", url: "https://www.theguardian.com", color: "#0582CA" },
  { name: "Dünya", url: "https://www.dunya.com", color: "#FF3333" },
  { name: "Para Analiz", url: "https://www.paraanaliz.com", color: "#E8E6E0" },
  { name: "Kitco", url: "https://www.kitco.com", color: "#00D46A" },
  { name: "Investing.com", url: "https://www.investing.com", color: "#F38B00" },
  { name: "BBC News", url: "https://www.bbc.com/news", color: "#EB3323" },
  { name: "Borsa Gündem", url: "https://www.borsagundem.com.tr", color: "#1D5D9B" },
  { name: "Ekonomim", url: "https://www.ekonomim.com", color: "#F39C12" },
  { name: "Investing TR", url: "https://tr.investing.com", color: "#F38B00" },
  { name: "Hisse.net", url: "https://www.hisse.net", color: "#00B0F0" }
];

const ThemeToggleButton = () => {
  const { theme, setTheme } = useTheme();
  return (
    <span style={{cursor:"pointer", margin: "0 10px"}} onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
      {theme === 'dark' ? '☀️ LIGHT MODE' : '🌙 DARK MODE'}
    </span>
  );
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
        { "proName": "BINANCE:BTCUSDT", "title": "BTC" },
        { "proName": "BINANCE:ETHUSDT", "title": "ETH" },
        { "proName": "OANDA:XAUUSD", "title": "GOLD" },
        { "proName": "OANDA:XAGUSD", "title": "SILVER" },
        { "proName": "FX:EURUSD", "title": "EUR/USD" },
        { "proName": "FX:USDTRY", "title": "USD/TRY" }
      ],
      "showSymbolLogo": true, "colorTheme": "dark", "isTransparent": false, "displayMode": "regular", "locale": "en", "backgroundColor": "#000000"
    });
    container.current.appendChild(script);
  }, []);
  return <div style={{ background: "#000", borderBottom: "1px solid #1e2d4a", minHeight: "46px", marginTop: "45px" }} ref={container}></div>;
});

let persistentTimeCache = {};
try {
  const saved = localStorage.getItem('ww_news_timer_final');
  if (saved) persistentTimeCache = JSON.parse(saved);
} catch (e) {}

export default function GlobalHaberler() {
  const [newsPool, setNewsPool] = useState([]);
  const [selectedNews, setSelectedNews] = useState(null);
  const [activeTag, setActiveTag] = useState(GLOBAL_TAGS[0]);
  const [timeLeft, setTimeLeft] = useState(60);
  const [isUpdating, setIsUpdating] = useState(false);
  const [modalType, setModalType] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [fontSize, setFontSize] = useState(16);
  const [timeFilter, setTimeFilter] = useState(1440);
  const [subEmail, setSubEmail] = useState("");
  const [subStatus, setSubStatus] = useState("");
  const [pushStatus, setPushStatus] = useState("");

  const activeTagRef = useRef(activeTag);
  useEffect(() => { activeTagRef.current = activeTag; }, [activeTag]);

  useEffect(() => {
    if (!document.querySelector('script[id="onesignal-script"]')) {
      const script = document.createElement("script");
      script.id = "onesignal-script";
      script.src = "https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js";
      script.async = true;
      document.head.appendChild(script);
    }
    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async function(OneSignal) {
      await OneSignal.init({
        appId: "4c3d1977-4ffa-4227-8665-758fe36cce73",
        safari_web_id: "web.onesignal.auto.1044439c-5d15-4670-891a-758fe36cce73",
      });
    });
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const newsId = params.get('newsId');
    if (newsId && newsPool.length > 0) {
      const found = newsPool.find(n => n.id === newsId);
      if (found) { setSelectedNews(found); setModalType('news'); }
    }
  }, [newsPool]);

  useEffect(() => {
    const hasSeenPrompt = localStorage.getItem('ww_welcome_sub_shown');
    if (!hasSeenPrompt) {
      const timer = setTimeout(() => {
        setSubStatus(""); setPushStatus("");
        setModalType('subscribe');
        localStorage.setItem('ww_welcome_sub_shown', 'true');
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    const updateHeader = () => {
      document.title = "WORLD WINDOWS";
      let link = document.querySelector("link[rel~='icon']");
      if (!link) { link = document.createElement('link'); link.rel = 'icon'; document.getElementsByTagName('head')[0].appendChild(link); }
      link.href = '/logo.jpeg';
    };
    updateHeader();
    const headerInterval = setInterval(updateHeader, 1000);

    if (!window.googleTranslateElementInit) {
      window.googleTranslateElementInit = () => {
        new window.google.translate.TranslateElement({
          pageLanguage: 'auto',
          includedLanguages: 'en,tr,es,de,fr,ar,zh-CN,ru,hi,ja,ko,th,kk,az,el,pt,cs,da,nl,it',
          autoDisplay: false
        }, 'google_translate_element');
      };
      const script = document.createElement("script");
      script.src = "//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit&hl=en";
      script.async = true;
      document.body.appendChild(script);
    }

    const styleInterval = setInterval(() => {
      const combo = document.querySelector('.goog-te-combo');
      if (combo) { combo.style.cssText = "background-color: #c9a96e !important; color: #0d1424 !important; border: 1px solid #c9a96e !important; padding: 2px 4px !important; border-radius: 4px !important; font-size: 11px !important; font-weight: 900 !important; cursor: pointer !important; outline: none !important; width: 95px !important; height: 26px !important;"; }
      const selectors = ['.goog-logo-link', '.goog-te-gadget span', '.goog-te-banner-frame', '#goog-gt-tt', '.goog-te-balloon-frame', '.goog-tooltip', '.skiptranslate iframe'];
      selectors.forEach(s => { const el = document.querySelector(s); if (el) el.style.setProperty('display', 'none', 'important'); });
      if (document.body.style.top !== '0px') { document.body.style.setProperty('top', '0px', 'important'); }
    }, 500);

    return () => { clearInterval(styleInterval); clearInterval(headerInterval); };
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { fetchCollectiveNews(); return 60; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => { fetchCollectiveNews(); setTimeLeft(60); }, [activeTag]);

  // ORİJİNAL VERİ ÇEKME FONKSİYONU (EKSİKSİZ, HABER DETAYLARIYLA)
  async function fetchCollectiveNews() {
    setIsUpdating(true);
    try {
      const currentTag = activeTagRef.current;
      const ALL_URLS = Array.from(new Set(GLOBAL_TAGS.flatMap(tag => tag.urls)));
      const targetUrls = currentTag.id === "all" ? ALL_URLS : currentTag.urls;
      const fetchPromises = targetUrls.map(async (url) => {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 6000);
          const proxyUrl = `/api/proxy?url=${encodeURIComponent(url)}&_t=${Date.now()}_${Math.random()}`;
          const res = await fetch(proxyUrl, {
            signal: controller.signal,
            cache: 'no-store',
            headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate', 'Pragma': 'no-cache', 'Expires': '0' }
          });
          clearTimeout(timeoutId);
          if (!res.ok) return [];
          const xmlText = await res.text();
          const parser = new DOMParser();
          const xmlDoc = parser.parseFromString(xmlText, "text/xml");
          const items = Array.from(xmlDoc.querySelectorAll("item, entry")).slice(0, 15);
          const feedTitle = xmlDoc.querySelector("channel > title, feed > title")?.textContent || "Global";
          const fetchTime = Date.now();
          return items.map((item, index) => {
            const title = item.querySelector("title")?.textContent || "News";
            const newsId = btoa(unescape(encodeURIComponent(title.slice(0,50)))).replace(/[^a-zA-Z0-9]/g, "").slice(0,24);
            let pubDateNode = item.querySelector("pubDate") || item.querySelector("updated") || item.getElementsByTagName("dc:date")[0];
            let newsTime = null;
            if (pubDateNode && pubDateNode.textContent) { const parsedTime = Date.parse(pubDateNode.textContent); if (!isNaN(parsedTime)) newsTime = parsedTime; }
            if (!newsTime) newsTime = persistentTimeCache[newsId] || (fetchTime - (index * 1000));
            let imageUrl = item.querySelector("enclosure")?.getAttribute("url") || item.querySelector("media\\:content, content")?.getAttribute("url") || "";
            if (!imageUrl) { const desc = item.querySelector("description")?.textContent || ""; const match = desc.match(/<img[^>]+src="([^">]+)"/); if (match) imageUrl = match[1]; }
            if (!imageUrl || !imageUrl.startsWith("http")) imageUrl = "https://worldwindows.network/logo.jpeg";
            if (!persistentTimeCache[newsId]) { persistentTimeCache[newsId] = newsTime; localStorage.setItem('ww_news_timer_final', JSON.stringify(persistentTimeCache)); }
            return { id: newsId, baslik: title, detay: (item.querySelector("description")?.textContent || "").replace(/<[^>]*>?/gm, ''), kaynak: feedTitle.replace(/ - BBC News| \| World/gi, ''), url: (item.querySelector("link")?.textContent || item.querySelector("link")?.getAttribute("href") || "#").trim(), img: imageUrl, tagId: currentTag.id, timestamp: persistentTimeCache[newsId] };
          });
        } catch (e) { return []; }
      });
      const results = await Promise.all(fetchPromises);
      const newFetchedItems = results.flat();
      setNewsPool(prevPool => {
        const combined = [...newFetchedItems, ...prevPool];
        const uniqueMap = new Map();
        combined.forEach(item => { if (!uniqueMap.has(item.id)) uniqueMap.set(item.id, item); });
        return Array.from(uniqueMap.values()).sort((a, b) => b.timestamp - a.timestamp).slice(0, 800);
      });
    } catch (e) {
    } finally {
      setTimeout(() => setIsUpdating(false), 800);
    }
  }

  const displayData = useMemo(() => {
    let filtered = activeTag.id === "all" ? newsPool : newsPool.filter(i => i.tagId === activeTag.id);
    if (timeFilter > 0) filtered = filtered.filter(item => (Date.now() - item.timestamp) <= timeFilter * 60000);
    if (searchTerm.trim() !== "") filtered = filtered.filter(i => i.baslik.toLowerCase().includes(searchTerm.toLowerCase()));
    const radar = []; const sourceCount = {};
    for (const item of filtered) {
      if (radar.length >= 40) break;
      if (!sourceCount[item.kaynak] || sourceCount[item.kaynak] < 5) { radar.push(item); sourceCount[item.kaynak] = (sourceCount[item.kaynak] || 0) + 1; }
    }
    return { radar, archive: filtered.filter(f => !radar.find(r => r.id === f.id)).slice(0, 500) };
  }, [newsPool, activeTag, searchTerm, timeFilter]);

  const getDynamicTime = (ts) => {
    const diff = Math.floor((Date.now() - ts) / 1000);
    if (diff < 60) return "Just Now";
    if (diff < 3600) return `${Math.floor(diff / 60)} mins ago`;
    return `${Math.floor(diff / 3600)} hours ago`;
  };

  const shareNewsGeneral = (e, n) => {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    const titleEl = document.getElementById(`news-title-${n.id}`);
    const displayTitle = titleEl ? titleEl.innerText : n.baslik;
    const shareUrl = `${window.location.origin}${window.location.pathname}?newsId=${n.id}`;
    const hashtags = "#bist100 #borsa #dolar #altın #gümüş #usdtry #xauusd #gold #silver #xagusd";
    const cashtags = "$xauusd $gold $silver $xagusd $brent $spx $ndx $dji";
    const textToShare = `${displayTitle}\n\n${hashtags}\n${cashtags}`;
    if (navigator.share) { navigator.share({ title: "WORLD WINDOWS", text: textToShare, url: shareUrl }).catch(() => {}); }
    else { navigator.clipboard.writeText(`${textToShare}\n${shareUrl}`).then(() => alert("🔗 Link Copied!")); }
  };

  const shareGeneral = (e) => {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    const originUrl = "https://worldwindows.network";
    if (navigator.share) { navigator.share({ url: originUrl }).catch(() => {}); }
    else { navigator.clipboard.writeText(originUrl).then(() => alert("🔗 Link Copied!")); }
  };

  const handleEmailSubscribe = async () => {
    if (!subEmail || !subEmail.includes("@")) { setSubStatus("invalid"); return; }
    const list = JSON.parse(localStorage.getItem('ww_sub_list') || '[]');
    if (list.includes(subEmail)) { setSubStatus("already"); return; }
    setSubStatus("loading");
    try {
      const r = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: subEmail })
      });
      if (r.ok) {
        list.push(subEmail);
        localStorage.setItem('ww_sub_list', JSON.stringify(list));
        setSubStatus("success");
        setSubEmail("");
      } else { setSubStatus("error"); }
    } catch { setSubStatus("error"); }
  };

  const handlePushSubscribe = () => {
    setPushStatus("loading");
    if (!("Notification" in window)) { setPushStatus("unsupported"); return; }
    if (Notification.permission === "granted") {
      if (window.OneSignalDeferred) {
        window.OneSignalDeferred.push(async (OneSignal) => {
          try { await OneSignal.User.PushSubscription.optIn(); } catch(e) {}
        });
      }
      setPushStatus("already_granted");
      return;
    }
    if (Notification.permission === "denied") { setPushStatus("denied"); return; }
    Notification.requestPermission().then((permission) => {
      if (permission === "granted") {
        if (window.OneSignalDeferred) {
          window.OneSignalDeferred.push(async (OneSignal) => {
            try { await OneSignal.User.PushSubscription.optIn(); } catch(e) {}
          });
        }
        setPushStatus("granted");
      } else { setPushStatus("denied"); }
    });
  };

  const openModalWithLink = (n) => { setSelectedNews(n); setModalType('news'); window.history.pushState({}, '', `?newsId=${n.id}`); };
  const closeModal = () => { setModalType(null); window.history.pushState({}, '', window.location.pathname); };

  return (
    <ThemeProvider attribute="class" defaultTheme="dark">
    <div className="app-container" style={{ minHeight: "100vh", background: "#080c14", color: "#e8e6e0", fontFamily: "'Georgia', serif", overflowX: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,400;1,700&family=Dancing+Script:wght@700&family=Source+Sans+3:wght@400;700&display=swap');
        .app-container { zoom: 0.8; }
        :root[class~="light"] .app-container { background: #f5f5f5 !important; color: #111 !important; }
        :root[class~="light"] .news-card, :root[class~="light"] .archive-card { background: #ffffff !important; border: 1px solid #ddd !important; }
        :root[class~="light"] .tag-pill { background: #eee !important; color: #333 !important; border: 1px solid #ccc !important; }
        :root[class~="light"] .tag-pill.active { background: #c9a96e !important; color: #000 !important; }
        :root[class~="light"] header { background: #ffffff !important; }
        :root[class~="light"] .top-header-container { background: #ffffff !important; }
        :root[class~="light"] h3, :root[class~="light"] h4 { color: #111 !important; }
        :root[class~="light"] .time-select-mini, :root[class~="light"] .font-btn { background: #fff !important; color: #111 !important; border-color: #aaa !important; }
        :root[class~="light"] .search-mini { color: #111 !important; }
        :root[class~="light"] .modal-content { background: #ffffff !important; }
        :root[class~="light"] .shielded-text p { color: #333 !important; }
        :root[class~="light"] .shielded-text h2 { color: #111 !important; }
        body { top: 0px !important; position: static !important; margin: 0; padding: 0; }
        .goog-te-banner-frame, .goog-te-balloon-frame, .goog-tooltip, .goog-text-highlight { display: none !important; pointer-events: none !important; }
        font { pointer-events: none !important; background-color: transparent !important; box-shadow: none !important; }
        .news-card::after, .archive-card::after, .shielded-text::after { content: ''; position: absolute; top: 0; left: 0; right: 0; bottom: 0; z-index: 5; background: transparent; }
        .share-icon-mini, .modal-body button, .modal-body a { z-index: 10; position: relative; }
        .translate-wrapper { width: 95px; height: 26px; overflow: hidden; display: inline-block; border-radius: 4px; }
        .top-header-container { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 55px 32px 10px; background: #000000; text-align: center; }
        .title-wrapper { display: flex; align-items: center; justify-content: center; gap: 0px; }
        .header-text-group { display: flex; flex-direction: column; align-items: center; }
        .header-title { font-family: 'Playfair Display', serif; font-size: 82px; color: #c9a96e; font-weight: 900; margin: 0; line-height: 0.8; letter-spacing: -3px; text-transform: uppercase; }
        .header-logo { width: 165px; height: 165px; object-fit: contain; }
        .slogan-text { font-family: 'Dancing Script', cursive; font-size: 24px; color: #c9a96e; margin-top: 12px; font-style: italic; text-align: center; width: auto; }
        .toolbar-container { padding: 0 32px; margin-top: 5px; margin-bottom: 25px; width: 100%; box-sizing: border-box; }
        .toolbar-main-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
        .toolbar-left-group { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        .search-mini, .time-select-mini { width: 110px; padding: 4px 10px; background: transparent; border: 1px solid #c9a96e; border-radius: 4px; color: #c9a96e; font-size: 11px; outline: none; height: 26px; }
        .time-select-mini { background: #080c14; cursor: pointer; font-weight: bold; }
        .font-btn { background: #080c14; border: 1px solid #c9a96e; color: #c9a96e; width: 26px; height: 26px; border-radius: 4px; cursor: pointer; font-size: 9px; font-weight: bold; display: flex; align-items: center; justify-content: center; }
        .radar-container { overflow-x: auto; display: flex; gap: 20px; padding: 20px 32px 40px; -webkit-overflow-scrolling: touch; scroll-snap-type: x mandatory; }
        .news-card { min-width: 400px; max-width: 400px; background: #0d1424; border: 1px solid #1e2d4a; border-radius: 12px; cursor: pointer; overflow: hidden; position: relative; scroll-snap-align: start; }
        .news-card img { width: 100%; height: 220px; object-fit: cover; border-bottom: 3px solid #c9a96e; background: #000; }
        .time-badge { position: absolute; top: 10px; left: 10px; background: rgba(0,0,0,0.8); color: #c9a96e; padding: 4px 10px; border-radius: 4px; font-size: 10px; font-weight: bold; border: 1px solid #c9a96e; z-index: 10; }
        .tag-bar { display: flex; gap: 8px; overflow-x: auto; padding: 15px 32px; background: #0d1424; border-bottom: 1px solid #1e2d4a; position: sticky; top: 0; z-index: 100; }
        .tag-pill { padding: 8px 16px; background: #080c14; border: 1px solid #1e2d4a; border-radius: 4px; color: #4a6080; font-size: 10px; font-weight: 900; cursor: pointer; white-space: nowrap; text-transform: uppercase; }
        .tag-pill.active { background: #c9a96e; color: #080c14; }
        .archive-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(350px, 1fr)); gap: 20px; padding: 32px; maxWidth: 1400px; margin: 0 auto; }
        .archive-card { background: #0d1424; border: 1px solid #1e2d4a; border-radius: 10px; padding: 25px; border-left: 4px solid #1e2d4a; cursor: pointer; position: relative; }
        .modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(8,12,20,0.98); z-index: 10000; display: flex; justify-content: center; align-items: center; }
        .modal-content { background: #0d1424; border: 2px solid #c9a96e; border-radius: 12px; width: 800px; max-height: 90vh; display: flex; flex-direction: column; overflow: hidden; position: relative; }
        .modal-body { flex: 1; overflow-y: auto; padding: 30px; -webkit-overflow-scrolling: touch; }
        .modal-detail-img { width: 100%; height: 350px; object-fit: cover; border-radius: 8px; margin-bottom: 20px; background: #000; }
        @media (max-width: 768px) {
          .app-container { zoom: 0.8 !important; }
          .header-title { font-size: 58px; } .header-logo { width: 120px; height: 120px; }
          .archive-grid { grid-template-columns: 1fr; padding: 15px; } .toolbar-container { padding: 0 15px; }
          .modal-content { width: auto; position: fixed; top: 5% !important; bottom: 5% !important; left: 15px !important; right: 15px !important; height: 90% !important; max-height: none; display: flex; flex-direction: column; }
          .modal-detail-img { height: 200px; }
        }
        .sub-section { border: 1px solid #1e2d4a; border-radius: 8px; padding: 20px; margin-bottom: 16px; }
        .sub-section-title { color: #c9a96e; font-weight: 900; font-size: 11px; letter-spacing: 2px; margin-bottom: 14px; }
        .sub-input { width: 100%; box-sizing: border-box; background: #080c14; border: 1px solid #1e2d4a; color: #e8e6e0; padding: 10px 14px; border-radius: 4px; font-size: 13px; outline: none; margin-bottom: 10px; font-family: 'Georgia', serif; }
        .sub-input:focus { border-color: #c9a96e; }
        .sub-btn-gold { background: #c9a96e; color: #080c14; border: none; padding: 11px 20px; border-radius: 4px; cursor: pointer; font-weight: 900; font-size: 11px; letter-spacing: 1px; width: 100%; }
        .sub-btn-gold:disabled { opacity: 0.6; cursor: not-allowed; }
        .sub-btn-push { background: #0d1424; color: #c9a96e; border: 2px solid #c9a96e; padding: 13px 20px; border-radius: 4px; cursor: pointer; font-weight: 900; font-size: 12px; letter-spacing: 1px; width: 100%; transition: all 0.2s; }
        .sub-btn-push:hover { background: #c9a96e; color: #080c14; }
        .sub-msg-ok { color: #00d46a; font-size: 12px; margin-top: 8px; font-weight: bold; }
        .sub-msg-warn { color: #f39c12; font-size: 12px; margin-top: 8px; }
        .sub-msg-err { color: #ff4a4a; font-size: 12px; margin-top: 8px; }
      `}</style>
      <header style={{ background: "#000000" }}>
        <div className="top-header-container notranslate">
          <div className="title-wrapper">
            <img src="./logo.jpeg" className="header-logo" alt="Logo" />
            <div className="header-text-group">
              <h1 className="header-title">WORLD<br/>WINDOWS</h1>
              <div className="slogan-text">Global news to understand the world</div>
            </div>
          </div>
        </div>
        <TradingViewLiveTicker />
        <div className="toolbar-container notranslate">
          <div className="toolbar-main-row">
            <div className="toolbar-left-group">
              <select className="time-select-mini" value={timeFilter} onChange={(e) => setTimeFilter(Number(e.target.value))}>
                <option value="1440">24h</option>
                <option value="60">1h</option>
                <option value="240">4h</option>
              </select>
              <input type="text" placeholder="Search..." className="search-mini" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
              <button className="font-btn" onClick={() => setFontSize(f => Math.max(10, f-2))}>A-</button>
              <button className="font-btn" onClick={() => setFontSize(f => Math.min(24, f+2))}>A+</button>
              <button className="font-btn" onClick={shareGeneral} title="Share Terminal">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
              </button>
              <button className="font-btn" onClick={() => { setSubStatus(""); setPushStatus(""); setModalType('subscribe'); }} title="Subscribe & Alerts" style={{borderColor:"#c9a96e", color:"#c9a96e"}}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
              </button>
            </div>
            <div onClick={() => { if(!isUpdating) { setTimeLeft(60); fetchCollectiveNews(); } }} style={{ fontSize: "12px", color: isUpdating ? "#00d46a" : "#c9a96e", fontWeight: "bold", marginLeft: "auto", transition: "color 0.3s ease", cursor: "pointer" }} title="Click to force refresh">
              {isUpdating ? "SYNCING..." : `SYNC: ${timeLeft}s`}
            </div>
          </div>
          <div className="toolbar-sub-row" style={{ marginTop: "8px", display: "flex", justifyContent: "flex-start" }}>
            <div className="translate-wrapper"><div id="google_translate_element"></div></div>
          </div>
        </div>
      </header>
      <main>
        <div style={{ padding: "0 32px 20px", textAlign: "center" }}>
          <div style={{fontFamily:"'Dancing Script'", fontSize:"24px", color:"#c9a96e", fontWeight:"700"}}>Are you ready to discover the world...</div>
        </div>
        <div className="tag-bar">{GLOBAL_TAGS.map(t => (<div key={t.id} className={`tag-pill ${activeTag.id === t.id ? 'active' : ''}`} onClick={() => setActiveTag(t)}>#{t.label}</div>))}</div>
        <div className="radar-container">
          {displayData.radar.map(n => (
            <div key={n.id} className="news-card" onClick={() => openModalWithLink(n)}>
              <div className="time-badge notranslate">{getDynamicTime(n.timestamp)}</div>
              <img src={n.img} alt="News" />
              <div style={{ padding: "15px" }}>
                <div style={{ color: "#c9a96e", fontWeight: "900", fontSize: "10px" }}>{n.kaynak.toUpperCase()}</div>
                <h3 id={`news-title-${n.id}`} style={{ fontSize: `${fontSize}px`, color: "#e8e6e0", margin: "8px 0 0" }}>{n.baslik}</h3>
              </div>
              <button className="share-icon-mini" style={{position:"absolute", bottom:"10px", right:"10px", background:"none", border:"none", cursor:"pointer", color:"#4a6080"}} onClick={(e) => shareNewsGeneral(e, n)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
              </button>
            </div>
          ))}
        </div>
        <div style={{ padding: "0 32px", marginTop: "30px" }}>
          <h2 style={{ fontFamily: "'Dancing Script'", fontSize: "38px", color: "#c9a96e", borderBottom: "1px solid #1e2d4a", paddingBottom: "10px" }}>News Archive</h2>
        </div>
        <div className="archive-grid">
          {displayData.archive.map(n => (
            <div key={n.id} className="archive-card" onClick={() => openModalWithLink(n)}>
              <div className="time-badge-inline notranslate" style={{ fontSize: "10px", color: "#c9a96e", fontWeight: "900", marginBottom: "8px" }}>{n.kaynak.toUpperCase()} • {getDynamicTime(n.timestamp)}</div>
              <h4 id={`news-title-${n.id}`} style={{ fontSize: `${fontSize-2}px`, margin: "8px 0 0" }}>{n.baslik}</h4>
              <button className="share-icon-mini" style={{ position: "absolute", bottom: "10px", right: "10px", color: "#4a6080", background: "none", border: "none", cursor: "pointer" }} onClick={(e) => shareNewsGeneral(e, n)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
              </button>
            </div>
          ))}
        </div>
      </main>
      <footer className="notranslate" style={{ padding: "40px", textAlign: "center", borderTop: "1px solid #1e2d4a", marginTop: "40px" }}>
        <div style={{ color: "#c9a96e", fontWeight: "900", marginBottom: "5px" }}>WORLD WINDOWS</div>
        <div style={{ display: "flex", justifyContent: "center", gap: "20px", color: "#8a9ab0", fontSize: "10px", fontWeight: "900", flexWrap: "wrap" }}>
          <ThemeToggleButton />
          <span style={{cursor:"pointer", margin: "0 10px"}} onClick={() => setModalType('about')}>ABOUT US</span>
          <span style={{cursor:"pointer", margin: "0 10px"}} onClick={() => setModalType('privacy')}>PRIVACY</span>
          <span style={{cursor:"pointer", margin: "0 10px"}} onClick={() => setModalType('contact')}>CONTACT</span>
          <span style={{cursor:"pointer", margin: "0 10px"}} onClick={() => { setSubStatus(""); setPushStatus(""); setModalType('subscribe'); }}>🔔 SUBSCRIBE</span>
        </div>
        <div style={{ color: "#3a5278", fontSize: "10px", marginTop: "30px" }}>© 2026 World Windows Terminal. All Rights Reserved.</div>
      </footer>
      {modalType === 'news' && selectedNews && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button style={{ position: "absolute", top: "15px", right: "15px", background: "#c9a96e", border: "none", color: "#0d1424", width: "32px", height: "32px", borderRadius: "50%", cursor: "pointer", zIndex: 100 }} onClick={closeModal}>✕</button>
            <div className="modal-body">
              <img src={selectedNews.img} className="modal-detail-img" alt="Detail" />
              <div className="shielded-text">
                <div className="notranslate" style={{ color: "#c9a96e", fontWeight: "bold" }}>{selectedNews.kaynak} • {getDynamicTime(selectedNews.timestamp)}</div>
                <h2 id={`news-title-${selectedNews.id}`} style={{ color: "#fff", margin: "15px 0", fontSize: `${fontSize+4}px` }}>{selectedNews.baslik}</h2>
                <p style={{ color: "#e8e6e0", lineHeight: "1.6", fontSize: `${fontSize}px` }}>{selectedNews.detay}</p>
              </div>
              <div style={{ display: "flex", gap: "10px", marginTop: "20px", flexWrap: "wrap" }}>
                <button onClick={() => { const url=`${window.location.origin}${window.location.pathname}?newsId=${selectedNews.id}`; navigator.clipboard.writeText(url).then(()=>alert("🔗 Copied!")); }} style={{ background: "#1e2d4a", color: "#fff", padding: "12px 20px", border: "none", borderRadius: "4px", cursor: "pointer", fontWeight: "bold" }}>🔗 LINK</button>
                <button onClick={(e) => shareNewsGeneral(e, selectedNews)} style={{ background: "#000", color: "#fff", padding: "12px 20px", border: "1px solid #c9a96e", borderRadius: "4px", cursor: "pointer", fontWeight: "bold", display: "flex", alignItems: "center", gap: "8px" }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                  SHARE
                </button>
                <a href={selectedNews.url} target="_blank" rel="noreferrer" style={{ background: "#c9a96e", color: "#0d1424", padding: "12px 20px", textDecoration: "none", borderRadius: "4px", fontWeight: "bold" }}>SOURCE ↗</a>
              </div>
            </div>
          </div>
        </div>
      )}
      {modalType && modalType !== 'news' && (
        <div className="modal-overlay notranslate" onClick={() => setModalType(null)}>
          <div className="modal-content" style={{height:"auto", maxHeight:"85vh"}} onClick={e => e.stopPropagation()}>
            <button style={{ position: "absolute", top: "15px", right: "15px", background: "#c9a96e", border: "none", color: "#0d1424", width: "32px", height: "32px", borderRadius: "50%", cursor: "pointer", zIndex: 100 }} onClick={() => setModalType(null)}>✕</button>
            <div className="modal-body">
              <h2 style={{ color: "#c9a96e", fontFamily: "'Playfair Display'", fontSize: "32px", marginBottom: "20px" }}>{modalType.toUpperCase()}</h2>
              <div style={{ color: "#8a9ab0", lineHeight: "1.8", fontSize: "14px" }}>
                {modalType === 'about' && (
                  <>
                    <p style={{ color: "#e8e6e0", fontSize: "16px", marginBottom: "20px" }}>World Windows is a high-speed, professional news terminal designed to provide real-time access to global finance, geopolitics, and economy news.</p>
                    <h3 style={{ color: "#c9a96e", marginBottom: "15px" }}>GLOBAL SOURCES</h3>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
                      {SOURCE_LINKS.map(link => (<a key={link.name} href={link.url} target="_blank" rel="noreferrer" style={{ color: link.color, textDecoration: "none", fontSize: "11px", border: `1px solid ${link.color}50`, padding: "6px 12px", borderRadius: "4px", background: "rgba(201, 169, 110, 0.05)", fontWeight: "bold" }}>{link.name} ↗</a>))}
                    </div>
                  </>
                )}
                {modalType === 'privacy' && <p style={{ color: "#e8e6e0" }}>We value your privacy. World Windows uses essential cookies to enhance your terminal experience.</p>}
                {modalType === 'contact' && (
                  <div style={{ textAlign: "center", padding: "40px 0" }}>
                    <p style={{ color: "#e8e6e0", fontSize: "18px" }}>Institutional inquiries:</p>
                    <a href="mailto:worldwindows.network@gmail.com" style={{ color: "#c9a96e", fontSize: "22px", fontWeight: "bold", textDecoration: "none" }}>worldwindows.network@gmail.com</a>
                  </div>
                )}
                {modalType === 'subscribe' && (
                  <div>
                    <p style={{ color: "#e8e6e0", fontSize: "14px", lineHeight: "1.7", marginBottom: "20px" }}>Stay informed with breaking news alerts and our curated global intelligence brief.</p>
                    <div className="sub-section">
                      <div className="sub-section-title">🔔 BREAKING NEWS ALERTS</div>
                      <p style={{ color: "#8a9ab0", fontSize: "12px", marginBottom: "14px", lineHeight: "1.6" }}>Instant browser alerts when major news breaks. One click — no email needed.</p>
                      <button className="sub-btn-push" onClick={handlePushSubscribe} disabled={pushStatus === "granted" || pushStatus === "already_granted"}>
                        {pushStatus === "granted" ? "✓ ALERTS ENABLED" :
                         pushStatus === "already_granted" ? "✓ ALREADY ENABLED" :
                         "🔔 ENABLE BROWSER ALERTS"}
                      </button>
                      {pushStatus === "granted" && <div className="sub-msg-ok">✓ You will now receive breaking news alerts!</div>}
                      {pushStatus === "already_granted" && <div className="sub-msg-ok">✓ Browser alerts are already active.</div>}
                      {pushStatus === "denied" && <div className="sub-msg-err">✗ Blocked. Go to browser Settings → Site Permissions → Allow Notifications for worldwindows.network</div>}
                      {pushStatus === "unsupported" && <div className="sub-msg-warn">⚠ Your browser does not support notifications. Try Chrome.</div>}
                    </div>
                    <div className="sub-section">
                      <div className="sub-section-title">📧 EMAIL NEWSLETTER</div>
                      <input className="sub-input" type="email" placeholder="your@email.com" value={subEmail} onChange={e => { setSubEmail(e.target.value); setSubStatus(""); }} onKeyDown={e => { if (e.key === 'Enter') handleEmailSubscribe(); }} />
                      <button className="sub-btn-gold" onClick={handleEmailSubscribe} disabled={subStatus === "loading" || subStatus === "success"}>
                        {subStatus === "loading" ? "SENDING..." : subStatus === "success" ? "✓ SUBSCRIBED" : "SUBSCRIBE →"}
                      </button>
                      {subStatus === "success" && <div className="sub-msg-ok">✓ Subscribed! Check your inbox.</div>}
                      {subStatus === "already" && <div className="sub-msg-warn">⚠ This email is already subscribed.</div>}
                      {subStatus === "error" && <div className="sub-msg-err">✗ An error occurred. Please try again.</div>}
                      {subStatus === "invalid" && <div className="sub-msg-err">✗ Please enter a valid email address.</div>}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      <Analytics />
    </div>
    </ThemeProvider>
  );
}
