const express = require('express');
const router = express.Router();
const { importCollectionFromDiscogs } = require('../utils/discogs');
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
});

// Route to display the import form
router.get('/', limiter, (req, res) => {
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
      <label for="apiToken">Discogs API Token:</label>
      <input type="password" id="apiToken" name="apiToken" required>
      <label for="overwrite">
        <input type="checkbox" id="overwrite" name="overwrite" value="true"> Overwrite existing data
      </label>
      <button type="submit" class="action-button" name="importButton">Import Collection</button>
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
  const { userId, apiToken, overwrite } = req.body;
  try {
    const newAlbumsCount = await importCollectionFromDiscogs(userId, apiToken, overwrite);
    res.send(`
      <script name="importAlert">
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