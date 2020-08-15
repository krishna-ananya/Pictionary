var express = require('express')
var app  = express()
var http = require('http').Server(app)
var io = require('socket.io')(http)

app.set('views', './views')
app.set('view engine','ejs')
app.use(express.static('public'))
app.use(express.urlencoded({extended: true}))

const rooms = {}

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
    rooms[req.body.room] = { users: {} , password: req.body.password, timer: req.body.timer, players : req.body.players}
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
    res.render('room', {roomName: req.params.room,isTurn:1})
})

//port that server listens on: 3000
http.listen(3000, ()=>{
    console.log('listening to port 3000')
})

//messaging action between users, broadcast chat message to other users in the room 
io.on('connection', (socket) => {
    socket.on('new-user', (room, name) => {
        socket.join(room)
        rooms[room].users[socket.id] = name
        socket.to(room).broadcast.emit('user-connected', name)
    })
    // socket.on()
    socket.on('drawing-on-canvas', (room, clickX, clickY, clickDrag,action)=>{
        socket.to(room).broadcast.emit('redraw', {clickX: clickX ,clickY: clickY ,clickDrag: clickDrag , action: action,name: rooms[room].users[socket.id]})
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