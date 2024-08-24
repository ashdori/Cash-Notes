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

      // Generate JWT
      const token = jwt.sign(
        { email },
        JWT_SECRET_KEY,
        { expiresIn: '1h' }
      );

      // Create user with JWT
      let createUser = await User.create({
        username,
        email,
        password: encryptedPassword,
        refreshToken: token
      });

      // success response
      res.status(201).json({
        status: true,
        message: 'Register successfully.',
        data: {
          createUser: {
            username: createUser.username,
            email: createUser.email,
          },
          jwt: token,
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

      let isPasswordCorrect = await bcrypt.compare(password, userLogin.password);
      if (!isPasswordCorrect) {
        return res.status(400).json({
          status: false,
          message: 'Bad Request',
          error: 'Invalid Email or Password',
        });
      }

      const authHeader = req.headers['authorization'];
      const token = authHeader && authHeader.split(' ')[1];
  
      if (!token || token !== userLogin.refreshToken) {
        return res.status(401).json({
          status: false,
          message: 'Unauthorized',
          error: 'Invalid token.',
          data: null,
        });
      }

      // success response
      return res.status(200).json({
        status: true,
        message: 'Login successfully.',
        data: {
          user: {
            username: userLogin.username,
            email: userLogin.email,
          },
          jwt: token,
        },
      });
    } catch (error) {
      next(error);
    }
  },
};
