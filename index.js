import express from 'express';
import dns from 'dns';
import cors from 'cors';
import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();

// Setup __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Setup LowDB
const adapter = new JSONFile('./db.json');
const defaultData = { urls: [], counter: 1 };
const db = new Low(adapter, defaultData);
await db.read();

// Middleware
app.use(cors());
app.use(express.json());  // Use express.json() to parse JSON body
app.use('/public', express.static(path.join(__dirname, 'public')));

// Serve homepage
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

// Regex to validate URLs
const validUrlRegex = /^https?:\/\/(www\.)?[\w\-\.]+\.[a-z]{2,}.*$/i;

// POST - Shorten URL
app.post('/api/shorturl', async (req, res) => {
  const originalUrl = req.body.url;

  if (!validUrlRegex.test(originalUrl)) {
    return res.json({ error: 'invalid url' });
  }

  try {
    const hostname = new URL(originalUrl).hostname;

    dns.lookup(hostname, async (err) => {
      if (err) return res.json({ error: 'invalid url' });

      // Check if URL already exists
      const existing = db.data.urls.find(u => u.original_url === originalUrl);
      if (existing) {
        return res.json(existing);
      }

      const short_url = db.data.counter++;
      const newEntry = { original_url: originalUrl, short_url };

      db.data.urls.push(newEntry);
      await db.write();

      res.json(newEntry);
    });
  } catch (err) {
    return res.json({ error: 'invalid url' });
  }
});

// GET - Redirect to original URL
app.get('/api/shorturl/:short_url', async (req, res) => {
  await db.read(); // Read DB before checking

  const short = parseInt(req.params.short_url, 10); // Parse the short URL

  const found = db.data.urls.find(u => u.short_url === short);

  if (found) {
    res.redirect(found.original_url); // Redirect to the original URL
  } else {
    res.json({ error: 'invalid url' }); // Return error if not found
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
