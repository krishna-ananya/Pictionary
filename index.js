var app = require('express')();
var http = require('http').createServer(app);
var io = require('socket.io')(http);

app.get('/', (req, res) => {
    // res.send('<h1>Hi, Hello world</h1>');
    res.sendFile(__dirname + '/html5/');
});

function onConnection(socket){
    socket.on('drawing', (data) => socket.broadcast.emit('drawing',data));
}

io.on('connection',onConnection);

http.listen(3000, ()=>{
    console.log('listening to port 3000');
});