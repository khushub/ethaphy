const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { validateCard } = require('./user');
const myEnv = require('dotenv').config();

// const Helper = {

//     hashPassword(password) {
//         console.log("password: ", password);
//         return bcrypt.hashSync(password, bcrypt.genSaltSync(8));
//     },

//     /* function for checking valid email or not based on email pattern */
//     isValidEmail(email){
//         return /\S+@\S+\.\S+/.test(email);
//     },

//     /* function for compare password with database when user give password at the time of registration */
//     comparePassword(hashPassword,password){
        
//         return bcrypt.compareSync(password,hashPassword);
//     },

//     /* generate new token when user will login and store userid and role name inside token */
//     generateToken(id){
//         const token = jwt.sign({
//             userId : id
//         },
//         myEnv.parsed.SECRET,{expiresIn : '7d'}
//         );
//         return token;
//     },

//     generateregisterationToken(id){
//         const registerationToken = jwt.sign({
//             userId : id
//         },
//         myEnv.parsed.REGISTERATION_SECRET
//         );
//         return registerationToken;
//     },
// }
// module.exports = Helper;


let hashPassword = function (password) {
    console.log("password: ", password);
    return bcrypt.hashSync(password, bcrypt.genSaltSync(8));
}


let generateregisterationToken = function (id) {
    const registerationToken = jwt.sign({
        userId : id
    },
    myEnv.parsed.REGISTERATION_SECRET
    );
    return registerationToken;
}

let generateToken  = function (id){
    const token = jwt.sign({
        userId : id
    },
    myEnv.parsed.SECRET,{expiresIn : '7d'}
    );
    return token;
}



let comparePassword = function (hashPassword,password){
        
    return bcrypt.compareSync(password,hashPassword);
}


let isValidEmail = function (email) {
    return /\S+@\S+\.\S+/.test(email);
}


// module.exports = {hashPassword, generateregisterationToken, generateToken, comparePassword, isValidEmail};