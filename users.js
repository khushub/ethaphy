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

// const subscribePlanRoute = require('./madara/router/subscriberRoute');

var port = 4003;   // Port used for user server
var app = express();

const admin = require("firebase-admin");

const serviceAccount = require('./privateKey.json');


app.use(device.capture());
app.use(cors());
app.use(express.urlencoded({extended : false}));
// app.use(express.json());
// app.use(express.static(__dirname));

app.set('port', port);

// app.get('*', function (req, res) { res.send('<h1>Hello world User</h1>'); });

app.use((req, res, next) => {
	if (req.originalUrl === '/webhook') {
		console.log("original url: ", req.originalUrl);
		next();
	} else {
		bodyParser.json()(req, res, next);
	}
});


logger.level = 'error';

app.post('/webhook', bodyParser.raw({ type : 'application/json'}), (req, res) =>{
	let event;
	// const sig = req.header['stripe-signature'];
	try {
		//JSON.parse(req.body);
		event = stripe.webhooks.constructEvent(
			req.body,
			req.header('stripe-signature'),
			myEnv.parsed.WEBHOOK_KEY
		  );
	} 
	catch (error) {
		console.log("req.header(stripe-signature)",req.header('stripe-signature'));
		console.log("⚠️ Webhook signture verification failed: ",error.message);
		console.log("check env file and put correct webhook secret");
		return res.send({error, success : false, message : error.message});
	}

	// handle the event

	switch(event.type){
		case 'customer.subscription.trial_will_end' :
			// send email to user about trial end;
			let trialEnd = event.data.object;
			console.log("trial end for the user: ",trialEnd);
			break;
		
		case 'customer.subscription.updated' :
			// send update to user that their plan has been updated
			let subscriptionUpdate = event.data.object;
			console.log("subscription plan has been updated for the user: ", subscriptionUpdate.id);
			break;

		case 'invoice.paid' :
			// send update to user about payment success for subscription
			
			let invoice = event.data.object;
			console.log("invoice paid for the customer:", invoice.id);
			break;

		case 'invoice.payment_failed':
			// set user status to inactive if payment failed
			let invoiceFail = event.data.object;
			console.log("payment failed for the user: ",invoiceFail.id);
			break;

		case 'invoice.payment_succeeded' :
			// do some work if payment succeeded
			let invoiceSucceeded = event.data.object;
			console.log("payment succeeede for the customer: ",invoiceSucceeded.id);
			break;

		case 'payment_intent.payment_failed' :
			// change user status because of payment failed
			let paymentIntentFailed = event.data.object;
			console.log("payment failed for user: ",paymentIntentFailed.id);
			break;

		case 'customer.created' : 
			// do whatever you want to do when a customer is created
			let customer = event.data.object;
			console.log("customer created: ", customer);
			break;

		default : 
			console.log("event.type", event.type);
			console.log(`unknown event type`);
		
	}
})

app.use('/user', userRoute);

app.use('/data', questionRoute);

app.use('/counselor', counselorRoute);

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



