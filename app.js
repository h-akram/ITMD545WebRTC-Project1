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

const namespaces = io.of(/^\/[0-9]{6}$/);

namespaces.on('connection', function(socket) {
    const namespace = socket.nsp;
    socket.broadcast.emit('connected peer');
    })
});

module.exports = { app, io };
