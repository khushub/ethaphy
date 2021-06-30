var mongoose  =   require('mongoose');
var logger    = 	require('log4js').getLogger();
const myEnv = require('dotenv').config();


const DB_URL = myEnv.parsed.DB_URL;
const options = {
  poolSize: 20,
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useFindAndModify : false,
  useCreateIndex: true,
};
mongoose.connect(DB_URL, options);
var db = mongoose.connection;

// CONNECTION EVENTS
db.on('connected', function() {
  console.log('DB connected');
  logger.info(DB_URL);
});
db.on('error', function(err) {
  logger.error('Mongoose connection error: ' + err);
  setTimeout(function(){
    mongoose.connect(DB_URL, options);  
  }, 5000)
});
db.on('disconnected', function() {
  logger.info('Mongoose disconnected');
});
// BRING IN YOUR SCHEMAS & MODELS
require('./loginModel');
require('./userModel');

