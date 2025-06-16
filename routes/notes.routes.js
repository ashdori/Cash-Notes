const Router = require('express');
const {
  addNotes,
  getNotesById,
  handleGetAllNotes,
  searchNotes,
  updateNotes,
  removeNotes,
} = require('../controllers/notes.controllers');

const notesRouter = Router();

notesRouter.post('/create', addNotes);
notesRouter.get('/:id', getNotesById)
notesRouter.get('/', handleGetAllNotes)
notesRouter.get('/search', searchNotes)
notesRouter.put('/:id', updateNotes);
notesRouter.delete('/:id', removeNotes);

module.exports = notesRouter;
