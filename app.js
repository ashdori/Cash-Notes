require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const mongoose = require('mongoose');
const app = express();
const port = process.env.PORT;

app.use(cors());
app.use(morgan("dev"))
app.use(express.json())
app.use(express.urlencoded({ extended: true }));

mongoose
.connect(process.env.MONGODB_URI, {})
.then(() => {
  console.log('Connected to MongoDB');
})
.catch((error) => {
  console.error('Error connecting to MongoDB:', error);
});

const authRouter = require('./routes/auth.routes')

app.use('/auth', authRouter);

app.use('/', (req, res) => {
  try {
    let welcomeMessage = {
      message: 'Welcome to Cash Notes',
    };
    res.json(welcomeMessage);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(port, () => {
  console.log(`listening on port ${port}`);
});
