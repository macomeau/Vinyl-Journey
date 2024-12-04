const axios = require('axios');
const { createDatabase, addCommentColumn } = require('../db/database');

async function importCollectionFromDiscogs(userId, token, overwrite) {
  const url = `https://api.discogs.com/users/${userId}/collection/folders/0/releases?token=${token}&page=1&per_page=100`;
  try {
    console.log(`Fetching collection from Discogs for user: ${userId}`);
    const response = await axios.get(url);
    const releases = response.data.releases;

    console.log('API Response:', JSON.stringify(response.data, null, 2));

    const db = createDatabase();
    addCommentColumn(db);
    // ... existing code for importing albums ...
    db.close();

    return newAlbumsCount;
  } catch (error) {
    console.error('Error fetching collection from Discogs:', error);
    throw error;
  }
}

module.exports = {
  importCollectionFromDiscogs
}; 