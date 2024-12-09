const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const { createDatabase } = require('./db/database');
const app = express();

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Routes
const indexRoutes = require('./routes/index');
const randomAlbumRoutes = require('./routes/randomAlbum');
const albumNotesRoutes = require('./routes/albumNotes');
const importCollectionRoutes = require('./routes/importCollection');
const listenedToRouter = require('./routes/listenedTo');

app.use('/', indexRoutes);
app.use('/randomAlbum', randomAlbumRoutes);
app.use('/albumNotes', albumNotesRoutes);
app.use('/importCollection', importCollectionRoutes);
app.use('/listenedTo', listenedToRouter);

createDatabase(); // Initialize the database

// Start the server
app.listen(3333, '0.0.0.0', () => {
  console.log('Server running on port 3333');
});
