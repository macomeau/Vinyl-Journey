const axios = require('axios');
const { createDatabase, createAlbumsTable, createNotesTable, createListeningsTable } = require('../db/database');

async function importCollectionFromDiscogs(userId, token, overwrite) {
  const url = `https://api.discogs.com/users/${userId}/collection/folders/0/releases?token=${token}&page=1&per_page=500`;
  try {
    console.log(`Fetching collection from Discogs for user: ${userId}`);
    const response = await axios.get(url);
    const releases = response.data.releases;

    // console.log('API Response:', JSON.stringify(response.data, null, 2));

    const db = createDatabase();
    console.log('Database created successfully.');

    createAlbumsTable(db);
    console.log('Albums table created/checked.');

    createNotesTable(db);
    console.log('Notes table created/checked.');

    createListeningsTable(db);
    console.log('Listenings table created/checked.');

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

    return newAlbumsCount;
  } catch (error) {
    console.error('Error fetching collection from Discogs:', error);
    throw error;
  }
}

module.exports = {
  importCollectionFromDiscogs,
}; 