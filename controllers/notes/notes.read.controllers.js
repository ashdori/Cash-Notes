const Notes = require('../../models/notes.models');
const generatePagination = require('../../utils/paginationHelper');

module.exports = {
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
};
