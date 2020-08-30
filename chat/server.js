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

var words = readFromFile('data/wordlist.txt')

function newWord(room) {
    // return "janani krishna"
    // if the room has exhausted all the words in the dictionary reset the word used list in the room
    if(rooms[room].wordsUsed.length === words.length){
        rooms[room].wordsUsed = []
    }
    while(true){
        wordcount = Math.floor(Math.random() * (words.length));
        //check if the room has already used that word 
        if(rooms[room].wordsUsed.includes(words[wordcount])){
            continue;
        } 
        else {
            rooms[room].wordsUsed.push(words[wordcount])
            return words[wordcount];
        }
    }
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
    rooms[req.body.room] = { users: {}
                            , drawer : []
                            , guessers: [] 
                            , password: req.body.password
                            , timer: req.body.timer
                            , players : req.body.players
                            , wordsUsed : []
                            , rounds : 5
                            , userList : []
                            , currentGuessWord: ""}
    userCount[req.body.room] = 0
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
        rooms[room].users[socket.id] = { name:name, score:0 , currentRound:0}
        userCount[room] += 1
        //console.log(rooms[room])
        //if user is the first one to join the room
        if(rooms[room].drawer.length === 0){
            console.log("name: "+rooms[room].users[socket.id].name+", current round: "+rooms[room].users[socket.id].currentRound)
            rooms[room].drawer.push(socket.id)
            rooms[room].userList.push(rooms[room].drawer[0])
            guessWord = newWord(room)
            rooms[room].currentGuessWord = guessWord;
            rooms[room].turnId = Math.ceil(Math.random() * 100000 )
        } else {
            rooms[room].guessers.push(socket.id)
        }
        console.log("guess word assigned to first drawer :"+ guessWord)
        io.in(room).emit('drawer', {room:room, user: rooms[room].drawer[0], guessWord:guessWord,turnId:rooms[room].turnId, round:rooms[room].users[socket.id].currentRound})
        socket.to(room).broadcast.emit('user-connected', name)
    })

    socket.on('drawing-on-canvas', (room, clickX, clickY, clickDrag,action,width,height)=>{
        //console.log('here '+width+","+height);
        socket.to(room).broadcast.emit('redraw', {clickX: clickX ,clickY: clickY ,clickDrag: clickDrag , action: action,sWidth:width,sHeight:height,name: rooms[room].users[socket.id]})
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
            if(data.guessor_val.toLowerCase() === rooms[data.room].currentGuessWord.toLowerCase()){
                rooms[data.room].users[data.guesser_id].score += 10
                rooms[data.room].users[rooms[data.room].drawer[0]].score += 5
                io.in(data.room).emit('updated-score',rooms[data.room].users)
                socket.emit('correct-guess-word', {result: true,turnId:data.turnId})
            }else{
                console.log("correct answer "+rooms[data.room].currentGuessWord)
                console.log("guessed word: "+data.guessor_val)
                socket.emit('correct-guess-word', {result: false,turnId:data.turnId})
            }
        }else{
            socket.emit('correct-guess-word', {result: false,turnId:data.turnId})
        }
        console.log('guessword event triggered from: ' + rooms[data.room].users[data.guesser_id].name + ' with word: ' + rooms[data.room].currentGuessWord)
    })

    socket.on('next-drawer', function(data){
        var room = data.room;
        // if(completedAllRound(Object.values(rooms[room].users), rooms[room].rounds)) {
        //     io.in(room).emit('completedGame', {ret:true, previousGameRounds: rooms[data.room].rounds})
        // }
        if(rooms[room].userList.length === userCount[room]){
            console.log("house full")
            rooms[room].users[socket.id].currentRound += 1
            rooms[room].userList = []
        }
        rooms[room].guessers.push(rooms[room].drawer[0])
        rooms[room].drawer.splice(0, rooms[room].drawer.length)
        rooms[room].drawer.push(rooms[room].guessers[0])
        rooms[room].userList.push(rooms[room].drawer[0])
        var x = rooms[room].guessers.shift()
        
        console.log(rooms[room].userList)

        if(data.turnId == rooms[data.room].turnId){
        
            guessWord = newWord(data.room)
            rooms[room].currentGuessWord = guessWord;
            rooms[room].turnId = Math.ceil(Math.random() * 100000 )
            
            console.log("word assigned for next drawer: "+rooms[room].users[rooms[room].drawer[0]].name+" guess word: "+guessWord)
            console.log("drawer list "+ rooms[room].drawer )
            console.log("guesser length ---- "+ rooms[room].guessers.length +" guessers "+rooms[room].guessers)

            io.in(room).emit('drawer', {room:room, user:rooms[room].drawer[0], guessWord:guessWord ,turnId:rooms[room].turnId, round:rooms[room].users[socket.id].currentRound})
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
            if(rooms[room].drawer[0] === socket.id){
                rooms[room].drawer.splice(0, rooms[room].drawer.length)
                rooms[room].drawer.push(rooms[room].guessers[0])
                var x = rooms[room].guessers.shift()
                guessWord = newWord(room)
                rooms[room].currentGuessWord = guessWord;
                rooms[room].turnId = Math.ceil(Math.random() * 100000 ) 
                io.in(room).emit('drawer', {room:room, user:rooms[room].drawer[0], guessWord:guessWord,turnId:rooms[room].turnId,round:0})
        
            }
            socket.to(room).broadcast.emit('user-disconnected', rooms[room].users[socket.id].name)
            userCount[room] -= 1
            delete rooms[room].users[socket.id]
            //remove the user from list of user in completed round list
            if(rooms[room].userList.includes(socket.id)){
                var index = rooms[room].userList.indexOf(socket.id);
                rooms[room].userList.splice(index, 1);
            }
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

const completedAllRound = (users, maxRound) => users.every(v => v.currentRound === maxRound )

function readFromFile(path){
    var fs = require("fs")
    var text = fs.readFileSync(path).toString();
    return [...new Set(text.split('\n'))] 
}
