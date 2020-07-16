const socket = io('http://localhost:3000')
const messageHolder = document.getElementById('message-holder')
const roomController = document.getElementById('room-controller')
const sendMessageForm = document.getElementById('send-controller')
const messageInput = document.getElementById('message-input')
const canvasControllerForm = document.getElementById('draw-controller')


if (canvasControllerForm != null) {
  console.log("canvas created")
 /* canvasControllerForm.addEventListener('mousedown', e => {
    e.preventDefault()
    socket.emit('drawing-on-canvas', roomName , clickX, clickY, clickDrag,"mousedown")
  })
  
  canvasControllerForm.addEventListener('mousemove', e => {
    e.preventDefault()
    socket.emit('drawing-on-canvas', roomName , clickX, clickY, clickDrag,"mousemove" )
  })
*/

  canvasControllerForm.addEventListener('mouseup', e => {
    e.preventDefault()
    console.log("client side: "+clickX)
    console.log("client side: "+clickY)
    console.log("client side: "+clickDrag)
    socket.emit('drawing-on-canvas', roomName , clickX, clickY, clickDrag,"mouseup")
  })
}


if (sendMessageForm != null) {
  const name = prompt('Can I have your nickname?')
  appendMessage('You joined')
  socket.emit('new-user', roomName, name)

  //main listner that adds the messages sent by the user
  sendMessageForm.addEventListener('submit', e => {
    e.preventDefault()
    const message = messageInput.value
    appendMessage(`You: ${message}`)
    socket.emit('send-chat-message', roomName, message)
    messageInput.value = ''
  })
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

socket.on('redraw', data => {
      clickX = [];
      clickY = [];
      clickDrag = [];
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

//end point for user disconnect or closing the window
socket.on('user-disconnected', name => {
  appendMessage(`${name} disconnected`)
})

function appendMessage(message) {
  const messageElement = document.createElement('div')
  messageElement.innerText = message
  messageHolder.append(messageElement)
}