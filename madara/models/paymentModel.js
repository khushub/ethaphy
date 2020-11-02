const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const paymentSchema = new Schema({
    stripeCustomerId : {type : String},
    email : {type :  String},
    cardDetails : {type : Object},
    subscriptionId : {type : String},
    amount : {type :Number}
});

module.exports = mongoose.model('Payment', paymentSchema);