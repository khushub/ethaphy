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

var userHndl = require('./madara/handlers/user');

const userRoute = require('./madara/router/userRoute');

const questionRoute = require('./madara/router/questionRoute');

var port = 3003;   // Port used for user server
var app = express();



app.use(device.capture());
app.use(cors());
app.use(express.urlencoded({extended : false}));
app.use(express.json());
// app.use(express.static(path.join(__dirname, 'orochimaru')));
app.set('port', port);
// app.get('*', function (req, res) { res.send('<h1>Hello world User</h1>'); });

// var server = http.createServer(app);
// var socketIO = require('socket.io')(server, { path: '/Dcd7pwimDyfKiPvTAAAh/socket.io' });    // socket.io path. The same path will be used on client side.
// var adminSocket = require('socket.io-client')('http://localhost:3000', { transports: ["websocket"], path: '/RVeDr66xWzOVLhV5AABI/socket.io' });
// var managerSocket = require('socket.io-client')('http://localhost:3001', { transports: ["websocket"], path: '/5b52ccd84fa96dd59b65e54f/socket.io' });
// var io = { self: socketIO, admin: adminSocket, manager: managerSocket };

logger.level = 'error';

// @brief   Broadcast functions
// @note    There will be no request for market/multi market rate update from user side.
//          Server will send the updated rate per second to all the connected users based on
//          the active page of user.
// setInterval(function(){broadcastHndl.marketPulse(io);}, 1000); // Broadcase for single market. Not required for user.
//setInterval(function(){scorebroadcastHndl.getScores(io);}, 1000); 
// setInterval(function(){broadcastHndl.eventPulse(io);}, 1000);  // Broadcast event updates per second.
// setInterval(function(){broadcastHndl.scorePulse(io);}, 15000);  // Broadcast score updates per 15 seconds.

var connectionCount = 0;
// User socket requests
// io.self.on('connection', function (socket) {
// 	connectionCount += 1;
// 	logger.error("new connection: " + connectionCount);
// 	socket.emit('get-login-status', { 'socket.id': socket.id });
// 	socket.on('RVeDr66xWzOVLhV5AABIDcd7pwimDyfKiPvTAAAh5b52ccd84fa96dd59b65e54f', (request) => {
// 		logger.info("local communication: " + JSON.stringify(request));
// 		if (!request) return;
// 		if (!request.socket || !request.emitString) return;
// 		io.self.to(request.socket).emit(request.emitString, request.emitData);
// 	});

	// Login and account related requests
	//   socket.on('login',                (request) => {userHndl.login(io, socket, request);});
	// 	socket.on('logout',               (request) => {userHndl.logout(io, socket, request);});
	// 	socket.on('login-status',         (request) => {userHndl.loginStatus(io, socket, request, {role:'user'});});


	//   // Session related requests
	//   socket.on('disconnect',           ()        => {connectionCount -= 1; sessionHndl.updateSession(io, socket, {online:false});});

// });


app.use('/',userRoute);

app.use('/', questionRoute);

app.listen(port, () => {
	logger.info(`User API running on localhost:${port}`);
	console.log(`User API running on localhost:${port}`)
});
