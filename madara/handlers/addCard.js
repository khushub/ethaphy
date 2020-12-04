// Setup Stripe environment

const myEnv = require('dotenv').config();
const secretKey = myEnv.parsed.STRIPE_KEY;

const Stripe = require('stripe');
const stripe = Stripe(secretKey);

// Required Model

const StripeModel = require('../models/stripeModel');

const User = require('../models/userModel');




module.exports.addCard = async (req, res) => {
    try {
        // let stripeToken;
        const customer = {
            name: req.body.name,
            email: req.body.email,
            address: req.body.address
        }
        stripe.customers.create(customer, (error, customer) => {
            if (error) {
                console.log("error in customer create in stripe", error);
                res.send({
                    error: error.raw.message,
                    success: false,
                    message: "customer create error in stripe"
                });
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
                            // create card in stripe for a particular customer
                            stripe.customers.createSource(customer.id, { source: token.id })
                                .then(source => {
                                    console.log("card added", source);
                                    let card = {
                                        cardId: source.id,
                                        number: req.body.cardNumber,
                                        expMonth: req.body.expMonth,
                                        expYear: req.body.expYear,
                                    }
                                    const subscription = new Promise((resolve, reject) => {
                                        const subData = stripe.subscriptions.create({
                                            customer: customer.id,
                                            items: [
                                                {
                                                    price : 'price_1HtCMdHzA0lAtLhAMLfoUVSa',
                                                },
                                            ],
                                            trial_period_days: 3
                                        });
                                        if (subData) {
                                            resolve(subData);
                                        }
                                        else {
                                            reject(new Error("plan assigned error"));
                                        }
                                    });
                                    User.updateOne({ email: req.body.email },
                                        {
                                            $set: {
                                                status: 'active',
                                                cardDetails: card,
                                                address: req.body.address,
                                                stripeCustomerId: customer.id,
                                                subscriptionId : subscription.id
                                            }
                                        })
                                        .then(result => {
                                            console.log("User status updated to active: ", result);
                                            res.send({
                                                data: source,
                                                success: true,
                                                message: "card added and status updated to active"
                                            });
                                        })
                                        .catch(error => {
                                            console.log(error, "status update error when card added");
                                        });
                                })
                                .catch(error => {
                                    console.log("error in card adding: ", error);
                                    res.send({
                                        error: error,
                                        success: false,
                                        message: "error in add card: filed missing or token not generated"
                                    });
                                })
                        })
                        .catch(error => {
                            console.log("error", error);
                            res.send({ error: error, success: false, message: "card add error in stripe" });
                        });
                }
            }
        });
    }
    catch (error) {
        res.send({ error: error, success: false, message: "Something went wrong in card add" });
    }
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