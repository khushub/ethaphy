// required module
const myEnv = require('dotenv').config();
const secretKey = myEnv.parsed.STRIPE_KEY;
const stripe = require('stripe')(secretKey);

const Invoice = require('../models/invoiceModel');


module.exports.stripeWebhook = (req, res) => {
    try {
        let event;
        // const sig = req.header['stripe-signature'];
        try {
            //JSON.parse(req.body);
            event = stripe.webhooks.constructEvent(
                req.body,
                req.header('stripe-signature'),
                myEnv.parsed.WEBHOOK_KEY
            );
        }
        catch (error) {
            console.log("req.header(stripe-signature)", req.header('stripe-signature'));
            console.log("⚠️ Webhook signture verification failed: ", error.message);
            console.log("check env file and put correct webhook secret");
            return res.send({ error, success: false, message: error.message });
        }

        // handle the event

        switch (event.type) {
            case 'customer.subscription.trial_will_end':
                // send email to user about trial end;
                let trialEnd = event.data.object;
                console.log("trial end for the user: ", trialEnd);
                break;

            case 'customer.subscription.updated':
                // send update to user that their plan has been updated
                let subscriptionUpdate = event.data.object;
                console.log("subscription plan has been updated for the user: ", subscriptionUpdate.id);
                break;

            case 'invoice.paid':
                // send update to user about payment success for subscription

                let invoice = event.data.object;
                console.log("invoice paid for the customer:", invoice);
                break;

            case 'invoice.payment_failed':
                // set user status to inactive if payment failed
                let invoiceFail = event.data.object;
                console.log("payment failed for the user: ", invoiceFail.id);
                break;

            case 'invoice.payment_succeeded':
                // do some work if payment succeeded
                let invoiceSucceeded = event.data.object;
                console.log("payment succeeede for the customer: ", invoiceSucceeded);
                break;

            case 'payment_intent.payment_failed':
                // change user status because of payment failed
                let paymentIntentFailed = event.data.object;
                console.log("payment failed for user: ", paymentIntentFailed.id);
                break;

            case 'customer.created':
                // do whatever you want to do when a customer is created
                let customer = event.data.object;
                console.log("customer created: ", customer);
                break;

            default:
                console.log("unknown event type", event.type);
        }
    }
    catch (error) {
        res.send({error, success : false, message : "stripe webhook error"});
    }
}