const express = require('express');
const router = express.Router();
const { createDatabase } = require('../db/database');
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
});

// Route to display a random album
router.get('/', limiter, async (req, res) => {
  console.log('Accessing random album route');
  const db = createDatabase();

  db.all('SELECT * FROM albums ORDER BY RANDOM() LIMIT 1', [], (err, rows) => {
    if (err) {
      console.error(err.message);
      return res.status(500).send('Database error');
    }
    if (rows.length === 0) {
      return res.send('No albums found in the database.');
    }
    const row = rows[0];
    res.send(`
      <head>
        <link rel="stylesheet" type="text/css" href="/styles.css">
        <title>Vinyl Journey</title>
      </head>
      <div class="container">
        <div class="random-album-card">
          <h3>${row.artist} (${row.year})</h3>
          ${row.cover_image ? `<img src="${row.cover_image}" alt="${row.title} cover">` : ''}
          <p>${row.title}</p>
          <p>
            <a class="discogs-button" href="${row.discogs_url}" target="_blank">View on Discogs</a>
          </p>
          <button onclick="location.href='/albumNotes/${row.id}'" class="action-button">Listen</button>
        </div>
      </div>
      <div class="footer-bar">
        <button onclick="location.href='/importCollection'" class="action-button">Import Collection from Discogs</button>
        <button onclick="location.href='/'" class="action-button">Back to Album List</button>
      </div>
    `);
  });
});

module.exports = router; 