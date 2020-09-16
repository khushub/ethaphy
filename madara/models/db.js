var mongoose  =   require('mongoose');
var logger    = 	require('log4js').getLogger();

const options = {
  poolSize: 20,
  useNewUrlParser: true
};
mongoose.connect('mongodb+srv://Rahul:mCCgLapFDUVSGoQG@etherapy.ac12h.mongodb.net/eTherapy?w=majority', options);
var db = mongoose.connection;

// CONNECTION EVENTS
db.on('connected', function() {
  console.log('DB connected');
  logger.info('mongodb+srv://Rahul:mCCgLapFDUVSGoQG@etherapy.ac12h.mongodb.net/eTherapy?w=majority');
});
db.on('error', function(err) {
  logger.error('Mongoose connection error: ' + err);
});
db.on('disconnected', function() {
  logger.info('Mongoose disconnected');
});
// BRING IN YOUR SCHEMAS & MODELS
require('./loginModel');
require('./userModel');

// mongodb+srv://Rahul:Edward&$8126@etherapy.ac12h.mongodb.net/<dbname>?retryWrites=true&w=majority
