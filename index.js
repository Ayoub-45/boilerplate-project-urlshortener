const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const dns = require('dns');
const app = express();

app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use('/public', express.static(`${process.cwd()}/public`));
app.get('/', (req, res) => {
  res.sendFile(process.cwd() + '/views/index.html');
});

const urls = {}; // Store short->original mapping
let id = 1;

// POST - Create short URL
app.post('/api/shorturl', (req, res) => {
  const url = req.body.url;

  try {
    const hostname = new URL(url).hostname;
    dns.lookup(hostname, (err) => {
      if (err) return res.json({ error: 'invalid url' });

      urls[id] = url;
      res.json({ original_url: url, short_url: id });
      id++;
    });
  } catch (e) {
    res.json({ error: 'invalid url' });
  }
});

// GET - Redirect to original URL
app.get('/api/shorturl/:id', (req, res) => {
  const shortId = req.params.id;
  const originalUrl = urls[shortId];

  if (originalUrl) return res.redirect(originalUrl);
  res.status(404).send('No URL found');
});

// Start server
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});
