const express = require('express');
const router = express.Router();
const { importCollectionFromDiscogs } = require('../utils/discogs');

// Route to display the import form
router.get('/', (req, res) => {
  console.log('Accessing import collection route');
  res.send(`
    <head>
      <link rel="stylesheet" type="text/css" href="/styles.css">
      <title>Import Collection</title>
    </head>
    <h1>Import Collection from Discogs</h1>
    <form id="importForm" action="/importCollection" method="POST" onsubmit="return confirmOverwrite();">
      <label for="userId">Discogs User ID:</label>
      <input type="text" id="userId" name="userId" required>
      <label for="token">Discogs API Token:</label>
      <input type="password" id="token" name="token" required>
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
        return true;
      }
    </script>
  `);
});

// Route to handle the import request
router.post('/', async (req, res) => {
  const { userId, token, overwrite } = req.body;
  try {
    const newAlbumsCount = await importCollectionFromDiscogs(userId, token, overwrite);
    res.send(`
      <script>
        alert('${newAlbumsCount} new album(s) imported successfully!');
        window.location.href = '/';
      </script>
    `);
  } catch (error) {
    console.error('Error during import:', error);
    res.status(500).send('An error occurred during the import process.');
  }
});

module.exports = router; 