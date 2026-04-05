export default async function handler(req, res) {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'URL is required' });

  try {
    // Axios yerine sistemin kendi %100 çalışan fetch yapısını kullanıyoruz
    const response = await fetch(url, { 
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    });
    
    const xmlText = await response.text();
    
    res.setHeader('Content-Type', 'text/xml; charset=utf-8');
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate');
    return res.status(200).send(xmlText);
  } catch (error) {
    return res.status(500).json({ error: 'Proxy fetch failed' });
  }
}
