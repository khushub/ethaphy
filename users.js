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

var port = 4003;   // Port used for user server
var app = express();



app.use(device.capture());
app.use(cors());
app.use(express.urlencoded({extended : false}));
app.use(express.json());

app.set('port', port);

// app.get('*', function (req, res) { res.send('<h1>Hello world User</h1>'); });


logger.level = 'error';



// app.use('http://167.99.88.134:4003/user',userRoute);
app.use('/user', userRoute);

// app.use('http://167.99.88.134:4003/data', questionRoute);
app.use('/question', questionRoute);

app.listen(port, () => {
	logger.info(`User API running on localhost:${port}`);
	console.log(`User API running on localhost:${port}`)
});

