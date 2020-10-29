const myEnv = require('dotenv').config();
const secretKey = myEnv.parsed.STRIPE_KEY;

const Stripe = require('stripe');
const stripe = Stripe(secretKey);

module.exports.createMonthlyPlans = async (req, res) =>{
    const plan = await stripe.plans.create({
        amount: 2000,
        currency: 'usd',
        interval: 'month',
        product: {
            name : 'monthly plan',
            active : true,
            statement_descriptor : 'monthly plan'
        },
        active : true
      })
      .then(plan =>{
          res.send({data : plan, success : true, message : "monthly plan created"});
      })
      .catch(error =>{
          res.send({data : {}, success : false, error : error, message : "error in monthly plan creation"});
      });

      console.log("plan created", plan);
}



module.exports.createWeeklyPlans = async (req, res) =>{
    const plan = await stripe.plans.create({
        amount: 500,
        currency: 'usd',
        interval: 'week',
        product: {
            name : 'weekly plan',
            active : true,
            statement_descriptor : 'weekly plan'
        },
        active : true
      })
      .then(plan =>{
          res.send({data : plan, success : true, message : "weekly plan created"});
      })
      .catch(error =>{
          res.send({data : {}, success : false, error : error, message : "error in weekly plan creation"});
      });

      console.log("plan created", plan);
}