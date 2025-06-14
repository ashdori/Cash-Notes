const Router = require('express');
const {
  addNotes,
  getNotesById,
  getAllNotes,
  updateNotes,
  removeNotes,
} = require('../controllers/notes.controllers');

const notesRouter = Router();

notesRouter.post('/create', addNotes);
notesRouter.get('/:id', getNotesById)
notesRouter.get('/', getAllNotes)
notesRouter.put('/:id', updateNotes);
notesRouter.delete('/:id', removeNotes);

module.exports = notesRouter;
