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
  createListeningsTable(db); // Ensure listenings table is created
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

// Function to create the listenings table if it doesn't exist
function createListeningsTable(db) {
  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS listenings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      album_id INTEGER,
      listened_at TEXT,
      comment TEXT,
      FOREIGN KEY (album_id) REFERENCES albums (id)
    )`, (err) => {
      if (err) {
        console.error('Error creating listenings table:', err.message);
      } else {
        console.log('Listenings table checked/created successfully.');
      }
    });
  });
}

// Function to add the comment column if it doesn't exist
function addCommentColumn(db) {
  db.serialize(() => {
    db.run(`ALTER TABLE listenings ADD COLUMN comment TEXT`, (err) => {
      if (err) {
        console.error('Error adding comment column:', err.message);
      } else {
        console.log('Comment column added to listenings table successfully.');
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

    console.log('API Response:', JSON.stringify(response.data, null, 2));

    const db = createDatabase();
    addCommentColumn(db); // Call this function to add the comment column
    createAlbumsTable(db);
    createNotesTable(db);
    createListeningsTable(db);
    console.log(`Total releases fetched from Discogs: ${releases.length}`);
    
    let newAlbumsCount = 0; // Counter for new albums imported

    for (const release of releases) {
      const artist = release.basic_information.artists[0].name;
      const title = release.basic_information.title;
      const year = release.basic_information.year;
      const coverImage = release.basic_information.cover_image;
      const id = release.basic_information.id;

      const existingAlbum = await new Promise((resolve, reject) => {
        db.get('SELECT * FROM albums WHERE discogs_url = ?', [`https://www.discogs.com/release/${id}-${title.replace(/\s+/g, '-').replace(/[^\w-]/g, '')}`], (err, row) => {
          if (err) {
            reject(err);
          } else {
            resolve(row);
          }
        });
      });

      if (existingAlbum) {
        console.log(`Album already exists: ${artist} - ${title}. Skipping import.`);
        continue;
      }

      const discogsUrl = `https://www.discogs.com/release/${id}-${title.replace(/\s+/g, '-').replace(/[^\w-]/g, '')}`;

      console.log(`Importing album: ${artist} - ${title}, Cover Image: ${coverImage}, Discogs URL: ${discogsUrl}`);

      db.run(`INSERT INTO albums (artist, title, year, cover_image, discogs_url) VALUES (?, ?, ?, ?, ?)`, 
        [artist, title, year, coverImage, discogsUrl], (err) => {
          if (err) {
            console.error('Error inserting or updating album:', err.message);
          } else {
            console.log(`Album imported: ${artist} - ${title}`);
            newAlbumsCount++;
          }
      });
    }
    db.close();

    // Return the count of new albums imported
    return newAlbumsCount; // Return the count instead of using alert
  } catch (error) {
    console.error('Error fetching collection from Discogs:', error);
    throw error; // Rethrow the error to handle it in the calling function
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
      text-align: center; /* Center the subheader */
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
      text-align: center; /* Center the content of the album card */
      margin: 20px auto; /* Center the card with auto margins */
      padding: 15px; /* Padding for the card */
      background: #fff; /* White background for the card */
      border-radius: 5px; /* Rounded corners */
      box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1); /* Shadow for depth */
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
      height: auto; /* Maintain aspect ratio */
      border-radius: 5px; /* Rounded corners for the image */
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
    .comment-container {
      background: #fff; /* White background for comments */
      border-radius: 5px; /* Rounded corners */
      box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1); /* Shadow for depth */
      margin: 10px 0; /* Space between comments */
      padding: 15px; /* Padding inside the comment box */
      transition: transform 0.2s; /* Smooth transition for hover effect */
    }
    .comment-container:hover {
      transform: scale(1.02); /* Slightly enlarge on hover */
    }
    .comment-text {
      font-size: 1.1em; /* Slightly larger font for comments */
      margin: 0; /* Remove default margin */
    }
    .comment-timestamp {
      font-size: 0.9em; /* Smaller font for timestamp */
      color: #777; /* Lighter color for timestamp */
      margin-top: 5px; /* Space above the timestamp */
    }
    .listening-card {
      background: #fff; /* White background for the card */
      border-radius: 5px; /* Rounded corners */
      box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1); /* Shadow for depth */
      margin: 10px 0; /* Space between cards */
      padding: 15px; /* Padding inside the card */
      transition: transform 0.2s; /* Smooth transition for hover effect */
    }
    .listening-card:hover {
      transform: scale(1.02); /* Slightly enlarge on hover */
    }
  </style>
`;

// Route handler for the root URL
app.get('/', async (req, res) => {
  console.log('Accessing root route');
  const db = createDatabase();
  createAlbumsTable(db);
  
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
        <head>
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

// Route to display album notes
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

    // Fetch listenings from the database, sorted by listened_at in descending order
    db.all('SELECT * FROM listenings WHERE album_id = ? ORDER BY listened_at DESC', [albumId], (err, listenings) => {
      if (err) {
        console.error(err.message);
        return res.status(500).send('Database error');
      }

      // Limit the number of entries to show initially (5 for 1 row)
      const initialEntries = listenings.slice(0, 5);
      const totalEntries = listenings.length;

      const listeningsCards = initialEntries.map(listening => `
        <div class="listening-card" data-listened-at="${listening.listened_at}">
          <strong>Listened On:</strong> <span class="listened-time"></span><br>
          <strong>Comment:</strong> ${listening.comment || 'No Comments.'}
        </div>
      `).join('');

      res.send(`
        ${styles}
        <style>
          .listening-card {
            background: #fff;
            border: 1px solid #ccc;
            border-radius: 5px;
            padding: 10px;
            margin: 10px 0; /* Margin for spacing between cards */
            width: 100%; /* Full width for a single card per row */
            box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
            transition: transform 0.2s;
          }
          .listening-card:hover {
            transform: scale(1.02); /* Slightly enlarge on hover */
          }
          #listeningCards {
            display: flex;
            flex-direction: column; /* Stack cards vertically */
            align-items: stretch; /* Ensure cards take full width */
          }
          .button-container {
            text-align: center; /* Center buttons */
            margin: 20px 0; /* Add margin for spacing */
          }
        </style>
        <head>
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
          // Function to format the listened time in local timezone
          function formatLocalTime() {
            const cards = document.querySelectorAll('.listening-card');
            cards.forEach(card => {
              const listenedAt = card.getAttribute('data-listened-at');
              const localTime = new Date(listenedAt).toLocaleString(); // Format to local timezone
              card.querySelector('.listened-time').textContent = localTime; // Set the formatted time
            });
          }

          let currentCount = 5; // Track the current number of displayed entries

          // Call the function to format the time after the DOM is loaded
          document.addEventListener('DOMContentLoaded', formatLocalTime);

          // Function to handle the Listened To action
          function handleListenedTo(albumId) {
            const comment = document.getElementById('comment').value || 'No Comments.'; // Default to 'No Comments.' if empty
            location.href = '/listenedTo/' + albumId + '?comment=' + encodeURIComponent(comment);
          }

          // Function to load more entries
          function loadMore() {
            const allEntries = ${JSON.stringify(listenings)}; // Pass all entries to the client
            const newEntries = allEntries.slice(currentCount, currentCount + 5); // Load 5 more entries
            const cardsContainer = document.getElementById('listeningCards');

            newEntries.forEach(listening => {
              const card = document.createElement('div');
              card.className = 'listening-card';
              card.setAttribute('data-listened-at', listening.listened_at);
              card.innerHTML = '<strong>Listened On:</strong> <span class="listened-time"></span><br>' +
                              '<strong>Comment:</strong> ' + (listening.comment || 'No Comments.');
              cardsContainer.appendChild(card);
            });

            currentCount += newEntries.length; // Update the current count

            // Call the function to format the time for new entries
            formatLocalTime();

            // Hide the "More" button if there are no more entries
            if (currentCount >= allEntries.length) {
              document.getElementById('loadMore').style.display = 'none';
            }
          }
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

// Route to handle the import request
app.post('/importCollection', async (req, res) => {
  const { userId, token, overwrite } = req.body;
  try {
    const newAlbumsCount = await importCollectionFromDiscogs(userId, token, overwrite);
    // Send a response back to the client
    res.send(`
      <script>
        alert('${newAlbumsCount} new album(s) imported successfully!');
        window.location.href = '/'; // Redirect to the home page or wherever you want
      </script>
    `);
  } catch (error) {
    console.error('Error during import:', error);
    res.status(500).send('An error occurred during the import process.');
  }
});

// Route to handle the listened to button click
app.get('/listenedTo/:id', (req, res) => {
  const albumId = req.params.id;
  const db = createDatabase();

  const listenedAt = new Date().toISOString(); // Get the current timestamp
  const comment = req.query.comment; // Get the comment from the query string

  console.log(`Received comment: ${comment}`); // Log the received comment

  // Insert the listening record with the comment
  db.run(`INSERT INTO listenings (album_id, listened_at, comment) VALUES (?, ?, ?)`, [albumId, listenedAt, comment], function(err) {
    if (err) {
      console.error('Error recording listening:', err.message);
      return res.status(500).send('Database error');
    }

    console.log(`Recorded listening for album ID ${albumId} at ${listenedAt} with comment: ${comment}`);
    res.redirect(`/albumNotes/${albumId}`); // Redirect back to the album notes page
  });
});

// Start the server
app.listen(3333, () => {
  console.log('Server running on port 3333');
});
