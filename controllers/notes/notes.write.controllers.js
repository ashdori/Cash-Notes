const Notes = require('../../models/notes.models');
const generatePagination = require('../../utils/paginationHelper');

module.exports = {
  addNotes: async (req, res, next) => {
    try {
      let { title, date, amount, description, user, tags } = req.body;

      // Ensure tags is an array and filter out empty strings
      const noteTags = Array.isArray(tags)
        ? tags
            .map((tag) => (typeof tag === 'string' ? tag.trim() : ''))
            .filter((tag) => tag.length > 0)
        : [];

      // create notes
      let createNotes = await Notes.create({
        title,
        amount,
        description,
        date,
        user,
        status: 'active',
        tags: noteTags,
      });

      // success response
      res.status(201).json({
        status: true,
        message: 'Create successfully',
        data: {
          createNotes,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  // Adds a new tag to an existing note.
  addTagToNote: async (req, res, next) => {
    try {
      const { id } = req.params;
      const { tag } = req.body;

      if (!tag || typeof tag !== 'string' || tag.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Tag to add is required and must be a non-empty string.',
        });
      }

      const note = await Notes.findById(id);
      if (!note) {
        return res.status(404).json({
          success: false,
          message: 'Note not found.',
        });
      }

      const cleanedTag = tag.trim();
      if (!note.tags.includes(cleanedTag)) {
        note.tags.push(cleanedTag);
        await note.save();
      }

      res.status(200).json({
        success: true,
        message: 'Tag added successfully.',
        data: note,
      });
    } catch (error) {
      console.error('Error adding tag to note:', error);
      next(error);
    }
  },

  //  Removes a specific tag from an existing note.
  removeTagFromNote: async (req, res, next) => {
    try {
      const { id } = req.params;
      const { tag } = req.body;

      if (!tag || typeof tag !== 'string' || tag.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Tag to remove is required and must be a non-empty string.',
        });
      }

      const note = await Notes.findById(id);
      if (!note) {
        return res.status(404).json({
          success: false,
          message: 'Note not found.',
        });
      }

      const initialTagCount = note.tags.length;
      note.tags = note.tags.filter((t) => t !== tag.trim());

      if (note.tags.length === initialTagCount) {
        return res.status(404).json({
          success: false,
          message: 'Tag not found on this note.',
        });
      }

      await note.save();

      res.status(200).json({
        success: true,
        message: 'Tag removed successfully.',
        data: note,
      });
    } catch (error) {
      console.error('Error removing tag from note:', error);
      next(error);
    }
  },

  // Archives a note by updating its status to 'archived'
  archiveNote: async (req, res, next) => {
    try {
      const { id } = req.params;
      const archivedNote = await Notes.findByIdAndUpdate(
        id,
        { status: 'archived' },
        { new: true }
      );

      if (!archivedNote) {
        return res.status(404).json({
          success: false,
          message: 'Note not found.',
        });
      }
      // to ensure the note was not already trashed
      if (archivedNote.status === 'trashed') {
        return res.status(400).json({
          success: false,
          message:
            'Cannot archive a note that is in trash. Please restore it first.',
        });
      }

      res.status(200).json({
        success: true,
        message: 'Note archived successfully.',
        data: archivedNote,
      });
    } catch (error) {
      next(error);
    }
  },

  // Unarchives a note by updating its status from 'archived' to 'active'.
  unarchiveNote: async (req, res, next) => {
    try {
      const { id } = req.params;
      const unarchivedNote = await Notes.findByIdAndUpdate(
        id,
        { status: 'active' },
        { new: true }
      );

      if (!unarchivedNote) {
        return res.status(404).json({
          success: false,
          message: 'Note not found.',
        });
      }
      // Ensure it was actually an archived note
      if (unarchivedNote.status !== 'active') {
        return res.status(400).json({
          success: false,
          message: 'Note is not in archived status or is in trash.',
        });
      }

      res.status(200).json({
        success: true,
        message: 'Note unarchived successfully.',
        data: unarchivedNote,
      });
    } catch (error) {
      next(error);
    }
  },

  // Moves a note to trash by updating its status to 'trashed'.
  trashNote: async (req, res, next) => {
    try {
      const { id } = req.params;
      const trashedNote = await Notes.findByIdAndUpdate(
        id,
        { status: 'trashed' },
        { new: true }
      );

      if (!trashedNote) {
        return res.status(404).json({
          success: false,
          message: 'Note not found.',
        });
      }

      res.status(200).json({
        success: true,
        message: 'Note moved to trash successfully.',
        data: trashedNote,
      });
    } catch (error) {
      next(error);
    }
  },

  // Restores a note from trash by updating its status from 'trashed' to 'active'.
  restoreNoteFromTrash: async (req, res, next) => {
    try {
      const { id } = req.params;
      const restoredNote = await Notes.findByIdAndUpdate(
        id,
        { status: 'active' },
        { new: true }
      );

      if (!restoredNote) {
        return res.status(404).json({
          success: false,
          message: 'Note not found in trash.',
        });
      }
      // Ensure it was actually in trash
      if (restoredNote.status !== 'active') {
        return res.status(400).json({
          success: false,
          message: 'Note is not in trash status.',
        });
      }

      res.status(200).json({
        success: true,
        message: 'Note restored from trash successfully.',
        data: restoredNote,
      });
    } catch (error) {
      next(error);
    }
  },

  updateNotes: async (req, res, next) => {
    try {
      const { id } = req.params;
      let { title, date, amount, description, user, tags, status } = req.body;

      const updateData = { title, date, amount, description, user, status };

      if (tags !== undefined) {
        // Only update tags if provided in the body
        updateData.tags = Array.isArray(tags)
          ? tags
              .map((tag) => (typeof tag === 'string' ? tag.trim() : ''))
              .filter((tag) => tag.length > 0)
          : [];
      }

      let updatedNotes = await Notes.findByIdAndUpdate(
        id,
        updateData,
        { new: true, runValidators: true } // runValidators to ensure enum for status, etc.
      );

      if (!updatedNotes) {
        return res.status(404).json({
          status: false,
          message: 'Note not found.',
        });
      }

      //success response
      res.status(200).json({
        status: true,
        message: 'Update successfully',
        data: {
          updateNotes,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  removeNotes: async (req, res, next) => {
    try {
      let deleteNotes = await Notes.findByIdAndDelete(req.params.id);

      // notes check
      if (!deleteNotes) {
        return res.status(404).json({
          status: false,
          message: 'Notes is unavailable',
        });
      }

      // success response
      res.status(200).json({
        status: true,
        message: 'Delete successfully',
      });
    } catch (error) {
      next(error);
    }
  },
};
