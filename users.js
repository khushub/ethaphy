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

const counselorRoute = require('./madara/router/counselorRoute');

const addCardRoute = require('./madara/router/addCardRoute');

const stripePlanRoute = require('./madara/router/stripePlanRoute');

// const subscribePlanRoute = require('./madara/router/subscriberRoute');

var port = 4003;   // Port used for user server
var app = express();



app.use(device.capture());
app.use(cors());
app.use(express.urlencoded({extended : false}));
app.use(express.json());
// app.use(express.static(__dirname));

app.set('port', port);

// app.get('*', function (req, res) { res.send('<h1>Hello world User</h1>'); });


logger.level = 'error';



// app.use('http://167.99.88.134:4003/user',userRoute);
app.use('/user', userRoute);

// app.use('http://167.99.88.134:4003/data', questionRoute);
app.use('/data', questionRoute);

app.use('/counselor', counselorRoute);

app.use('/addCard', addCardRoute);

app.use('/stripe', stripePlanRoute);


app.listen(port, () => {
	logger.info(`User API running on localhost:${port}`);
	console.log(`Server started on localhost:${port}`)
});

















// @file    user.js
// @brief   This file is the entry point for all the requests from user app.
//          All the socket requests will be handled here.

// var express = require('express');
// const bodyParser = require('body-parser');
// var device = require('express-device');
// var http = require('http');
// var cors = require('cors');   // For cross origin device access
// var path = require('path');
// var mongoose = require('mongoose');
// var request = require('request');
// var logger = require('log4js').configure({  // Logger
// 	disableClustering: true,
// 	appenders: { app: { type: 'console' } },
// 	categories: { default: { appenders: ['app'], level: 'error' } }
// }).getLogger();


// var db = require('./madara/models/db');  // DB config module
// var sessionHndl         =   require('./madara/handlers/session');

// var messageHndl = require('./madara/handlers/message');

// const userRoute = require('./madara/router/userRoute');

// const questionRoute = require('./madara/router/questionRoute');

// const counselorRoute = require('./madara/router/counselorRoute');

// var port = 4003;   // Port used for user server
// var app = express();

// var server              =   http.createServer(app);
// var socketIO            =   require('socket.io')(server, {path: '/Dcd7pwimDyfKiPvTAAAh/socket.io'});    // socket.io path. The same path will be used on client side.
// var adminSocket       	=   require('socket.io-client')('http://localhost:3000', {transports: ["websocket"], path: '/RVeDr66xWzOVLhV5AABI/socket.io'});
// var managerSocket       =   require('socket.io-client')('http://localhost:3001', {transports: ["websocket"], path: '/5b52ccd84fa96dd59b65e54f/socket.io'});
// var io 									= 	{self:socketIO, admin:adminSocket, manager:managerSocket};


// app.use(device.capture());
// app.use(cors());
// app.use(express.urlencoded({extended : false}));
// app.use(express.json());

// app.set('port', port);

// // app.get('*', function (req, res) { res.send('<h1>Hello world User</h1>'); });


// logger.level = 'error';



// app.use('/user',userRoute);

// app.use('/data', questionRoute);

// app.use('/counselor', counselorRoute );

// io.self.on('connection', function(socket){
  
// 	connectionCount += 1;
// 	logger.error("new connection: " + connectionCount); 
// 	socket.emit('get-status', {'socket.id':socket.id});
// 	socket.on('RVeDr66xWzOVLhV5AABIDcd7pwimDyfKiPvTAAAh5b52ccd84fa96dd59b65e54f', 		(request) => {
// 		logger.info("local communication: "+JSON.stringify(request));
// 		if(!request) return;
// 		if(!request.socket || !request.emitString) return;
// 		io.self.to(request.socket).emit(request.emitString, request.emitData);
// 	});

//  socket.on('create-message',          (request) => {messageHndl.createMessage(io, socket, request);});

//   socket.on('disconnect',           ()        => {connectionCount -= 1});

// });




// app.listen(port, () => {
// 	logger.info(`User API running on localhost:${port}`);
// 	console.log(`User API running on localhost:${port}`)
// });


