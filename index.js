import express from 'express';
import bodyParser from 'body-parser';
import dns from 'dns';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';

// Setup __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Setup LowDB
const adapter = new JSONFile('./db.json');
const defaultData = { urls: [], counter: 1 };
const db = new Low(adapter, defaultData);
await db.read();


// ✅ Initialize data structure if file is new or empty
if (!db.data) {
  db.data = { urls: [], counter: 1 };
  await db.write();
}

// Middleware
app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use('/public', express.static(path.join(__dirname, 'public')));

// Serve homepage
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

// Validate URL format
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
  await db.read(); // read fresh data
  const short = parseInt(req.params.short_url, 10);
  const found = db.data.urls.find(u => u.short_url === short);

  if (found) {
    res.redirect(found.original_url);
  } else {
    res.json({ error: 'invalid url' });
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
