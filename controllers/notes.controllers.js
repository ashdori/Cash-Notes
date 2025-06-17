const Notes = require('../models/notes.models');
const generatePagination = require('../utils/paginationHelper');

module.exports = {
  addNotes: async (req, res, next) => {
    try {
      let { title, date, amount, description, user } = req.body;
      // create notes
      let createNotes = await Notes.create({
        title,
        amount,
        description,
        date,
        user,
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

      let getNote = await Notes.findById(req.params.id);

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
      let getNote = await Notes.find({});

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

  getAllNotesPagination: async (req, res, next) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;

      const totalItems = await Notes.countDocuments({});
      const paginationInfo = generatePagination(totalItems, page, limit);

      const getNote = await Notes.find({})
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

  handleGetAllNotes: async (req, res, next) => {
    if (req.query.page || req.query.limit) {
      return module.exports.getAllNotesPagination(req, res, next);
    } else {
      return module.exports.getAllNotes(req, res, next);
    }
  },

  searchNotes: async (req, res, next) => {
    try {
      const {
        q,
        title,
        description,
        startDate,
        endDate,
        minAmount,
        maxAmount,
        page,
        limit,
      } = req.query;

      let queryConditions = {};

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
        queryConditions.title = { $regex: title.trim(), $options: 'i' };
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
      if (!hasSearchParam) {
        return res.status(400).json({
          success: false,
          message:
            'At least one search parameter (q, title, description, startDate, endDate, minAmount, maxAmount) is required.',
          data: null,
        });
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

  updateNotes: async (req, res, next) => {
    try {
      let putNotes = await Notes.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
      });

      //success response
      res.status(201).json({
        status: true,
        message: 'Update successfully',
        data: {
          putNotes,
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
