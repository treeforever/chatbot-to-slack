var app = require('express')();
var http = require('http').createServer(app);
var io = require('socket.io')(http);

io.on('connection', function (socket) {
    console.log('a user connected');
    socket.on('chat message', function (msg) {
        console.log('chatm', msg)
        io.emit('chat message', msg);
    });
});

http.listen(8080, function () {
    console.log('listening on *:8080');
});