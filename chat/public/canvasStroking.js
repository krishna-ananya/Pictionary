"use strict";
var context = document.getElementById('sheet').getContext("2d");
var canvas = document.getElementById('sheet');
context = canvas.getContext("2d");
context.strokeStyle = "#ff0000";
context.lineJoin = "round";
context.lineWidth = 5;

var clickX = [];
var clickY = [];
var clickDrag = [];
var paint;



/**
 * Add information where the user clicked at.
 * @param {number} x
 * @param {number} y
 * @return {boolean} dragging
 */
function addClick(x, y, dragging) {
    clickX.push(x);
    clickY.push(y);
    clickDrag.push(dragging);
}

/**
 * Clear the Canvas
 */
function clearCanvas(){
    clickX.splice(0, clickX.length)
    clickY.splice(0, clickY.length)
    clickDrag.splice(0, clickDrag.length)
    context.clearRect(0, 0, context.canvas.width, context.canvas.height)
    context.beginPath()
}
/**
 * Redraw the complete canvas.
 */

function redraw() {
    // Clears the canvas
    context.clearRect(0, 0, context.canvas.width, context.canvas.height);

    for (var i = 0; i < clickX.length; i += 1) {
        if (!clickDrag[i] && i == 0) {
            context.beginPath();
            context.moveTo(clickX[i], clickY[i]);
            context.stroke();
        } else if (!clickDrag[i] && i > 0) {
            context.closePath();

            context.beginPath();
            context.moveTo(clickX[i], clickY[i]);
            context.stroke();
        } else {
            context.lineTo(clickX[i], clickY[i]);
            context.stroke();
        }
    }
}

/**
 * Draw the newly added point.
 * @return {void}
 */
function drawNew() {
    var i = clickX.length - 1
    if (!clickDrag[i]) {
        if (clickX.length == 0) {
            context.beginPath();
            context.moveTo(clickX[i], clickY[i]);
            context.stroke();
        } else {
            context.closePath();

            context.beginPath();
            context.moveTo(clickX[i], clickY[i]);
            context.stroke();
        }
    } else {
        context.lineTo(clickX[i], clickY[i]);
        context.stroke();
    }
}

function mouseDownEventHandler(e) {
    paint = true;   
    
    var canvasDiv = document.getElementById("canvasDiv");    
    var rect = canvasDiv.getBoundingClientRect();
        
    var x = e.clientX  - rect.left;
    var y = e.clientY - rect.top;
    if (paint) {
        addClick(x, y, false);
        drawNew();
    }
}

function touchstartEventHandler(e) {
    paint = true;
    if (paint) {
        var canvasDiv = document.getElementById("canvasDiv"); 
        var rect = canvasDiv.getBoundingClientRect();
        addClick(e.touches[0].clientX - rect.left, e.touches[0].clientY - rect.top, false);
        drawNew();
    }
}

function mouseUpEventHandler(e) {
    context.closePath();
    paint = false;
}

function mouseMoveEventHandler(e) {

    var canvasDiv = document.getElementById("canvasDiv");
    var rect = canvasDiv.getBoundingClientRect();
    var x = e.clientX  - rect.left;
    var y = e.clientY - rect.top;
    if (paint) {
        addClick(x, y, true);
        drawNew();
    }
}

function touchMoveEventHandler(e) {
    if (paint) {
        var canvasDiv = document.getElementById("canvasDiv");
        var rect = canvasDiv.getBoundingClientRect();
        addClick(e.touches[0].clientX - rect.left, e.touches[0].clientY - rect.top, true);
        drawNew();
    }
}

function setUpHandler(isMouseandNotTouch, detectEvent) {
    removeRaceHandlers();
    if (isMouseandNotTouch) {
        canvas.addEventListener('mouseup', mouseUpEventHandler);
        canvas.addEventListener('mousemove', mouseMoveEventHandler);
        canvas.addEventListener('mousedown', mouseDownEventHandler);
        mouseDownEventHandler(detectEvent);
    } else {
        canvas.addEventListener('touchstart', touchstartEventHandler);
        canvas.addEventListener('touchmove', touchMoveEventHandler);
        canvas.addEventListener('touchend', mouseUpEventHandler);
        touchstartEventHandler(detectEvent);
    }
}

function mouseWins(e) {
    setUpHandler(true, e);
}

function touchWins(e) {
    setUpHandler(false, e);
}

function removeRaceHandlers() {
    canvas.removeEventListener('mousedown', mouseWins);
    canvas.removeEventListener('touchstart', touchWins);
}
canvas.addEventListener('mousedown', mouseWins);
canvas.addEventListener('touchstart', touchWins);


//var enable = document.getElementById('isTurn').value;
//if(enable == 1){
//    canvas.addEventListener('mousedown', mouseWins);
//    canvas.addEventListener('touchstart', touchWins);
//}