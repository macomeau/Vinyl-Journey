const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const axios = require('axios'); // For making HTTP requests
const fs = require('fs'); // For file system operations
const app = express();

// Middleware to parse form data
app.use(bodyParser.urlencoded({ extended: true }));

// Function to create a new database connection
function createDatabase() {
  return new sqlite3.Database('./vinyl.db', (err) => {
    if (err) {
      console.error(err.message);
    }
    console.log('Connected to the vinyl database.');
  });
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
      }
    });
  });
}

// Function to import collection from Discogs
async function importCollectionFromDiscogs(userId, token, overwrite) {
  const url = `https://api.discogs.com/users/${userId}/collection/folders/0/releases?token=${token}&page=1&per_page=100`;
  try {
    const response = await axios.get(url);
    const releases = response.data.releases;

    // Log the entire response to inspect its structure
    console.log('API Response:', JSON.stringify(response.data, null, 2));

    const db = createDatabase();
    createAlbumsTable(db);
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
      // console.log(`Importing album: ${artist} - ${title}, Cover Image: ${coverImage}, Discogs URL: ${discogsUrl}`);

      // Insert or replace the album record in the database
      db.run(`INSERT OR REPLACE INTO albums (artist, title, year, cover_image, discogs_url) VALUES (?, ?, ?, ?, ?)`, 
        [artist, title, year, coverImage, discogsUrl], (err) => {
          if (err) {
            console.error('Error inserting or updating album:', err.message);
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
  </style>
`;

// Route handler for the root URL
app.get('/', async (req, res) => {
  const db = createDatabase();
  createAlbumsTable(db);
  
  // Get the sort parameter from the query string
  const sort = req.query.sort || 'artist'; // Default sort by artist
  const order = req.query.order || 'ASC'; // Default order ascending

  // Query to get the total count of albums
  db.all('SELECT COUNT(*) AS count FROM albums', [], async (err, countResult) => {
    if (err) {
      return console.error(err.message);
    }
    
    const albumCount = countResult[0].count; // Get the count from the result

    // Query to get the album details with sorting
    db.all(`SELECT * FROM albums ORDER BY ${sort} ${order}`, [], async (err, rows) => {
      if (err) {
        return console.error(err.message);
      }
      
      let albumList = await Promise.all(rows.map(async (row) => {
        return `
          <div class="root-album-card">
            <h3>${row.artist} (${row.year})</h3> <!-- Updated to include release year -->
            ${row.cover_image ? `<img src="${row.cover_image}" alt="${row.title} cover" style="width:100%;height:auto;">` : ''}
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
        <h2>My Albums (${albumCount}):</h2>
        <div>
          <label for="sort">Sort by:</label>
          <select id="sort" onchange="sortAlbums()">
            <option value="artist" ${sort === 'artist' ? 'selected' : ''}>Artist</option>
            <option value="title" ${sort === 'title' ? 'selected' : ''}>Album Name</option>
            <option value="year" ${sort === 'year' ? 'selected' : ''}>Release Year</option>
          </select>
          <select id="order" onchange="sortAlbums()">
            <option value="ASC" ${order === 'ASC' ? 'selected' : ''}>Ascending</option>
            <option value="DESC" ${order === 'DESC' ? 'selected' : ''}>Descending</option>
          </select>
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
        </script>
      `);
    });
  });
});

// Route to display a random album
app.get('/randomAlbum', async (req, res) => {
  const db = createDatabase();
  createAlbumsTable(db);

  db.all('SELECT * FROM albums ORDER BY RANDOM() LIMIT 1', [], (err, rows) => {
    if (err) {
      return console.error(err.message);
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
        </div>
      </div>
      <div class="footer-bar">
        <button onclick="location.href='/importCollection'" class="action-button">Import Collection from Discogs</button>
        <button onclick="location.href='/'" class="action-button">Back to Album List</button>
      </div>
    `);
  });
});

// Route to display the import form
app.get('/importCollection', (req, res) => {
  res.send(`
    ${styles}
    <h1>Import Collection from Discogs</h1>
    <form id="importForm" action="/importCollection" method="POST" onsubmit="return confirmOverwrite();">
      <label for="userId">Discogs User ID:</label>
      <input type="text" id="userId" name="userId" required>
      <label for="token">Discogs API Token:</label>
      <input type="text" id="token" name="token" required>
      <label for="overwrite">Overwrite existing data:</label>
      <input type="checkbox" id="overwrite" name="overwrite" value="true">
      <button type="submit">Import Collection</button>
    </form>
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
  }

  await importCollectionFromDiscogs(userId, token, overwrite);
  res.redirect('/'); // Redirect to the root page after importing
});

// Start the server
app.listen(3333, () => {
  console.log('Server running on port 3333');
});
