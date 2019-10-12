const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const multer = require('multer');
const morgan = require('morgan');
const config = require('config');

const feedRoutes = require('./routes/feed');
const authRoutes = require('./routes/auth');
const winston = require('./config/winston');

const app = express();

const fileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'images');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  }
});

const fileFilter = (req, file, cb) => {
  if (
    file.mimetype === 'image/png' ||
    file.mimetype === 'image/jpg' ||
    file.mimetype === 'image/jpeg'||
    file.mimetype === 'image/webp'
  ) {
    cb(null, true);
  } else {
    cb(null, false);
  }
};
// can use combined
app.use(
  morgan('dev', {
     stream: winston.stream,
     skip: function (req, res) {        
       return req.method === "OPTIONS";
      }
  })
);

// app.use(bodyParser.urlencoded()); // x-www-form-urlencoded <form>
app.use(bodyParser.json()); // application/json
app.use(
  multer({ storage: fileStorage, fileFilter: fileFilter }).single('image')
);
app.use('/images', express.static(path.join(__dirname, 'images')));

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'OPTIONS, GET, POST, PUT, PATCH, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
});

app.use('/feed', feedRoutes);
app.use('/auth', authRoutes);

app.use((error, req, res, next) => {
  console.log("!!!!! error middleware: ", error);
  const status = error.statusCode || 500;
  const message = error.message;
  const data = error.data ? error.data : [];
  let user = "anonym";
  if (req.userId) {
    user = " userId: " + req.userId;
  }

  // this line to include winston logging
  winston.error(`${status} - ${message} - ${user} - ${req.originalUrl} - ${req.method} - ${req.ip}`);

  res.status(status).json({ message: message, data: data });
});

const dbConfig = config.get('dev.dbConfig');
mongoose
  .connect(
    `mongodb+srv://${dbConfig.login}:${dbConfig.password}@${dbConfig.host}/${dbConfig.dbName}?retryWrites=true&w=majority`,
    {
      useUnifiedTopology: true,
      useNewUrlParser: true,
      useCreateIndex: true,
    }
  )
  .then(result => {
    const server = app.listen(8080);
    const io = require('./socket').init(server);
    io.on('connection', socket => {
      console.log('Client connected');
    });
  })
  .catch(err => console.log(err));