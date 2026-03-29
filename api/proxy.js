export default async function handler(req, res) {
  const { url } = req.query;
  if (!url) return res.status(400).send("URL eksik");
  try {
    const response = await fetch(decodeURIComponent(url));
    const xml = await response.text();
    res.setHeader('Content-Type', 'text/xml; charset=utf-8');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(200).send(xml);
  } catch (error) {
    res.status(500).send("Proxy error");
  }
}
