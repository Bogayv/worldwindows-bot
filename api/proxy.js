export default async function handler(req, res) {
  const { url } = req.query;
  if (!url) return res.status(400).json({error: "URL gerekli"});
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
    });
    const text = await response.text();
    res.setHeader('Content-Type', 'text/xml; charset=utf-8');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate');
    res.status(200).send(text);
  } catch (e) {
    res.status(500).json({error: e.message});
  }
}