import express from 'express';
import process from 'node:process';

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

app.post('/api/internships', async (req, res) => {
  const apiKey = process.env.BRIGHTDATA_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Bright Data API key is not configured on the server.' });
  }

  const discoveryInput = {
    location: typeof req.body?.location === 'string' ? req.body.location.trim().slice(0, 120) : 'bangalore',
    keyword: typeof req.body?.keyword === 'string' ? req.body.keyword.trim().slice(0, 80) || 'intern' : 'intern',
    country: 'IN',
    time_range: 'Any time',
    job_type: '',
    experience_level: '',
    remote: '',
    company: '',
    location_radius: '',
  };

  try {
    const response = await fetch('https://api.brightdata.com/datasets/v3/scrape?dataset_id=gd_lpfll7v5hcqtkxl6l&notify=false&include_errors=true&type=discover_new&discover_by=keyword', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ input: [discoveryInput], limit_per_input: null }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok && response.status !== 202) {
      const errorDetails = payload?.error || payload?.message || JSON.stringify(payload);
      
      throw new Error(`Bright Data internship request failed (${response.status}): ${errorDetails}`);
    }

    let resultPayload = payload;
    if (payload?.snapshot_id) {
      let snapshotReady = false;
      for (let attempt = 0; attempt < 60; attempt += 1) {
        const progressResponse = await fetch(`https://api.brightdata.com/datasets/v3/progress/${encodeURIComponent(payload.snapshot_id)}`, {
          headers: { Authorization: `Bearer ${apiKey}` },
        });
        const progress = await progressResponse.json().catch(() => ({}));
        if (!progressResponse.ok) {
          throw new Error(`Bright Data progress check failed (${progressResponse.status}).`);
        }
        if (progress.status === 'ready') {
          const snapshotResponse = await fetch(`https://api.brightdata.com/datasets/v3/snapshot/${encodeURIComponent(payload.snapshot_id)}?format=json`, {
            headers: { Authorization: `Bearer ${apiKey}` },
          });
          if (!snapshotResponse.ok) {
            throw new Error(`Bright Data snapshot download failed (${snapshotResponse.status}).`);
          }
          resultPayload = await snapshotResponse.json();
          snapshotReady = true;
          break;
        }
        if (progress.status === 'failed' || progress.status === 'canceled') {
          throw new Error(progress.error_message || `Bright Data snapshot ${progress.status}.`);
        }
        await new Promise((resolve) => setTimeout(resolve, 10000));
      }
      if (!snapshotReady) {
        throw new Error('Bright Data internship search is taking too long. Please try again shortly.');
      }
    }

    const listings = Array.isArray(resultPayload)
      ? resultPayload
      : Array.isArray(resultPayload?.data)
        ? resultPayload.data
        : Array.isArray(resultPayload?.results)
          ? resultPayload.results
          : Array.isArray(resultPayload?.result)
            ? resultPayload.result
            : null;
    if (!listings) {
      throw new Error('Bright Data returned an unexpected internship response.');
    }

    return res.json({ success: true, data: listings });
  } catch (error) {
    console.error('Bright Data internship fetch error:', error.message);
    return res.status(502).json({
      error: 'Unable to load internship listings right now. Please adjust the filters and try again.',
    });
  }
});

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`LinkedIn proxy listening on http://localhost:${PORT}`);
});
