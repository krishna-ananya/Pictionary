var express = require('express')
var app  = express()
var http = require('http').Server(app)
var io = require('socket.io')(http)

app.set('views', './views')
app.set('view engine','ejs')
app.use(express.static('public'))
app.use(express.urlencoded({extended: true}))

const rooms = {}


var words = [
    "word", "letter", "number", "person", "pen", "police", "people",
    "sound", "water", "breakfast", "place", "man", "men", "woman", "women", "boy",
    "land", "home", "hand", "house", "picture", "animal", "mother", "father","pigeon"
];

function newWord() {
    wordcount = Math.floor(Math.random() * (words.length));
    return words[wordcount];
};
var wordcount;

//default app route when no rooms availbale or when server started
app.get('/', (req,res)=>{
    let count = Object.keys(rooms).length
    res.render('index', { rooms : rooms, roomCount: count})
})

//app route to create new room 
app.post('/room', (req, res)=>{
    if(rooms[req.body.room]!=null){
        return res.redirect('/')
    }
    rooms[req.body.room] = { users: {}, drawer : [], guessers: [] , password: req.body.password, timer: req.body.timer, players : req.body.players, drawerCount:0}
    //console.log(rooms)
    //console.log(Object.keys(rooms).length);

    res.redirect(req.body.room)
    io.emit('room-created', req.body.room)
})

//app route to get the room when there are multiple rooms based on socket id
app.get('/:room', (req,res)=>{
    if(rooms[req.params.room]==null){
        return res.redirect('/')
    }
    res.render('room', {roomName: req.params.room})
})

//port that server listens on: 3000
http.listen(3000, ()=>{
    console.log('listening to port 3000')
})

//messaging action between users, broadcast chat message to other users in the room 
io.on('connection', (socket) => {
    io.emit('roomlist', rooms);
    socket.on('new-user', (room, name) => {
        socket.join(room)
        rooms[room].users[socket.id] = name
        //console.log(rooms[room])
        //if user is the first one to join the room
        if(rooms[room].drawer.length === 0){
            rooms[room].drawer.push(socket.id)
            console.log("emitting drawer")
        } else {
            rooms[room].guessers.push(socket.id)
        }
        //console.log("server.js "+rooms[room].drawer[0])
        io.in(room).emit('drawer', rooms[room].drawer[0])
        socket.to(room).broadcast.emit('user-connected', name)
    })
    socket.on('drawing-on-canvas', (room, clickX, clickY, clickDrag,action)=>{
        socket.to(room).broadcast.emit('redraw', {clickX: clickX ,clickY: clickY ,clickDrag: clickDrag , action: action,name: rooms[room].users[socket.id]})
    })
    socket.on('clear-canvas', (room, clickX, clickY, clickDrag,action)=>{
        socket.to(room).broadcast.emit('clear', {clickX: clickX ,clickY: clickY ,clickDrag: clickDrag , action: action,name: rooms[room].users[socket.id]})
    })
    socket.on('guess-word', function(data) {
        io.emit('guess-word', { username: rooms[data.room].users[data.id], guessword: data.guessword})
        console.log('guessword event triggered from: ' + rooms[data.room].users[data.id] + ' with word: ' + data.guessword)
    })

    socket.on('next-drawer', function(room){
        room.guessers.push(room.drawer[0])
        room.drawer.splice(0, room.drawer.length)
        room.drawer.push(room.guessers[0])
        room.guessers.remove(room.drawer[0])
        socket.to(room).emit('drawer', {room:room, user: room.drawer[0], guessWord:newWord()})
    })
    socket.on('send-chat-message', (room, message)=>{
        socket.to(room).broadcast.emit('chat-message', {message: message , name: rooms[room].users[socket.id]})
    })
    socket.on('disconnect', ()=>{
        getUserRooms(socket).forEach(room=>{
            socket.to(room).broadcast.emit('user-disconnected', rooms[room].users[socket.id])
            delete rooms[room].users[socket.id]
        })
    })
})

function getUserRooms(socket){
    return Object.entries(rooms).reduce((names, [name, room])=>{
        if(room.users[socket.id] != null){
            names.push(name)
        }
        return names
    },[])
}