const cookieParser = require('cookie-parser');
const express = require('express');
const io = require('socket.io')();
const path = require('path');
const logger = require('morgan');

const indexRouter = require('./routes/index');
const usersRouter = require('./routes/users');

const app = express();

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);

io.on('connection', function(socket) {
    console.log('Heard a connection to the socket.io server')
});

module.exports = { app, io };
