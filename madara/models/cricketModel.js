const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const cricketSchema = new Schema({
    gameStart : { type : Number, default : 0},

    gameplay : { type : Number, default : 0},

    inning : { type : Number, default : 0},

    ball : { type : Number, default : 0}

}, {timestamps : true});

module.exports = mongoose.model('Cricket', cricketSchema);