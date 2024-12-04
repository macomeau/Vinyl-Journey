const sqlite3 = require('sqlite3').verbose();

function createDatabase() {
  const db = new sqlite3.Database('./vinyl.db', (err) => {
    if (err) {
      console.error(err.message);
    }
    console.log('Connected to the vinyl database.');
  });
  createAlbumsTable(db);
  createNotesTable(db);
  createListeningsTable(db);
  return db;
}

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

module.exports = {
  createDatabase,
  createAlbumsTable,
  createNotesTable,
  createListeningsTable
}; 