const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const myEnv = require('dotenv').config();

const Helper = {

    hashPassword(password) {
        return bcrypt.hashSync(password, bcrypt.genSaltSync(8));
    },

    /* function for checking valid email or not based on email pattern */
    isValidEmail(email){
        return /\S+@\S+\.\S+/.test(email);
    },

    /* function for compare password with database when user give password at the time of registration */
    comparePassword(hashPassword,password){
        return bcrypt.compareSync(password,hashPassword);
    },

    /* generate new token when user will login and store userid and role name inside token */
    generateToken(id){
        const token = jwt.sign({
            userId : id
        },
        myEnv.parsed.SECRET,{expiresIn : '7d'}
        );
        return token;
    },

    generateregisterationToken(id){
        const registerationToken = jwt.sign({
            userId : id
        },
        myEnv.parsed.REGISTERATION_SECRET
        );
        return registerationToken;
    }
}
module.exports = Helper;