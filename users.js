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
var logger = require('log4js').configure({  // Logger
	disableClustering: true,
	appenders: { app: { type: 'console' } },
	categories: { default: { appenders: ['app'], level: 'error' } }
}).getLogger();

const User = require('./madara/models/userModel');
const updateMessageCount = require('./madara/handlers/counselor');


// required module
const myEnv = require('dotenv').config();
const secretKey = myEnv.parsed.STRIPE_KEY;

const stripe = require('stripe')(secretKey);

var db = require('./madara/models/db');  // DB config module

var userHndl = require('./madara/handlers/user');


// required route

const userRoute = require('./madara/router/userRoute');

const questionRoute = require('./madara/router/questionRoute');

const counselorRoute = require('./madara/router/counselorRoute');

const addCardRoute = require('./madara/router/addCardRoute');

const stripePlanRoute = require('./madara/router/stripePlanRoute');

const notificationRoute = require('./madara/router/notificationRoute');

const adminRoute = require('./madara/router/adminRoute');

// const subscribePlanRoute = require('./madara/router/subscriberRoute');

var port = 4003;   // Port used for user server
var app = express();
const webhook = require('./madara/handlers/stripeWebhook');

const admin = require("firebase-admin");
const serviceAccount = require('./privateKey.json');


app.set('view engine', 'hbs');
app.set('views', './madara/views');

app.use(device.capture());
app.use(cors());
app.use(express.urlencoded({extended : false}));
app.use(bodyParser.urlencoded({ extended: true }));
// app.use(bodyParser.urlencoded({limit: "50mb", extended: true, parameterLimit:50000}));
var dir = path.join(__dirname, 'uploads');

app.use(express.static(dir));



// app.use(express.json());
// app.use(express.static(__dirname));

app.set('port', port);

// app.get('*', function (req, res) { res.send('<h1>Hello world User</h1>'); });

app.use((req, res, next) => {
	if (req.originalUrl === '/webhook') {
		// console.log("original url: ", req.originalUrl);
		next();
	} else {
		express.json()(req, res, next);
	}
});

// app.use(bodyParser.json({
//     // Because Stripe needs the raw body, we compute it but only when hitting the Stripe callback URL.
//     verify: function(req,res,buf) {
//         var url = req.originalUrl;
//         if (url.startsWith('/webhook')) {
//             req.rawBody = buf.toString()
//         }
//     }}));


function checkUserStatus(){
	let todayDate = new Date(Date.now()).toISOString().substring(0,10);
	console.log("today date: ", todayDate);
	User.find({ isCanceled : true})
	.then(users =>{
		for(let i = 0; i < users.length; i++){
			let expireDate = new Date(users[i].planExpireDate *1000).toISOString().substring(0,10)
			console.log("user.planexpiredate: ", expireDate);
			if(todayDate >= expireDate){
				User.updateOne({_id : users[i]._id}, { $set : { status : 'inactive'}})
				.then(doc =>{
					console.log("user status updated: ", doc);
				})
				.catch(error =>{
					console.log("error in user status update: ", error);
				})
			}
		}
	})
	.catch(error =>{
		console.log(error);
	})
}

setInterval(checkUserStatus, 86400000);

// setInterval(updateMessageCount.exchangeCount, 10000);

const Cricket = require('./madara/models/cricketModel');


// setInterval(updateCricData, 120000);

logger.level = 'error';

app.post('/webhook', bodyParser.raw({ type : 'application/json'}), webhook.stripeWebhook);

app.use('/user', userRoute);

app.use('/data', questionRoute);

app.use('/counselor', counselorRoute);

app.use('/admin', adminRoute);

// app.use('/addCard', addCardRoute);

app.use('/stripe', stripePlanRoute);

app.use('/notification', notificationRoute);


app.listen(port, () => {
	admin.initializeApp({
		credential: admin.credential.cert(serviceAccount)
	});
	logger.info(`User API running on localhost:${port}`);
	console.log(`>>> 🌎 Server started on localhost:${port}`)
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












function printPattern(){
	let n = 12;
    for(let i = 0; i< 7; i++){
		
    }
}
printPattern(); // 12, 11, 13, 12, 14, 13, 15, 14
//  			   12, 11, 13, 12, 14, 13, 15  