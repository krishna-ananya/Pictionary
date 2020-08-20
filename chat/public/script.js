
const socket = io('http://localhost:3000')
const messageHolder = document.getElementById('message-holder')
const roomController = document.getElementById('room-controller')
const sendMessageForm = document.getElementById('send-controller')
const messageInput = document.getElementById('message-input')
const displayWord = document.getElementById('guessWord')
const canvasControllerForm = document.getElementById('draw-controller')
const clearControllerForm = document.getElementById('clear-controller')
const userVerifyForm = document.getElementById('userVerfiyController')
const roomEntryForm = document.getElementById('room-entry');

// listener for canvas clear
if(clearControllerForm != null){
  clearControllerForm.addEventListener('click', e => {
    clearCanvas()
    socket.emit('clear-canvas', roomName, clickX, clickY, clickDrag ,"clear")
  })
}
//listener for canvas action
if (canvasControllerForm != null) {
  console.log("canvas created")
  canvasControllerForm.addEventListener('mouseup', e => {
    e.preventDefault()
    socket.emit('drawing-on-canvas', roomName , clickX, clickY, clickDrag,"mouseup")
  })
}

// user verification
if(userVerifyForm != null){
  $("#userDialog").modal({     
    "show"      : true                     
  })
  roomEntryForm.addEventListener('click', e => {
    $("#room-entry").attr("disabled", true);
    const name = document.getElementById('username').value;
    //verify password
    const passcode = document.getElementById('password').value;
    
    socket.emit('validate-password', roomName, passcode)
    socket.on('correct-password',function(ret){
      if(ret === true){
        socket.emit('new-user', roomName, name)
        appendMessage('You joined')
        console.log("user added ")
        $("#userDialog").modal('hide');        
        $("#room-entry").attr("disabled", false);
      }else{
        alert(' Please enter the right Password to start play ')
        $("#room-entry").attr("disabled", false);
      }
      
    })
  })
}

if (sendMessageForm != null) {
  // socket.on('drawer', data=>{
  //   if(data.user === socket.id){
  //   $("#message-input").hide()
  //   $("#send-button").hide()
  //   }
  // });
  //listener to validate guessed word
  sendMessageForm.addEventListener('submit', e => {
    e.preventDefault()
    const message = messageInput.value.toLowerCase();
    document.getElementById("message-input").value = "";
    $('#send-button').attr('disabled',true)
    socket.emit('validate-guess-word', {room:roomName, guessor_val:message, guesser_id:socket.id})
    socket.on('correct-guess-word', function(ret){
      if(ret===true){
        console.log("Correct answer");
        $('#send-button').attr('disabled',false)
        socket.emit('next-drawer',roomName);
        //TODO need to say on the guessor window that they answered right
        //TODO call socket.on next-drawer
        //TODO update points for user (update the data structure)
      }
    })
  });
}
//socket point to create the room, add to the list of rooms for user to join
socket.on('room-created', room => {
  const roomElement = document.createElement('div')
  roomElement.innerText = room
  const roomLink = document.createElement('a')
  roomLink.href = `/${room}`
  roomLink.innerText = 'join'
  roomController.append(roomElement)
  roomController.append(roomLink)
})

serverClickX = [];
serverClickY = [];
serverClickDrag = [];

socket.on('clear',data => {
  serverClickX.splice(0, serverClickX.length)
  serverClickY.splice(0, serverClickY.length)
  serverClickDrag.splice(0, serverClickDrag.length)
  
  clickX.splice(0, clickX.length);
  clickY.splice(0, clickY.length);
  clickDrag.splice(0, clickDrag.length);
  
  context.clearRect(0, 0, context.canvas.width, context.canvas.height)
  context.beginPath()
})

socket.on('redraw', data => {
  clickX.splice(0, clickX.length);
  clickY.splice(0, clickY.length);
  clickDrag.splice(0, clickDrag.length);
  var tX =[];var tY =[]; var tDrag = [];
  var lClickX = [];
  var lClickY = [];
  var lclickDrag = [];
  
  
  tX = `${data.clickX}`.split(",")
  tY = `${data.clickY}`.split(",")
  tDrag = `${data.clickDrag}`.split(",")
  if(serverClickX.length == 0){
    
    lClickX = tX
    lClickY = tY
    lclickDrag = tDrag
  }
  else{
    var l = serverClickX.length
    lClickX = tX.slice(l,tX.length)
    
    l = serverClickY.length 
    lClickY = tY.slice(l,tY.length)
    
    l = serverClickDrag.length
    lclickDrag = tDrag.slice(l,tDrag.length)
  }
  
  serverClickX = tX
  serverClickY = tY
  serverClickDrag = tDrag
  
  context.moveTo(lClickX[0], lClickY[0]);
  for (var i = 1; i < lClickX.length; i += 1) {
    if (!lclickDrag[i] && i == 0) {
      context.beginPath();
      context.moveTo(lClickX[i], lClickY[i]);
      context.stroke();
      
    } else if (!lclickDrag[i] && i > 0) {
      context.closePath();
      
      context.beginPath();
      context.moveTo(lClickX[i], lClickY[i]);
      context.stroke();
    } else {
      context.lineTo(lClickX[i], lClickY[i]);
      context.stroke();
    }
  }
})

//socket point for the client to broadcast chat message to other users in the room
socket.on('chat-message', data => {
  appendMessage(`${data.name}: ${data.message}`)
})

//end point for user connection
socket.on('user-connected', name => {
  appendMessage(`${name} connected`)
})

socket.on('drawer', data => {
  if (socket.id == data.user) {
    console.log("iam a drawer")
    displayWord.innerHTML= data.guessWord;
    document.getElementById("guessor-block").style.visibility = "hidden";
    canvas.addEventListener('mousedown', mouseWins);
    canvas.addEventListener('touchstart', touchWins);
  } else {
    console.log("iam a guessor")
    displayWord.innerHTML="";
    document.getElementById("guessor-block").style.visibility = "visible";
    canvas.removeEventListener('mousedown', mouseWins);
    canvas.removeEventListener('touchstart', touchWins);
  }
})

//end point for user disconnect or closing the window
socket.on('user-disconnected', name => {
  appendMessage(`${name} disconnected`)
})

function appendMessage(message) {
  const messageElement = document.createElement('div')
  messageElement.innerText = message
  messageHolder.append(messageElement)
}

function visibilityElement(ele) {
  var x = document.getElementById(ele);
  if (window.getComputedStyle(x).visibility === "hidden") {
    return true;
  }
}