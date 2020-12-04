// @file    user.js
// @brief   This file is the entry point for all the requests from user app.
//          All the socket requests will be handled here.

var express = require('express');
const bodyParser = require('body-parser');
var device = require('express-device');
var http = require('http');
var cors = require('cors');   // For cross origin device access
var path = require('path');
var mongoose = require('mongoose');
var request = require('request');
var logger = require('log4js').configure({  // Logger
	disableClustering: true,
	appenders: { app: { type: 'console' } },
	categories: { default: { appenders: ['app'], level: 'error' } }
}).getLogger();


var db = require('./madara/models/db');  // DB config module
//var sessionHndl         =   require('./madara/handlers/session');

var messageHndl = require('./madara/handlers/message');

const userRoute = require('./madara/router/userRoute');

const questionRoute = require('./madara/router/questionRoute');

const counselorRoute = require('./madara/router/counselorRoute');

var port = 8080;   // Port used for user server
var app = express();


var socketIO = require('socket.io');  
//var port = process.env.PORT||3000 // setting the port  

var server = http.createServer(app) 
var io = socketIO(server)


app.use(device.capture());
app.use(cors());
app.use(express.urlencoded({extended : false}));
app.use(express.json());

app.set('port', port);

// app.get('*', function (req, res) { res.send('<h1>Hello world User</h1>'); });


logger.level = 'error';



app.use('/user',userRoute);

app.use('/data', questionRoute);

app.use('/counselor', counselorRoute );

io.on('connection', function(socket){
  
	
	logger.error("new connection:etheraphy "); 
	socket.emit('get-status', {'socket_id':socket.id});

 socket.on('join-chat',          (request) => {messageHndl.joinChat(io, socket, request);});
 socket.on('create-message',          (request) => {messageHndl.createMessage(io, socket, request);});

  socket.on('join-chat-counseller',          (request) => {messageHndl.joinChatCounseller(io, socket, request);});
 socket.on('create-message-counseller',          (request) => {messageHndl.createMessageCounseller(io, socket, request);});

  socket.on('disconnect',           ()        => {});

});




server.listen(port, () => {
	logger.info(`User API running on localhost:${port}`);
	console.log(`User API running on localhost:${port}`)
});
