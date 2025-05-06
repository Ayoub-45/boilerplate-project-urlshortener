const express = require('express');
const bodyParser = require('body-parser');
const dns = require('dns');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use('/public', express.static(__dirname + '/public'));
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
});

const urlDatabase = {};
const reverseLookup = {};
let counter = 1;

// Regex to validate URL format
const validUrlRegex = /^https?:\/\/(www\.)?[\w\-\.]+\.[a-z]{2,}.*$/i;

// POST - Shorten the URL
app.post('/api/shorturl', (req, res) => {
  const originalUrl = req.body.url;

  if (!validUrlRegex.test(originalUrl)) {
    return res.json({ error: 'invalid url' });
  }

  try {
    const hostname = new URL(originalUrl).hostname;

    dns.lookup(hostname, (err) => {
      if (err) return res.json({ error: 'invalid url' });

      // Reuse existing short_url if already present
      if (reverseLookup[originalUrl]) {
        return res.json({
          original_url: originalUrl,
          short_url: reverseLookup[originalUrl]
        });
      }

      const shortUrl = counter++;
      urlDatabase[shortUrl] = originalUrl;
      reverseLookup[originalUrl] = shortUrl;

      res.json({
        original_url: originalUrl,
        short_url: shortUrl
      });
    });
  } catch (err) {
    return res.json({ error: 'invalid url' });
  }
});

// GET - Redirect
app.get('/api/shorturl/:short_url', (req, res) => {
  const short = parseInt(req.params.short_url, 10);

  if (urlDatabase[short]) {
    return res.redirect(urlDatabase[short]);
  } else {
    return res.json({ error: 'invalid url' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
