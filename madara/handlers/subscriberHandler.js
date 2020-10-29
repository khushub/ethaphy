const myEnv = require('dotenv').config();
const secretKey = myEnv.parsed.STRIPE_KEY;

const Stripe = require('stripe');
const stripe = Stripe(secretKey);

module.exports.subscribePlan = async (req, res)=>{
    const products = await stripe.products.list({
        limit: 2,
      })
      .then(products =>{
        res.send({data : products})  
      })
      .catch(error =>{
          res.send({error : error, message : "plan fetch error"});
      });
}