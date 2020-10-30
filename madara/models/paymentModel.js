const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const paymentSchema = new Schema({
    stripeCustomerId : {type : String},
    email : {type :  String},
    cardDetails : {type : Object},
    amount : {type :Number}
});

module.exports = mongoose.model('Payment', paymentSchema);