const Router = require('express');
const {
  addNotes,
  getNotesById,
  getAllNotes,
  getAllNotesPagination,
  searchNotes,
  archiveNote,
  unarchiveNote,
  trashNote,
  restoreNoteFromTrash,
  getArchivedNotes,
  getTrashedNotes,
  updateNotes,
  removeNotes,
} = require('../controllers/notes.controllers');

const notesRouter = Router();

// --- Core CRUD Operations ---
// create a new note
notesRouter.post('/create', addNotes);

// get a specific note by its ID (only active or archived notes)
notesRouter.get('/:id', getNotesById);

// update a note by its ID
notesRouter.put('/:id', updateNotes);

// permanently remove a note by its ID (primarily for trashed notes)
notesRouter.delete('/:id', removeNotes);

// --- Get Notes by Status & Search ---
// get all active notes (without pagination)
notesRouter.get('/', getAllNotes);

// get all active notes with pagination
notesRouter.get('/paginated', getAllNotesPagination);

// enhanced searching of notes (default: active, can include archived)
notesRouter.get('/search', searchNotes);

// --- Archive Operations ---
// archive a note by ID
notesRouter.put('/archive/:id', archiveNote);

// unarchive a note by ID (move from archived to active)
notesRouter.put('/unarchive/:id', unarchiveNote);

// get all archived notes with pagination
notesRouter.get('/archived', getArchivedNotes);

// --- Trash (Soft Delete) Operations ---
// move a note to trash by ID
notesRouter.put('/trash/:id', trashNote);

// restore a note from trash by ID (move from trashed to active)
notesRouter.put('/restore/:id', restoreNoteFromTrash);

// get all notes currently in trash with pagination
notesRouter.get('/trashed', getTrashedNotes);

module.exports = notesRouter;