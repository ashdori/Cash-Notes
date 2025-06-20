const Notes = require('../models/notes.models');
const generatePagination = require('../utils/paginationHelper');

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

  getNotesById: async (req, res, next) => {
    try {
      let { id } = req.params;

      // find by id with active and archived status
      let getNote = await Notes.findOne({
        _id: id,
        status: { $in: ['active', 'archived'] },
      });

      if (!getNote)
        return res.status(404).json({
          success: false,
          message: 'Notes not found',
          data: null,
        });

      res.status(200).json({
        success: true,
        message: 'Notes Found',
        data: getNote,
      });
    } catch (error) {
      next(error);
    }
  },

  getAllNotes: async (req, res, next) => {
    try {
      const { sortBy, sortOrder } = req.query;

      let sortOptions = {};
      if (
        sortBy &&
        ['title', 'date', 'amount', 'createdAt', 'updatedAt'].includes(sortBy)
      ) {
        sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;
      } else {
        // Default sort if no valid sortBy or sortOrder is provided
        // Sort by creation date descending by default
        sortOptions.createdAt = -1;
      }
      // get all notes with active status
      let getNote = await Notes.find({ status: 'active' });

      if (getNote.length === 0)
        return res.status(404).json({
          success: false,
          message: 'Notes not found',
          data: null,
        });

      res.status(200).json({
        success: true,
        message: 'Notes Found',
        data: getNote,
      });
    } catch (error) {
      next(error);
    }
  },

  // find all notes with active status and with pagination
  getAllNotesPagination: async (req, res, next) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const { sortBy, sortOrder } = req.query;

      let sortOptions = {};
      if (
        sortBy &&
        ['title', 'date', 'amount', 'createdAt', 'updatedAt'].includes(sortBy)
      ) {
        sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;
      } else {
        sortOptions.createdAt = -1;
      }

      const totalItems = await Notes.countDocuments({ status: 'active' });
      const paginationInfo = generatePagination(totalItems, page, limit);

      const getNote = await Notes.find({ status: 'active' })
        .sort(sortOptions)
        .skip(paginationInfo.offset)
        .limit(paginationInfo.perPage);

      if (getNote.length === 0 && totalItems > 0) {
        return res.status(404).json({
          success: false,
          message: 'No notes found for this page.',
          data: null,
          pagination: paginationInfo,
        });
      } else if (totalItems === 0) {
        return res.status(404).json({
          success: false,
          message: 'Notes not found',
          data: null,
          pagination: paginationInfo,
        });
      }

      res.status(200).json({
        success: true,
        message: 'Notes Found',
        data: getNote,
        pagination: paginationInfo,
      });
    } catch (error) {
      next(error);
    }
  },

  searchNotes: async (req, res, next) => {
    try {
      const {
        q,
        title,
        description,
        tags,
        startDate,
        endDate,
        minAmount,
        maxAmount,
        page,
        limit,
        includeArchived,
        sortBy,
        sortOrder,
      } = req.query;

      let queryConditions = {};

      // include status
      if (includeArchived === 'true') {
        queryConditions.status = { $in: ['active', 'archived'] };
      } else {
        queryConditions.status = 'active';
      }

      if (q && typeof q === 'string' && q.trim().length > 0) {
        const searchTerm = q.trim();
        queryConditions.$or = [
          { title: { $regex: searchTerm, $options: 'i' } },
          { description: { $regex: searchTerm, $options: 'i' } },
        ];
        if (searchTerm.length < 2) {
          return res.status(400).json({
            success: false,
            message:
              'General search query (q) must be at least 2 characters long.',
            data: null,
          });
        }
      }

      if (title && typeof title === 'string' && title.trim().length > 0) {
        queryConditions.title = {
          $regex: title.trim(),
          $options: 'i',
        };
      }

      if (
        description &&
        typeof description === 'string' &&
        description.trim().length > 0
      ) {
        queryConditions.description = {
          $regex: description.trim(),
          $options: 'i',
        };
      }

      // Tag Search
      if (tags && typeof tags === 'string' && tags.trim().length > 0) {
        const tagArray = tags
          .split(',')
          .map((tag) => tag.trim())
          .filter((tag) => tag.length > 0);
        if (tagArray.length > 0) {
          queryConditions.tags = { $in: tagArray };
        }
      }

      // start date and end date
      if (startDate || endDate) {
        queryConditions.date = {};
        if (startDate) {
          const start = new Date(startDate);
          if (isNaN(start.getTime())) {
            return res.status(400).json({
              success: false,
              message: 'Invalid startDate format. Use YYYY-MM-DD.',
              data: null,
            });
          }
          queryConditions.date.$gte = start;
        }
        if (endDate) {
          const end = new Date(endDate);
          if (isNaN(end.getTime())) {
            return res.status(400).json({
              success: false,
              message: 'Invalid endDate format. Use YYYY-MM-DD.',
              data: null,
            });
          }
          end.setHours(23, 59, 59, 999);
          queryConditions.date.$lte = end; // Less than or equal to end date
        }
      }

      // max and min amount
      if (minAmount || maxAmount) {
        queryConditions.amount = {};
        if (minAmount) {
          const min = parseFloat(minAmount);
          if (isNaN(min) || min < 0) {
            return res.status(400).json({
              success: false,
              message: 'Invalid minAmount. Must be a positive number.',
              data: null,
            });
          }
          queryConditions.amount.$gte = min;
        }
        if (maxAmount) {
          const max = parseFloat(maxAmount);
          if (isNaN(max) || max < 0) {
            return res.status(400).json({
              success: false,
              message: 'Invalid maxAmount. Must be a positive number.',
              data: null,
            });
          }
          queryConditions.amount.$lte = max;
        }
      }

      const hasSearchParam =
        q ||
        title ||
        description ||
        startDate ||
        endDate ||
        minAmount ||
        maxAmount;
      if (!hasSearchParam && !includeArchived) {
        return res.status(400).json({
          success: false,
          message:
            'At least one search parameter (q, title, description, startDate, endDate, minAmount, maxAmount or includeArchived=true) is required.',
          data: null,
        });
      }

      // --- Sorting Logic ---
      let sortOptions = {};
      if (
        sortBy &&
        ['title', 'date', 'amount', 'createdAt', 'updatedAt'].includes(sortBy)
      ) {
        sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;
      } else {
        sortOptions.createdAt = -1; // Default sort for search results
      }

      const currentPage = parseInt(page) || 1;
      const recordsPerPage = parseInt(limit) || 10;

      const totalMatchingItems = await Notes.countDocuments(queryConditions);

      const paginationInfo = generatePagination(
        totalMatchingItems,
        currentPage,
        recordsPerPage
      );

      const foundNotes = await Notes.find(queryConditions)
        .sort(sortOptions)
        .skip(paginationInfo.offset)
        .limit(paginationInfo.perPage);

      if (foundNotes.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'No notes found matching your search criteria.',
          data: null,
          pagination: paginationInfo,
        });
      }

      res.status(200).json({
        success: true,
        message: 'Notes found based on your search criteria.',
        data: foundNotes,
        pagination: paginationInfo,
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

  // Gets all notes that are currently in 'archived' status.
  getArchivedNotes: async (req, res, next) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const { sortBy, sortOrder } = req.query;

      let sortOptions = {};
      if (
        sortBy &&
        ['title', 'date', 'amount', 'createdAt', 'updatedAt'].includes(sortBy)
      ) {
        sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;
      } else {
        sortOptions.createdAt = -1;
      }

      const totalItems = await Notes.countDocuments({ status: 'archived' });
      const paginationInfo = generatePagination(totalItems, page, limit);

      const archivedNotes = await Notes.find({ status: 'archived' })
        .sort(sortOptions)
        .skip(paginationInfo.offset)
        .limit(paginationInfo.perPage);

      if (archivedNotes.length === 0 && totalItems > 0) {
        return res.status(404).json({
          success: false,
          message: 'No archived notes found for this page.',
          data: null,
          pagination: paginationInfo,
        });
      } else if (totalItems === 0) {
        return res.status(404).json({
          success: false,
          message: 'No archived notes found.',
          data: null,
          pagination: paginationInfo,
        });
      }

      res.status(200).json({
        success: true,
        message: 'Archived Notes Found',
        data: archivedNotes,
        pagination: paginationInfo,
      });
    } catch (error) {
      next(error);
    }
  },

  // Gets all notes that are currently in 'trashed' status.
  getTrashedNotes: async (req, res, next) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const { sortBy, sortOrder } = req.query;

      let sortOptions = {};
      if (
        sortBy &&
        ['title', 'date', 'amount', 'createdAt', 'updatedAt'].includes(sortBy)
      ) {
        sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;
      } else {
        sortOptions.createdAt = -1;
      }

      const totalItems = await Notes.countDocuments({ status: 'trashed' });
      const paginationInfo = generatePagination(totalItems, page, limit);

      const trashedNotes = await Notes.find({ status: 'trashed' })
        .sort(sortOptions)
        .skip(paginationInfo.offset)
        .limit(paginationInfo.perPage);

      if (trashedNotes.length === 0 && totalItems > 0) {
        return res.status(404).json({
          success: false,
          message: 'No notes in trash found for this page.',
          data: null,
          pagination: paginationInfo,
        });
      } else if (totalItems === 0) {
        return res.status(404).json({
          success: false,
          message: 'Trash is empty.',
          data: null,
          pagination: paginationInfo,
        });
      }

      res.status(200).json({
        success: true,
        message: 'Notes in Trash Found',
        data: trashedNotes,
        pagination: paginationInfo,
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
