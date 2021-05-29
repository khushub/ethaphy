// Setup Stripe environment

const myEnv = require('dotenv').config();
const secretKey = myEnv.parsed.STRIPE_KEY;
const jwt = require('jsonwebtoken');

const Stripe = require('stripe');
const stripe = Stripe(secretKey);

// Required Model
const User = require('../models/userModel');



module.exports.addCard = async (req, res) => {
    try {
        let { userId } = jwt.decode(req.params.token);
        let userData = await User.findById(userId);
        console.log("userData: ", userData);   
        if(req.body.cardVal == 2){
            console.log("in if case: ", userData.stripeCustomerId)
            stripe.subscriptions.create({
                customer: userData.stripeCustomerId,
                items: [
                  { price : req.body.priceId ? req.body.priceId : 'price_1IWgouAOy5X6gCNNIrHTvK5F' },
                ],
                trial_end : 'now'
              })
              .then(subscription => {
                console.log("subscription: ",subscription);
                User.findOneAndUpdate({ _id: userId },
                  { $set: { subscriptionId: subscription.id , 
                    status : 'active',
                    priceId : req.body.priceId ? req.body.priceId : 'price_1IWgouAOy5X6gCNNIrHTvK5F',
                    planStartDate : subscription.current_period_start,
                    planExpireDate : subscription.current_period_end } })
                  .then(doc => {
                    // console.log("doc: ", doc);
                    res.send({ data: subscription, success: true, message: "subscription purchase success" });
                  })
                  .catch(error => {
                    res.send({ error: error, success: false, message: "DB subscription id update error"});
                  });
              })
              .catch(error =>{
                res.send({
                  error : error, 
                  success : false, 
                  message : "subscription purchase error when card already added"
                });
              })
        }
        else{
            let cardDetails = {
                card: {
                    number: req.body.cardNumber,
                    exp_month: req.body.expMonth,
                    exp_year: req.body.expYear,
                    cvc: req.body.cvc
                }
            }
    
            stripe.customers.create({
                email: req.body.email,
            })
                .then(customer => {
                    console.log("customer: ", customer.id);
                    stripe.tokens.create(cardDetails)
                        .then(token => {
                            console.log("token.id: ", token.id);
                            stripe.customers.createSource(customer.id, { source: token.id })
                                .then(source => {
                                    console.log("source: ", source, customer.id);
                                    stripe.charges.create({
                                        amount: 1999,
                                        currency: 'usd',
                                        source: source.id,
                                        description: "Trying to validate a card",
                                        capture: false,
                                        customer: customer.id
                                    })
                                        .then(async charge => {
                                            console.log("charge: ", charge);
                                            let card = {
                                                cardId: source.id,
                                                number: "************" + req.body.cardNumber.substring(12, 16),
                                                expMonth: req.body.expMonth,
                                                expYear: req.body.expYear,
                                            }
                                            let priceId = req.body.priceId ? req.body.priceId : 'price_1IWgouAOy5X6gCNNIrHTvK5F'
    
                                            stripe.subscriptions.create({
                                                customer: customer.id,
                                                items: [
                                                    {
                                                        price: priceId
                                                    },
                                                ],
                                                trial_period_days: userData.trialCount == 1 ? 0 : 3
                                            })
                                                .then(subscription => {
                                                    console.log("subscriptions: ", subscription);
                                                    
                                                    // let userId = req.params.token;
                                                    User.updateOne({ _id: userId },
                                                        {
                                                            $set: {
                                                                status: userData.trialCount == 1 ? 'active' : 'trial',
                                                                trialCount: 1,
                                                                cardDetails: card,
                                                                address: req.body.address,
                                                                stripeCustomerId: customer.id,
                                                                subscriptionId: subscription.id,
                                                                planExpireDate : subscription.current_period_end,
                                                                planStartDate : subscription.current_period_start,
                                                                priceId : req.body.priceId ? req.body.priceId : 'price_1IWgouAOy5X6gCNNIrHTvK5F',
                                                            }
                                                        }
                                                    )
                                                        .then(doc => {
                                                            console.log("document: ", doc);
                                                            res.send({
                                                                data: subscription,
                                                                success: false,
                                                                message: `card added and status updated to ${userData.trialCount == 1 ? 'active' : 'trial'}`
                                                            });
                                                        })
                                                        .catch(error => {
                                                            res.send({
                                                                error,
                                                                success: false,
                                                                message: "DB error for status update when card added"
                                                            });
                                                        })
                                                })
                                                .catch(error => {
                                                    res.send({
                                                        error,
                                                        success: false,
                                                        message: "Stripe subscription error"
                                                    });
                                                })
                                        })
                                        .catch(error => {
                                            res.send({ error, success: false, message: "card validation failed" });
                                        })
                                })
                                .catch(error => {
                                    res.send({ error, success: false, message: "stripe customer create source error" });
                                })
                        })
                        .catch(error => {
                            res.send({ error, success: false, messages: "stripe token generation error" });
                        })
                })
                .catch(error => {
                    res.send({ error, success: false, message: "stripe customer create error" });
                })
        }
    }
    catch (error) {
        res.send({ error: error, success: false, message: "Something went wrong in card add" });
    }
}























// module.exports.addCard = async (req, res) => {
//     try {
//         let cardDetails = {
//             card: {
//                 number: req.body.cardNumber,
//                 exp_month: req.body.expMonth,
//                 exp_year: req.body.expYear,
//                 cvc: req.body.cvc
//             }
//         }
//         const token = await stripe.tokens.create(cardDetails);
//         await stripe.charges.create({
//             amount: 2000,
//             currency: 'usd',
//             source: token.id,
//             description: 'My First Test Charge (created for API docs)',
//             capture: false
//         })
//             .then(charge => {
//                 const customer = {
//                     name: req.body.name,
//                     email: req.body.email,
//                     address: req.body.address
//                 }
//                 stripe.customers.create(customer, (error, customer) => {
//                     if (error) {
//                         console.log(`error in customer create in stripe: ${error}`);
//                         res.send({
//                             error: error.raw.message,
//                             success: false,
//                             message: "customer create error in stripe"
//                         });
//                     }
//                     else {
//                         if (customer) {
//                             stripe.tokens.create(cardDetails)
//                                 .then(token => {
//                                     // create card in stripe for a particular customer
//                                     stripe.customers.createSource(customer.id, { source: token.id })
//                                         .then(source => {
//                                             console.log(`card added ${source}`);
//                                             let card = {
//                                                 cardId: source.id,
//                                                 number: req.body.cardNumber,
//                                                 expMonth: req.body.expMonth,
//                                                 expYear: req.body.expYear,
//                                             }

//                                             const subData = stripe.subscriptions.create({
//                                                 customer: customer.id,
//                                                 items: [
//                                                     {
//                                                         price: 'price_1HtCMdHzA0lAtLhAMLfoUVSa',
//                                                     },
//                                                 ],
//                                                 trial_period_days: 3
//                                             })
//                                                 .then(subscription => {
//                                                     console.log(`subscription: ${subscription}`);
//                                                     User.updateOne({ email: req.body.email },
//                                                         {
//                                                             $set: {
//                                                                 status: 'trial',
//                                                                 trialCount: 1,
//                                                                 cardDetails: card,
//                                                                 address: req.body.address,
//                                                                 stripeCustomerId: customer.id,
//                                                                 subscriptioinId: subscription.id
//                                                             }
//                                                         })
//                                                         .then(result => {
//                                                             console.log(`User status updated to active: ${result}`);
//                                                             res.send({
//                                                                 data: subscription,
//                                                                 success: true,
//                                                                 message: "card added and status updated to active"
//                                                             });
//                                                         })
//                                                         .catch(error => {
//                                                             console.log(error, "status update error when card added");
//                                                         });
//                                                 })
//                                                 .catch(error => {
//                                                     res.send({
//                                                         error, 
//                                                         success: false, 
//                                                         message: "something is wrong with subscription" 
//                                                     });
//                                                 })
//                                         })
//                                         .catch(error => {
//                                             console.log(`error in card adding: ${error}`);
//                                             res.send({
//                                                 error: error,
//                                                 success: false,
//                                                 message: "error in add card: filed missing or token not generated"
//                                             });
//                                         })
//                                 })
//                                 .catch(error => {
//                                     console.log("error", error);
//                                     res.send({ error: error, success: false, message: "card add error in stripe" });
//                                 });
//                         }
//                     }
//                 });
//             })
//             .catch(error => {
//                 res.send({ error, success: false, message: error.raw.decline_code});
//             })
//     }
//     catch (error) {
//         res.send({ error: error, success: false, message: "Something went wrong in card add" });
//     }
// }















// Setup Stripe environment










