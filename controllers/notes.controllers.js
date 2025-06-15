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
