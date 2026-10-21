import express from 'express';

const app = express();
const PORT = 3001;

app.use(express.json({ limit: '2mb' }));

app.post('/api/linkedin-profile', async (req, res) => {
  const { url } = req.body || {};
  const apiKey = process.env.BRIGHTDATA_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'Bright Data API key is not configured on the server.' });
  }

  if (typeof url !== 'string' || !url.trim()) {
    return res.status(400).json({ error: 'A valid LinkedIn profile URL is required.' });
  }

  const normalizedUrl = url.trim();
  const isValidLinkedInUrl = /^https?:\/\/(www\.)?(linkedin\.com|www\.linkedin\.com)\//i.test(normalizedUrl) || /^https?:\/\/(linkedin\.com|www\.linkedin\.com)\//i.test(normalizedUrl);

  if (!isValidLinkedInUrl) {
    return res.status(400).json({ error: 'Please enter a valid LinkedIn profile URL.' });
  }

  try {
    const response = await fetch('https://api.brightdata.com/datasets/v3/scrape?dataset_id=gd_l1viktl72bvl7bjuj0&notify=false&include_errors=true', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: [{ url: normalizedUrl }],
        limit_per_input: null,
      }),
    });

    const text = await response.text();
    if (!response.ok) {
      throw new Error(`Bright Data request failed with status ${response.status}: ${text}`);
    }

    let payload;
    try {
      payload = JSON.parse(text);
    } catch {
      throw new Error('Bright Data returned malformed JSON.');
    }

    const result = payload?.data?.[0] || payload?.result?.[0] || payload?.[0] || payload;
    if (!result) {
      throw new Error('Bright Data response was empty.');
    }

    return res.json({ success: true, data: result });
  } catch (error) {
    console.error('Bright Data fetch error:', error.message);
    return res.status(502).json({
      error: 'Unable to fetch LinkedIn profile data right now. Please verify the URL and try again.',
    });
  }
});

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`LinkedIn proxy listening on http://localhost:${PORT}`);
});
