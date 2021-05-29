const myEnv = require('dotenv').config();
const mailgunapikey = myEnv.parsed.MAILGUN_API_KEY;
const domain = myEnv.parsed.DOMAIN;

const hbs = require('handlebars');
const Mailgun = require('mailgun-js')({apiKey : mailgunapikey, domain : domain});
const mailcomposer = require('nodemailer/lib/mail-composer');




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

  module.exports = {sendMail}