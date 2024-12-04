const express = require('express');
const router = express.Router();
const { createDatabase } = require('../db/database');

// Route handler for the root URL
router.get('/', async (req, res) => {
  console.log('Accessing root route');
  const db = createDatabase();
  
  // Get the sort parameter from the query string
  const sort = req.query.sort || 'artist'; // Default sort by artist
  const order = req.query.order || 'ASC'; // Default order ascending

  // Query to get the total count of albums
  db.all('SELECT COUNT(*) AS count FROM albums', [], async (err, countResult) => {
    if (err) {
      console.error(err.message);
      return res.status(500).send('Database error');
    }
    
    const albumCount = countResult[0].count; // Get the count from the result

    // Query to get the album details with sorting
    db.all(`SELECT * FROM albums ORDER BY ${sort} ${order}`, [], async (err, rows) => {
      if (err) {
        console.error(err.message);
        return res.status(500).send('Database error');
      }
      
      let albumList = await Promise.all(rows.map(async (row) => {
        return `
          <div class="root-album-card" data-artist="${row.artist.toLowerCase()}" data-title="${row.title.toLowerCase()}">
            <h3>${row.artist} (${row.year})</h3>
            <a href="/albumNotes/${row.id}">
              ${row.cover_image ? `<img src="${row.cover_image}" alt="${row.title} cover" style="width:100%;height:auto;">` : ''}
            </a>
            <p>${row.title}</p>
            <p>
              <a class="discogs-button" href="${row.discogs_url}" target="_blank">View on Discogs</a>
            </p>
          </div>`;
      }));
      
      // Update the header to include the new title
      res.send(`
        <head>
          <link rel="stylesheet" type="text/css" href="/styles.css">
          <title>Vinyl Journey</title>
        </head>
        <h1 style="text-align: center;">Welcome to VinylJourney</h1>
        <div class="search-container" style="text-align: center; margin: 10px 0;">
          <input type="text" id="search" placeholder="Search albums..." onkeyup="liveSearch()">
        </div>
        <div class="header-container" style="display: flex; justify-content: space-between; align-items: center;">
          <h2>My Albums (${albumCount}):</h2>
          <div class="sort-filter-container">
            <label for="sort">Sort by:</label>
            <select id="sort" onchange="sortAlbums()">
              <option value="artist" ${sort === 'artist' ? 'selected' : ''}>Artist</option>
              <option value="title" ${sort === 'title' ? 'selected' : ''}>Album Name</option>
              <option value="year" ${sort === 'year' ? 'selected' : ''}>Release Year</option>
            </select>
            <label for="order">Order:</label>
            <select id="order" onchange="sortAlbums()">
              <option value="ASC" ${order === 'ASC' ? 'selected' : ''}>Ascending</option>
              <option value="DESC" ${order === 'DESC' ? 'selected' : ''}>Descending</option>
            </select>
          </div>
        </div>
        <div class="album-list">${albumList.join('')}</div>
        <div class="footer-bar">
          <button onclick="location.href='/importCollection'" class="action-button">Import Collection from Discogs</button>
          <button onclick="location.href='/randomAlbum'" class="action-button">Get a Random Album</button>
        </div>
        <script>
          function sortAlbums() {
            const sort = document.getElementById('sort').value;
            const order = document.getElementById('order').value;
            window.location.href = '/?sort=' + sort + '&order=' + order;
          }

          function liveSearch() {
            const input = document.getElementById('search').value.toLowerCase();
            const albumCards = document.querySelectorAll('.root-album-card');

            albumCards.forEach(card => {
              const artist = card.getAttribute('data-artist');
              const title = card.getAttribute('data-title');
              if (artist.includes(input) || title.includes(input)) {
                card.style.display = '';
              } else {
                card.style.display = 'none';
              }
            });
          }
        </script>
      `);
    });
  });
});

module.exports = router; 