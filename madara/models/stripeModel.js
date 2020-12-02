const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const stripeModel = new Schema({
    stripeCustomerId : {type : String},

    email : {type :  String},

    cardDetails : {type : Object},

    subscriptionId : {type : String},

    cardId : {type : Object},

    unitAmount : {type :Number}
});

module.exports = mongoose.model('StripeModel', stripeModel);