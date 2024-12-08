const express = require('express');
const router = express.Router();
const { createDatabase } = require('../db/database');
const escape = require('escape-html');

// Route to display album notes
router.get('/:id', (req, res) => {
  const albumId = escape(req.params.id);
  const db = createDatabase();

  db.get('SELECT * FROM albums WHERE id = ?', [albumId], (err, row) => {
    if (err) {
      console.error(err.message);
      return res.status(500).send('Database error');
    }
    if (!row) {
      return res.send('Album not found.');
    }

    db.all('SELECT * FROM listenings WHERE album_id = ? ORDER BY listened_at DESC', [albumId], (err, listenings) => {
      if (err) {
        console.error(err.message);
        return res.status(500).send('Database error');
      }

      const initialEntries = listenings.slice(0, 5);
      const totalEntries = listenings.length;

      const listeningsCards = initialEntries.map(listening => `
        <div class="listening-card" data-listened-at="${listening.listened_at}">
          <strong>Listened On:</strong> <span class="listened-time"></span><br>
          <strong>Comment:</strong> ${listening.comment || 'No Comments.'}
        </div>
      `).join('');

      res.send(`
        <head>
          <link rel="stylesheet" type="text/css" href="/styles.css">
          <title>Vinyl Journey</title>
        </head>
        <h1>Leave Comments for ${row.title} by ${row.artist}</h1>
        <div class="random-album-card">
          <h3>${row.artist} (${row.year})</h3>
          ${row.cover_image ? `<img src="${row.cover_image}" alt="${row.title} cover">` : ''}
          <div style="text-align: center; width: 50%; margin: 0 auto;">
            <label for="comment">Your Comment:</label>
            <textarea id="comment" rows="4" style="width: 100%;"></textarea>
          </div>
          <button onclick="handleListenedTo('${albumId}')" class="action-button">Listened To</button>
        </div>
        <h2>Listening History:</h2>
        <div id="listeningHistory">
          <h3>Listening History:</h3>
          <div id="listeningCards">
            ${listeningsCards || '<div>No listenings recorded yet.</div>'}
          </div>
          <div class="button-container">
            ${totalEntries > 5 ? `<button id="loadMore" class="action-button" onclick="loadMore()">More</button>` : ''}
          </div>
        </div>
        <div class="footer-bar">
          <button onclick="location.href='/'" class="action-button">Back to Album List</button>
        </div>
        <script>
          function formatLocalTime() {
            const cards = document.querySelectorAll('.listening-card');
            cards.forEach(card => {
              const listenedAt = card.getAttribute('data-listened-at');
              const localTime = new Date(listenedAt).toLocaleString();
              card.querySelector('.listened-time').textContent = localTime;
            });
          }

          let currentCount = 5;

          document.addEventListener('DOMContentLoaded', formatLocalTime);

          function handleListenedTo(albumId) {
            const comment = document.getElementById('comment').value || 'No Comments.';
            location.href = '/listenedTo/' + albumId + '?comment=' + encodeURIComponent(comment);
          }

          function loadMore() {
            const allEntries = ${JSON.stringify(listenings)};
            const newEntries = allEntries.slice(currentCount, currentCount + 5);
            const cardsContainer = document.getElementById('listeningCards');

            newEntries.forEach(listening => {
              const card = document.createElement('div');
              card.className = 'listening-card';
              card.setAttribute('data-listened-at', listening.listened_at);
              card.innerHTML = '<strong>Listened On:</strong> <span class="listened-time"></span><br>' +
                              '<strong>Comment:</strong> ' + (listening.comment || 'No Comments.');
              cardsContainer.appendChild(card);
            });

            currentCount += newEntries.length;

            formatLocalTime();

            if (currentCount >= allEntries.length) {
              document.getElementById('loadMore').style.display = 'none';
            }
          }
        </script>
      `);
    });
  });
});

module.exports = router;