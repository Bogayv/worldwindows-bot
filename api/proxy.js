export default async function handler(req, res) {
  const url = req.query.url || (req.url.includes('url=') ? new URLSearchParams(req.url.split('?')[1]).get('url') : null);
  if (!url) return res.status(400).send("URL required");
  try {
    const response = await fetch(url, {
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/rss+xml, text/xml, */*'
      }
    });
    const text = await response.text();
    res.setHeader('Content-Type', 'text/xml; charset=utf-8');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(200).send(text);
  } catch (e) {
    res.status(500).send(e.message);
  }
}