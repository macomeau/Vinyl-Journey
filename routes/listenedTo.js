const express = require('express');
const router = express.Router();
const { markAsListened } = require('../db/database'); // Ensure this path is correct

// Route to handle marking an album as listened
router.get('/:id', async (req, res) => {
  const albumId = req.params.id;
  const comment = req.query.comment || 'No Comments.';

  try {
    await markAsListened(albumId, comment);
    res.redirect(`/albumNotes/${albumId}`);
  } catch (error) {
    console.error('Error marking album as listened:', error);
    res.status(500).send('An error occurred while marking the album as listened.');
  }
});

module.exports = router; 