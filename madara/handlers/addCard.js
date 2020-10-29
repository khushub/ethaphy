const myEnv = require('dotenv').config();
const secretKey = myEnv.parsed.STRIPE_KEY;

const Stripe = require('stripe');
const stripe = Stripe(secretKey);

const PaymentModel = require('../models/paymentModel');




module.exports.addCard = (req, res) => {
    PaymentModel.findOne({ email: req.body.email }, (error, result) => {
        if (error) {
            console.log("error in adding card for checking if user already exist");
            res.send({error : error, success : false, message : "add card user already exist for trial error"});
        }
        else {
            if (result) {
                console.log("trial already done for this user");
                res.send({data :{}, success : false, message : "trial already completed for this user"});
            }
            else {
                console.log("in make payment");
                let stripeToken;
                const customer = {
                    name: req.body.name,
                    email: req.body.email,
                    address : req.body.address
                }
                stripe.customers.create(customer, (error, customer) => {
                    if (error) {
                        console.log("error in customer create in stripe", error);
                        res.send({error: error, success: false, message : "customer create error in stripe"});
                    }
                    else {
                        if (customer) {
                            let cardDetails = {
                                card: {
                                    number: req.body.cardNumber,
                                    exp_month: req.body.expMonth,
                                    exp_year: req.body.expYear,
                                    cvc: req.body.cvc
                                }
                            }

                            stripe.tokens.create(cardDetails)
                                .then(token => {
                                    stripeToken = token.id;
                                    console.log("stripetoken", stripeToken);
                                    stripe.customers.createSource(customer.id, { source: stripeToken })
                                        .then(card => {
                                            const balance = stripe.balance.retrieve({
                                                stripeAccount: customer.id
                                            });
                                            console.log("balance of card", balance);
                                            console.log("card added", card);

                                            const subscription =  stripe.subscriptions.create({
                                                customer: customer.id,
                                                items: [
                                                  {
                                                    plan: 'plan_IHlzrqE23U4iVi',
                                                  },
                                                ],
                                                trial_period_days: 3
                                              })
                                              .then(result =>{
                                                  console.log("result", result);
                                              })
                                              .catch(error =>{
                                                  console.log("error", error);
                                              })
                                            
                                            console.log("subscription", subscription);

                                        })
                                        .catch(error => {
                                            console.log("error in card adding with token", error);
                                            res.send({error : error, success : false, message : "token generation error for payment"});
                                        })
                                })
                                .catch(error => {
                                    console.log("error", error);
                                    res.send({error : error, success : false, message : "card add error in stripe"});
                                })
                           
                        }
                    }
                })
            }
        }
    })
}










// module.exports.adddCard = (req, res) => {
//     PaymentModel.findOne({ email: req.body.email }, (error, result) => {
//         if (error) {
//             console.log("error in adding card for checking if user already exist");
//             res.send({error : error, success : false, message : "add card user already exist for trial error"});
//         }
//         else {
//             if (result) {
//                 console.log("trial already done for this user");
//                 res.send({data :{}, success : false, message : "trial already completed for this user"});
//             }
//             else {
//                 console.log("in make payment");
//                 let stripeToken;
//                 const customer = {
//                     name: req.body.name,
//                     email: req.body.email,
//                     address : req.body.address
//                 }
//                 stripe.customers.create(customer, (error, customer) => {
//                     if (error) {
//                         console.log("error in customer create in stripe", error);
//                         res.send({error: error, success: false, message : "customer create error in stripe"});
//                     }
//                     else {
//                         if (customer) {
//                             let cardDetails = {
//                                 card: {
//                                     number: req.body.cardNumber,
//                                     exp_month: req.body.expMonth,
//                                     exp_year: req.body.expYear,
//                                     cvc: req.body.cvc
//                                 }
//                             }
//                             stripe.tokens.create(cardDetails)
//                                 .then(token => {
//                                     stripeToken = token.id;
//                                     console.log("stripetoken", stripeToken);
//                                     stripe.customers.createSource(customer.id, { source: stripeToken })
//                                         .then(card => {
//                                             console.log("card added", card);

//                                             let payDetails = {
//                                                 amount: req.body.amount,
//                                                 currency: 'usd',
//                                                 description: 'user trail charge',
//                                                 customer: customer.id
//                                             }

//                                             stripe.charges.create(payDetails)
//                                                 .then(charge => {
//                                                     console.log("user charged with amount details: ", charge);
//                                                     res.send({data : charge, success : true, message: "payment for trial done"});
//                                                 })
//                                                 .catch(error => {
//                                                     console.log("error in user charge ", error);
//                                                     res.send({error : error, success : false, message : "pay charge error"});
//                                                 })

//                                         })
//                                         .catch(error => {
//                                             console.log("error in card adding with token", error);
//                                             res.send({error : error, success : false, message : "token generation error for payment"});
//                                         })
//                                 })
//                                 .catch(error => {
//                                     console.log("error", error);
//                                     res.send({error : error, success : false, message : "card add error in stripe"});
//                                 })
//                         }
//                     }
//                 })
//             }
//         }
//     })
// }