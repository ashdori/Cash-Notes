const Router = require('express');
const {
  addNotes,
  updateNotes,
  removeNotes,
} = require('../controllers/notes.controllers');

const notesRouter = Router();

notesRouter.post('/create', addNotes);
notesRouter.put('/update', updateNotes);
notesRouter.delete('/remove', removeNotes);

module.exports = notesRouter;
