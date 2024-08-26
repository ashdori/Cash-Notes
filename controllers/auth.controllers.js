const { default: mongoose } = require('mongoose');
const User = require('../models/users.models');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { JWT_SECRET_KEY } = process.env;

module.exports = {
  // register
  register: async (req, res, next) => {
    try {
      let { username, email, password, confirmPassword } = req.body;

      // validate account
      let userExist = await User.findOne({ email });
      if (userExist) {
        return res.status(400).json({
          status: false,
          message: 'Bad request!',
          error: 'Account has been registered.',
          data: null,
        });
      }

      //validate max 50 character for username
      if (username.length > 50) {
        return res.status(400).json({
          status: false,
          message: 'Bad Request!',
          error: 'Username max 50 character.',
          data: null,
        });
      }

      // validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          status: false,
          message: 'Bad request!',
          error: 'The email format is wrong.',
          data: null,
        });
      }

      // validate password length
      if (password.length < 8 || password.length > 15) {
        return res.status(400).json({
          status: false,
          message: 'Bad request!',
          error:
            'Password should have minimum 8 character or maximum 15 character.',
          data: null,
        });
      }

      //validate password and confirmPassword
      if (password !== confirmPassword) {
        return res.status(400).json({
          status: false,
          message: 'Bad request!',
          error: "Password and Confirm Password didn't match.",
          data: null,
        });
      }

      // encrypting password
      let encryptedPassword = await bcrypt.hash(password, 10);

      // Generate refresh token
      const refreshToken = jwt.sign({ email }, JWT_SECRET_KEY, {
        expiresIn: '7d',
      });

      // Create user with refresh token
      let createUser = await User.create({
        username,
        email,
        password: encryptedPassword,
        refresh_token: refreshToken,
      });

      // Generate access token
      const accessToken = jwt.sign({ email }, JWT_SECRET_KEY, {
        expiresIn: '1h',
      });

      // Success response
      res.status(201).json({
        status: true,
        message: 'Register successfully.',
        data: {
          createUser: {
            username: createUser.username,
            email: createUser.email,
          },
          accessToken,
          refreshToken,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  // Login
  login: async (req, res, next) => {
    try {
      let { email, password } = req.body;

      // validate account
      let userLogin = await User.findOne({ email });
      if (!userLogin) {
        return res.status(400).json({
          status: false,
          message: 'Bad request!',
          error: 'Invalid Email or Password.',
          data: null,
        });
      }
      let isPasswordCorrect = await bcrypt.compare(
        password,
        userLogin.password
      );
      if (!isPasswordCorrect) {
        return res.status(400).json({
          status: false,
          message: 'Bad Request',
          error: 'Invalid Email or Password',
        });
      }

      // Generate new access token
      const accessToken = jwt.sign(
        { id: userLogin._id, email: userLogin.email },
        JWT_SECRET_KEY,
        { expiresIn: '1h' }
      );

      // success response
      return res.status(200).json({
        status: true,
        message: 'Login successfully.',
        data: {
          user: {
            username: userLogin.username,
            email: userLogin.email,
          },
          jwt: accessToken,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  // refresh token
  refreshToken: async (req, res, next) => {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(401).json({
          status: false,
          message: 'Unauthorized',
          error: 'Refresh token is required.',
          data: null,
        });
      }

      // Find user by refresh token
      const user = await User.findOne({ refresh_token: refreshToken });

      if (!user) {
        return res.status(403).json({
          status: false,
          message: 'Forbidden',
          error: 'Invalid refresh token.',
          data: null,
        });
      }

      // Verify refresh token
      jwt.verify(refreshToken, JWT_SECRET_KEY, (err, decoded) => {
        if (err) {
          return res.status(403).json({
            status: false,
            message: 'Forbidden',
            error: 'Invalid refresh token.',
            data: null,
          });
        }

        // Generate new access token
        const newAccessToken = jwt.sign(
          { id: user._id, email: user.email },
          JWT_SECRET_KEY,
          { expiresIn: '1h' }
        );

        res.json({
          status: true,
          message: 'Token refreshed successfully.',
          data: {
            accessToken: newAccessToken,
          },
        });
      });
    } catch (error) {
      next(error);
    }
  },
};
