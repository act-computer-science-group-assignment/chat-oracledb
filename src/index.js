const express = require('express');
const oracledb = require('oracledb');
const morgan = require('morgan');
const cors = require('cors');
const usersRoutes = require('./routes/users');
const roomsRoutes = require('./routes/rooms');
const messagesRoutes = require('./routes/messages');
const userRoomRoutes = require('./routes/user-room');
require('dotenv').config();

const dbConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  connectString: process.env.DB_CONNECT_STRING,
  autoCommit: true,

};

const app = express();
app.use(express.json());
app.use(cors());
app.use(morgan('dev'));

oracledb.createPool(dbConfig).then((pool) => {
  console.log('Connected to the Oracle Database');
  app.locals.oraclePool = pool;
}).catch((error) => {
  console.error('Database connection error:', error);
});

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

app.use('/api/rooms', roomsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/user-room', userRoomRoutes);
