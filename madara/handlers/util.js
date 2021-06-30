const myEnv = require('dotenv').config();
const mailgunapikey = myEnv.parsed.MAILGUN_API_KEY;
const domain = myEnv.parsed.DOMAIN;

const hbs = require('handlebars');
const Mailgun = require('mailgun-js')({apiKey : mailgunapikey, domain : domain});
const mailcomposer = require('nodemailer/lib/mail-composer');


const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { validateCard } = require('./user');
// const myEnv = require('dotenv').config();



let sendMail = async function (mailData, templateData, emailTemplate){
    try {
      let response = false; 
      const template = hbs.compile(emailTemplate);
    //   console.log("template: ", template)
      let htmlToSend = template({ data: templateData });
      console.log("mail data: ", mailData);
    //   console.log("html to send: ", htmlToSend);
      let mail = new mailcomposer({
        from: 'aresminks@gmail.com',
        to: mailData.to,
        subject: mailData.subject,
        html: htmlToSend
      })
      await mail.compile().build(async (mailBuildError, message) => {
        if (mailBuildError || !message) {
            return response 
        }
        else {
          let dataToSend = {
            to:  mailData.to,
            message: message.toString('ascii'),
          };
          await Mailgun.messages().sendMime(dataToSend, (error, body) => {
            if (error) {
              console.log("error in mail mime send: ", error);
              return response
            }
            else {
              console.log("email sent: ", body);
              response = true;
            }
          })
        }
      })
      return response
    } 
    catch (error) {
      return false
    }
  }




let getWeeksInMonth = function (year, index) {

  let weeks = [];
  const firstDay = new Date(year, index, 1);
  const lastDay = new Date(year, index + 1, 0);
  const daysInMonth = lastDay.getDate();
  let dayOfWeek = firstDay.getDay();
  let start;
  let end;
  console.log("year: ", year, " month: ", daysInMonth);
  for (let i = 1; i < daysInMonth + 1; i++) {

    if (dayOfWeek === 0 || i === 1) {
      start = i;
    }

    if (dayOfWeek === 6 || i === daysInMonth) {

      end = i;

      if (start !== end) {

        weeks.push({
          start: start,
          end: end
        });
      }
    }

    dayOfWeek = new Date(year, index, i).getDay();
  }
  console.log("weeks: ", weeks);
  weeks = weeks.map(item => {
    // console.log("item: ", item);
    return { start: new Date(year, index, item.start + 1), end: new Date(year, index, item.end + 1) }
  })
  // console.log("weeks: ", newweeks);

  return weeks;
}








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



  // module.exports = {sendMail, getWeeksInMonth}

  module.exports = {hashPassword, generateregisterationToken, generateToken, comparePassword, isValidEmail, 
    getWeeksInMonth,sendMail};