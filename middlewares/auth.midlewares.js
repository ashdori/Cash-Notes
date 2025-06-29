const jwt = require('jsonwebtoken');
const User = require('../models/user.models');
const { JWT_SECRET_KEY } = process.env;

module.exports = {
  restrict: async (req, res, next) => {
    let { authorization } = req.headers;

    if (!authorization) {
      return res.status(401).json({
        status: false,
        message: 'Unauthorized',
        error: 'Authorization header missing. Please provide a token.',
        data: null,
      });
    }

    const tokenParts = authorization.split(' ');
    if (tokenParts.length !== 2 || tokenParts[0] !== 'Bearer') {
      return res.status(401).json({
        status: false,
        message: 'Unauthorized',
        error: 'Invalid token format. Must be "Bearer <token>".',
        data: null,
      });
    }

    let token = tokenParts[1];

    jwt.verify(token, JWT_SECRET_KEY, async (err, decoded) => {
      if (err) {
        let errorMessage = 'Invalid token.';
        if (err.name === 'TokenExpiredError') {
          errorMessage = 'Token expired.';
        } else if (err.name === 'JsonWebTokenError') {
          errorMessage = 'Invalid token.';
        }
        return res.status(401).json({
          status: false,
          message: 'Unauthorized',
          error: errorMessage,
          data: null,
        });
      }

      try {
        const user = await User.findById(decoded.id);

        if (!user) {
          return res.status(401).json({
            status: false,
            message: 'Unauthorized',
            error: 'User associated with token not found.',
            data: null,
          });
        }

        req.user = user;
        next();
      } catch (dbError) {
        console.error('Database error during token verification:', dbError);
        return res.status(500).json({
          status: false,
          message: 'Internal Server Error',
          error: 'Database error during user retrieval.',
          data: null,
        });
      }
    });
  },
};
