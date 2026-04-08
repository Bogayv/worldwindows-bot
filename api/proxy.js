export default async function handler(req, res) {
  const { url } = req.query;
  if (!url) return res.status(400).send("URL missing");
  try {
    const fetchRes = await fetch(url, { headers: { 'User-Agent': 'WorldWindowsTerminal/1.0' }, signal: AbortSignal.timeout(6000) });
    if (!fetchRes.ok) throw new Error("Fetch failed");
    const text = await fetchRes.text();
    
    // SİHİRLİ DOKUNUŞ: VERCEL GLOBAL CDN CACHE (120 Saniye)
    res.setHeader('Cache-Control', 'public, s-maxage=120, stale-while-revalidate=59');
    res.setHeader('Content-Type', fetchRes.headers.get('Content-Type') || 'application/xml');
    res.status(200).send(text);
  } catch (error) {
    res.status(500).send("Error");
  }
}
