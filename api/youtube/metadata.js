function extractYouTubeId(urlOrId) {
  const raw = String(urlOrId || '').trim();
  if (/^[A-Za-z0-9_-]{11}$/.test(raw)) return raw;
  const match = /(?:v=|\/v\/|\/embed\/|\/shorts\/|\/live\/|youtu\.be\/)([A-Za-z0-9_-]{11})/.exec(raw);
  return match ? match[1] : null;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const rawUrl = req.query?.url || '';
  const videoId = extractYouTubeId(rawUrl);
  if (!videoId) {
    return res.status(400).json({ detail: 'Link YouTube invalid. Introdu un URL youtube.com sau youtu.be valid.' });
  }

  const canonicalUrl = `https://www.youtube.com/watch?v=${videoId}`;
  let title = `Videoclip YouTube (${videoId})`;
  let artist = 'YouTube';
  let thumbnail = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

  try {
    const oembedRes = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(canonicalUrl)}&format=json`,
      { headers: { 'User-Agent': 'StrumForge/1.0' } }
    );
    if (oembedRes.ok) {
      const data = await oembedRes.json();
      title = data.title || title;
      artist = data.author_name || artist;
      thumbnail = data.thumbnail_url || thumbnail;
    }
  } catch {
    // Graceful fallback if oEmbed is unreachable
  }

  return res.status(200).json({
    youtubeId: videoId,
    youtubeUrl: canonicalUrl,
    title,
    artist,
    thumbnail,
  });
}
