var app = require('express')();
var http = require('http').createServer(app);
var io = require('socket.io-client')(http);

app.get('/', (req, res) => {
    // res.send('<h1>Hi, Hello world</h1>');
    res.sendFile(__dirname + '/index.html');
});

io.on('connection', (socket) => {
    socket.on('user message', (msg) => {
      io.emit('user message', msg);
    });
});

http.listen(3000, ()=>{
    console.log('listening to port 3000');
});