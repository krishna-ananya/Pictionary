var express = require('express')
var app  = express()
var http = require('http').Server(app)
var io = require('socket.io')(http)

app.set('views', './views')
app.set('view engine','ejs')
app.use(express.static('public'))
app.use(express.urlencoded({extended: true}))

const rooms = {}
const userCount = {}

var guessWord;

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
    res.render('index', { rooms : rooms, roomCount: count, userCount: userCount})
})

//app route to create new room 
app.post('/room', (req, res)=>{

    if(rooms[req.body.room]!=null){
        return res.redirect('/')
    }
    if(isNaN(req.body.players)){
        req.body.players = 2
    }
    if(isNaN(req.body.timer)){
        req.body.timer = 30
    }
    rooms[req.body.room] = { users: {}, drawer : [], guessers: [] , password: req.body.password, timer: req.body.timer, players : req.body.players, drawerCount:0, currentGuessWord: ""}
    userCount[req.body.room] = 0
    res.redirect(req.body.room)
    io.emit('room-created', req.body.room)
})

//app route to get the room when there are multiple rooms based on socket id
app.get('/:room', (req,res)=>{
    if(rooms[req.params.room]==null){
        return res.redirect('/')
    }
    // console.log("current user count"+userCount[req.params.room])
    // console.log("room user count"+rooms[req.params.room].players)
    // if(userCount[req.params.room] === rooms[req.params.room].players-1) {
    //     io.emit('join-room-disable', req.params.room)
    // }
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
        rooms[room].users[socket.id] = { name:name, score:0}
        userCount[room] += 1
        //console.log(rooms[room])
        //if user is the first one to join the room
        if(rooms[room].drawer.length === 0){
            rooms[room].drawer.push(socket.id)
            guessWord = newWord()
            rooms[room].currentGuessWord = guessWord;
            rooms[room].turnId = Math.ceil(Math.random() * 100000 )
        } else {
            rooms[room].guessers.push(socket.id)
        }
        console.log("guess word assigned to first drawer :"+ guessWord)
        io.in(room).emit('drawer', {room:room, user: rooms[room].drawer[0], guessWord:guessWord,turnId:rooms[room].turnId})
        socket.to(room).broadcast.emit('user-connected', name)
    })

    socket.on('drawing-on-canvas', (room, clickX, clickY, clickDrag,action)=>{
        socket.to(room).broadcast.emit('redraw', {clickX: clickX ,clickY: clickY ,clickDrag: clickDrag , action: action,name: rooms[room].users[socket.id]})
    })
    socket.on('clear-canvas', (room, clickX, clickY, clickDrag,action)=>{
        socket.to(room).broadcast.emit('clear', {clickX: clickX ,clickY: clickY ,clickDrag: clickDrag , action: action,name: rooms[room].users[socket.id]})
    })
    socket.on('validate-password', function(roomName,passcode) {
        if(rooms[roomName].password === passcode){
            socket.emit('correct-password', true)
        }else{
            socket.emit('correct-password', false)
        }
    })

    socket.on('validate-guess-word', function(data) {
        if(data.turnId == rooms[data.room].turnId){
            if(data.guessor_val===rooms[data.room].currentGuessWord){
                rooms[data.room].users[data.guesser_id].score += 10
                rooms[data.room].users[rooms[data.room].drawer[0]].score += 5
                io.in(data.room).emit('updated-score',rooms[data.room].users)
                socket.emit('correct-guess-word', {result: true,turnId:data.turnId})
            }else{
                socket.emit('correct-guess-word', {result: false,turnId:data.turnId})
            }
        }else{
            socket.emit('correct-guess-word', {result: false,turnId:data.turnId})
        }
        console.log('guessword event triggered from: ' + rooms[data.room].users[data.guesser_id].name + ' with word: ' + rooms[data.room].currentGuessWord)
    })

    socket.on('next-drawer', function(data){
        var room = data.room;

        console.log("drawer length "+ rooms[room].drawer.length)
        console.log("guesser length "+ rooms[room].guessers.length)

        rooms[room].guessers.push(rooms[room].drawer[0])
        rooms[room].drawer.splice(0, rooms[room].drawer.length)
        rooms[room].drawer.push(rooms[room].guessers[0])
        var x = rooms[room].guessers.shift()

        //console.log("x  -" + rooms[room].users[x])
        if(data.turnId == rooms[data.room].turnId){
        
            guessWord = newWord()
            rooms[room].currentGuessWord = guessWord;
            rooms[room].turnId = Math.ceil(Math.random() * 100000 )
            
            console.log("word assigned for next drawer: "+rooms[room].users[rooms[room].drawer[0]].name+" guess word: "+guessWord)
            console.log("drawer list "+ rooms[room].drawer )
            console.log("guesser length ---- "+ rooms[room].guessers.length +" guessers "+rooms[room].guessers)

            io.in(room).emit('drawer', {room:room, user:rooms[room].drawer[0], guessWord:guessWord,turnId:rooms[room].turnId})
        }else{
            console.log("blaaaaaa ");
        }
    })

    socket.on('send-chat-message', function(data){
        console.log("entered messaging"+data.turnId+" rooms "+rooms[data.room].turnId)
        if(data.turnId == rooms[data.room].turnId){
            socket.emit('chat-message', {message: data.message , name: rooms[data.room].users[socket.id]})
        }
    })
    socket.on('disconnect', ()=>{
        getUserRooms(socket).forEach(room=>{
            socket.to(room).broadcast.emit('user-disconnected', rooms[room].users[socket.id].name)
            userCount[room] -= 1
            delete rooms[room].users[socket.id]
            if(userCount[room]===0){
                delete rooms[room]
            }
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
