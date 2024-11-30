const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const axios = require('axios'); // For making HTTP requests
const fs = require('fs'); // For file system operations
const app = express();

// Middleware to parse form data
app.use(bodyParser.urlencoded({ extended: true }));

// Middleware to log incoming requests
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} Request to ${req.url}`);
  next();
});

// Function to create a new database connection
function createDatabase() {
  const db = new sqlite3.Database('./vinyl.db', (err) => {
    if (err) {
      console.error(err.message);
    }
    console.log('Connected to the vinyl database.');
  });
  createAlbumsTable(db); // Ensure albums table is created
  createNotesTable(db);   // Ensure notes table is created
  return db;
}

// Function to create the albums table if it doesn't exist
function createAlbumsTable(db) {
  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS albums (
      id INTEGER PRIMARY KEY,
      artist TEXT,
      title TEXT,
      year INTEGER,
      cover_image TEXT,
      discogs_url TEXT
    )`, (err) => {
      if (err) {
        console.error('Error creating albums table:', err.message);
      } else {
        console.log('Albums table checked/created successfully.');
      }
    });
  });
}

// Function to create the notes table if it doesn't exist
function createNotesTable(db) {
  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      album_id INTEGER,
      text TEXT,
      timestamp TEXT,
      FOREIGN KEY (album_id) REFERENCES albums (id)
    )`, (err) => {
      if (err) {
        console.error('Error creating notes table:', err.message);
      } else {
        console.log('Notes table checked/created successfully.');
      }
    });
  });
}

// Function to import collection from Discogs
async function importCollectionFromDiscogs(userId, token, overwrite) {
  const url = `https://api.discogs.com/users/${userId}/collection/folders/0/releases?token=${token}&page=1&per_page=100`;
  try {
    console.log(`Fetching collection from Discogs for user: ${userId}`);
    const response = await axios.get(url);
    const releases = response.data.releases;

    // Log the entire response to inspect its structure
    console.log('API Response:', JSON.stringify(response.data, null, 2));

    const db = createDatabase();
    createAlbumsTable(db);
    createNotesTable(db);
    console.log(`Total releases fetched from Discogs: ${releases.length}`);
    
    // Iterate through each release and extract relevant information
    for (const release of releases) {
      const artist = release.basic_information.artists[0].name; // Get the artist name
      const title = release.basic_information.title; // Get the album title
      const year = release.basic_information.year; // Get the release year
      const coverImage = release.basic_information.cover_image; // Get the cover image URL
      const id = release.basic_information.id; // Get the Discogs ID

      // Construct the Discogs URL
      const discogsUrl = `https://www.discogs.com/release/${id}-${title.replace(/\s+/g, '-').replace(/[^\w-]/g, '')}`;

      // Debugging log to check values being imported
      console.log(`Importing album: ${artist} - ${title}, Cover Image: ${coverImage}, Discogs URL: ${discogsUrl}`);

      // Insert or replace the album record in the database
      db.run(`INSERT OR REPLACE INTO albums (artist, title, year, cover_image, discogs_url) VALUES (?, ?, ?, ?, ?)`, 
        [artist, title, year, coverImage, discogsUrl], (err) => {
          if (err) {
            console.error('Error inserting or updating album:', err.message);
          } else {
            console.log(`Album imported: ${artist} - ${title}`);
          }
      });
    }
    db.close(); // Close the database connection
  } catch (error) {
    console.error('Error fetching collection from Discogs:', error);
  }
}

// CSS styles for the application
const styles = `
  <style>
    body {
      font-family: Arial, sans-serif;
      background-color: #f4f4f4;
      color: #333;
      margin: 0;
      padding: 20px;
      padding-bottom: 60px; /* Add padding to avoid content being hidden behind the footer */
    }
    h1 {
      color: #4CAF50;
      text-align: center; /* Center the header */
    }
    h2 {
      color: #333;
      margin: 0; /* Remove default margin */
    }
    a {
      color: #4CAF50;
      text-decoration: none;
    }
    a:hover {
      text-decoration: underline;
    }
    .action-button {
      background-color: #4CAF50; /* Green background */
      color: white; /* White text */
      border: none; /* No border */
      padding: 10px 15px; /* Padding for button */
      border-radius: 5px; /* Rounded corners */
      cursor: pointer; /* Pointer cursor on hover */
      margin: 5px; /* Margin between buttons */
    }
    .action-button:hover {
      background-color: #45a049; /* Darker green on hover */
    }
    /* Modern styles for sort and filter */
    .sort-filter-container {
      display: flex;
      justify-content: center; /* Center the sort/filter controls */
      align-items: center; /* Align items vertically */
      margin-bottom: 20px; /* Space below the controls */
    }
    .sort-filter-container label {
      margin-right: 10px; /* Space between label and dropdown */
      font-weight: bold; /* Bold label */
    }
    .sort-filter-container select,
    .sort-filter-container input {
      padding: 10px; /* Padding for inputs */
      border: 1px solid #ccc; /* Border for inputs */
      border-radius: 5px; /* Rounded corners */
      margin-right: 10px; /* Space between inputs */
      font-size: 16px; /* Font size for inputs */
      transition: border-color 0.3s; /* Smooth transition for border color */
    }
    .sort-filter-container select:focus,
    .sort-filter-container input:focus {
      border-color: #4CAF50; /* Change border color on focus */
      outline: none; /* Remove default outline */
    }
    /* Card styles for the random album page */
    .random-album-card {
      background: #fff;
      border-radius: 5px;
      box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
      margin: 10px;
      padding: 20px; /* Adjusted padding for tighter card */
      text-align: center;
      display: inline-block;
      width: auto; /* Set width to auto to fit content */
      max-width: 320px; /* Set a maximum width slightly wider than the album cover */
      height: auto; /* Allow height to adjust based on content */
    }
    .random-album-card h3 {
      margin: 10px 0; /* Reduced margin for tighter spacing */
      font-size: 2em; /* Increased font size */
    }
    .random-album-card p {
      margin: 5px 0; /* Reduced margin for tighter spacing */
      font-size: 1.2em; /* Adjusted font size */
    }
    .random-album-card img {
      max-width: 100%; /* Ensure the image does not exceed the card width */
      max-height: 300px; /* Set a maximum height for the image */
      object-fit: cover; /* Maintain aspect ratio and cover the area */
    }
    /* Card styles for the root page */
    .root-album-card {
      background: #fff;
      border-radius: 5px;
      box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
      margin: 10px;
      padding: 15px; /* Reduced padding for tighter card */
      text-align: center;
      display: inline-block;
      width: 300px; /* Width for root album card */
      height: auto; /* Allow height to adjust based on content */
    }
    .root-album-card h3 {
      margin: 5px 0; /* Reduced margin for tighter spacing */
      font-size: 1.5em; /* Adjusted font size */
    }
    .root-album-card p {
      margin: 5px 0; /* Reduced margin for tighter spacing */
      font-size: 1em; /* Adjusted font size */
    }
    .footer-bar {
      position: fixed; /* Fixed position */
      bottom: 0; /* Align to the bottom */
      left: 0; /* Align to the left */
      right: 0; /* Align to the right */
      background-color: #f4f4f4; /* Background color */
      padding: 10px; /* Padding for the footer */
      display: flex; /* Use flexbox for layout */
      justify-content: space-between; /* Space between buttons */
      box-shadow: 0 -2px 5px rgba(0, 0, 0, 0.1); /* Shadow for the footer */
    }
    .container {
      display: flex;
      justify-content: center; /* Center the card horizontally */
      align-items: flex-start; /* Align items to the top */
      height: auto; /* Allow height to adjust based on content */
      margin-top: 20px; /* Add some margin at the top */
    }
    .album-list {
      display: flex;
      flex-wrap: wrap; /* Allow wrapping to multiple rows */
      justify-content: space-around; /* Space between cards */
    }
    .header-container {
      display: flex;
      justify-content: space-between; /* Space between title and sort controls */
      align-items: center; /* Center vertically */
      margin-bottom: 20px; /* Space below the header */
    }
    .sort-filter-container {
      display: flex;
      align-items: center; /* Center items vertically */
    }
    .sort-filter-container label {
      margin-right: 5px; /* Space between label and dropdown */
    }
    .sort-filter-container select {
      margin-right: 10px; /* Space between dropdowns */
      padding: 5px; /* Padding for dropdowns */
    }
    .search-container {
      text-align: center; /* Center the search input */
      margin: 10px 0; /* Space above and below the search input */
    }
    .search-container input {
      padding: 10px; /* Padding for the search input */
      border: 1px solid #ccc; /* Border for the search input */
      border-radius: 5px; /* Rounded corners */
      width: 80%; /* Width of the search input */
      max-width: 400px; /* Maximum width */
    }
    /* Styles for the import form */
    form {
      background: #fff; /* White background for the form */
      border-radius: 5px; /* Rounded corners */
      box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1); /* Shadow for the form */
      padding: 20px; /* Padding inside the form */
      max-width: 400px; /* Maximum width of the form */
      margin: 20px auto; /* Center the form */
    }
    label {
      display: block; /* Block display for labels */
      margin-bottom: 5px; /* Space below labels */
      font-weight: bold; /* Bold labels */
    }
    input[type="text"], input[type="checkbox"] {
      width: 100%; /* Full width for text inputs */
      padding: 10px; /* Padding for inputs */
      border: 1px solid #ccc; /* Border for inputs */
      border-radius: 5px; /* Rounded corners */
      margin-bottom: 15px; /* Space below inputs */
      font-size: 16px; /* Font size for inputs */
      transition: border-color 0.3s; /* Smooth transition for border color */
    }
    input[type="text"]:focus {
      border-color: #4CAF50; /* Change border color on focus */
      outline: none; /* Remove default outline */
    }
    input[type="checkbox"] {
      width: auto; /* Auto width for checkbox */
      margin-right: 10px; /* Space to the right of the checkbox */
    }
  </style>
`;

// Route handler for the root URL
app.get('/', async (req, res) => {
  console.log('Accessing root route');
  const db = createDatabase();
  createAlbumsTable(db);
  createNotesTable(db);
  
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
        ${styles}
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

// Route to display a random album
app.get('/randomAlbum', async (req, res) => {
  console.log('Accessing random album route');
  const db = createDatabase();
  createAlbumsTable(db);
  createNotesTable(db);

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
      ${styles}
      <div class="container">
        <div class="random-album-card">
          <h3>${row.artist} (${row.year})</h3>
          ${row.cover_image ? `<img src="${row.cover_image}" alt="${row.title} cover">` : ''}
          <p>${row.title}</p>
          <p>
            <a class="discogs-button" href="${row.discogs_url}" target="_blank">View on Discogs</a>
          </p>
          <button onclick="location.href='/albumNotes/${row.id}'" class="action-button">Listen & Leave Notes</button>
        </div>
      </div>
      <div class="footer-bar">
        <button onclick="location.href='/importCollection'" class="action-button">Import Collection from Discogs</button>
        <button onclick="location.href='/'" class="action-button">Back to Album List</button>
      </div>
    `);
  });
});

// Route to display album notes with saved notes
app.get('/albumNotes/:id', (req, res) => {
  const albumId = req.params.id;
  const db = createDatabase();
  createAlbumsTable(db);

  db.get('SELECT * FROM albums WHERE id = ?', [albumId], (err, row) => {
    if (err) {
      console.error(err.message);
      return res.status(500).send('Database error');
    }
    if (!row) {
      return res.send('Album not found.');
    }

    // Fetch notes from the database
    db.all('SELECT * FROM notes WHERE album_id = ?', [albumId], (err, notes) => {
      if (err) {
        console.error(err.message);
        return res.status(500).send('Database error');
      }

      const notesList = notes.map(note => `
        <div>
          <p>${note.text}</p>
          <small>Posted on: ${note.timestamp}</small> <!-- Display the local timestamp -->
        </div>
      `).join('');

      res.send(`
        ${styles}
        <h1>Leave Notes for ${row.title} by ${row.artist}</h1>
        <div class="random-album-card">
          <h3>${row.artist} (${row.year})</h3>
          ${row.cover_image ? `<img src="${row.cover_image}" alt="${row.title} cover">` : ''}
          <p>${row.title}</p>
        </div>
        <form id="notesForm" action="/saveNotes/${albumId}" method="POST">
          <label for="notes">Your Notes:</label>
          <textarea id="notes" name="notes" rows="4" style="width: 100%;"></textarea>
          <input type="hidden" id="timestamp" name="timestamp">
          <button type="submit" class="action-button">Save Notes</button>
        </form>
        <h2>Your Notes:</h2>
        <div>${notesList || 'No notes yet.'}</div>
        <div class="footer-bar">
          <button onclick="location.href='/'" class="action-button">Back to Album List</button>
        </div>
        <script>
          // Set the timestamp in local timezone when the form is loaded
          const localDate = new Date();
          document.getElementById('timestamp').value = localDate.toString(); // Store as local time string
        </script>
      `);
    });
  });
});

// Route to display the import form
app.get('/importCollection', (req, res) => {
  console.log('Accessing import collection route');
  res.send(`
    ${styles}
    <h1>Import Collection from Discogs</h1>
    <form id="importForm" action="/importCollection" method="POST" onsubmit="return confirmOverwrite();">
      <label for="userId">Discogs User ID:</label>
      <input type="text" id="userId" name="userId" required>
      <label for="token">Discogs API Token:</label>
      <input type="text" id="token" name="token" required>
      <label for="overwrite">
        <input type="checkbox" id="overwrite" name="overwrite" value="true"> Overwrite existing data
      </label>
      <button type="submit" class="action-button">Import Collection</button>
    </form>
    <div class="footer-bar">
      <button onclick="location.href='/'" class="action-button">Back to Album List</button>
    </div>
    <script>
      function confirmOverwrite() {
        const overwrite = document.getElementById('overwrite').checked;
        if (overwrite) {
          return confirm('This will overwrite existing album data. Do you want to continue?');
        }
        return true; // Proceed if not overwriting
      }
    </script>
  `);
});

// Handle form submission for importing collection
app.post('/importCollection', async (req, res) => {
  const userId = req.body.userId;
  const token = req.body.token;
  const overwrite = req.body.overwrite === 'true'; // Convert to boolean

  if (overwrite) {
    // Drop the existing database file
    fs.unlinkSync('./vinyl.db'); // Remove the database file
    console.log('Existing database file deleted.');
  }

  await importCollectionFromDiscogs(userId, token, overwrite);
  res.redirect('/'); // Redirect to the root page after importing
});

// Handle saving notes
app.post('/saveNotes/:id', (req, res) => {
  const albumId = req.params.id;
  const notes = req.body.notes;
  const timestamp = req.body.timestamp; // Get the timestamp from the form

  const db = createDatabase();
  db.run(`INSERT INTO notes (album_id, text, timestamp) VALUES (?, ?, ?)`, [albumId, notes, timestamp], function(err) {
    if (err) {
      console.error('Error saving notes:', err.message);
      return res.status(500).send('Database error');
    }
    console.log(`Notes saved for album ID ${albumId}: ${notes} (Timestamp: ${timestamp})`);
    res.redirect(`/albumNotes/${albumId}`); // Redirect back to the album notes page
  });
});

// Start the server
app.listen(3333, () => {
  console.log('Server running on port 3333');
});
