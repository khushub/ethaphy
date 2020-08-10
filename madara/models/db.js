var mongoose  =   require('mongoose');
var logger    = 	require('log4js').getLogger();

const options = {
  poolSize: 20,
  useNewUrlParser: true
};
mongoose.connect('mongodb://localhost:27017/etheraphy', options);
var db = mongoose.connection;

// CONNECTION EVENTS
db.on('connected', function() {
  logger.info('Mongoose connected to mongodb://localhost:27017/etheraphy');
});
db.on('error', function(err) {
  logger.error('Mongoose connection error: ' + err);
});
db.on('disconnected', function() {
  logger.info('Mongoose disconnected');
});
// BRING IN YOUR SCHEMAS & MODELS
require('./login');
require('./user');
