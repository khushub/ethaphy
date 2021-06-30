// required module
const myEnv = require('dotenv').config();
const secretKey = myEnv.parsed.STRIPE_KEY;
const stripe = require('stripe')(secretKey);

const InvoiceModel = require('../models/invoiceModel');
const User = require('../models/userModel');


module.exports.stripeWebhook = (req, res) => {
    try {
        let event;
        // const sig = req.header['stripe-signature'];
        try {
            //JSON.parse(req.body);
            event = stripe.webhooks.constructEvent(
                req.body,
                req.header('stripe-signature'),
                myEnv.parsed.WEBHOOK_KEY1
            );
        }
        catch (error) {
            console.log("req.header(stripe-signature)", req.header('stripe-signature'));
            console.log("⚠️ Webhook signture verification failed: ", error.message);
            console.log("check env file and put correct webhook secret");
            return res.send({ error, success: false, message: error.message });
        }

        // handle the event
        // console.log("event before switch: ", event);
        switch (event.type) {
            // update planExpireDate of user when stripe renewed someone's subscription
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
                User.findOne({stripeCustomerId : invoiceSucceeded.customer})
                .then(user =>{
                    InvoiceModel.findOne({userId : user._id})
                    .then(doc =>{
                        if(doc != null){
                            let invoiceData = {
                                invoiceId :  invoiceSucceeded.id,
                                amountPaid : invoiceSucceeded.amount_paid/100,
                                billingReason : invoiceSucceeded.billing_reason,
                                chargeId : invoiceSucceeded.charge,
                                startDate : new Date(invoiceSucceeded.period_start*1000),
                                endDate : new Date(invoiceSucceeded.period_end*1000),
                                pdfUrl : invoiceSucceeded.invoice_pdf
                            }
                            doc.invoices.push(invoiceData);
                            InvoiceModel.updateOne({_id : doc._id}, doc)
                            .then(result =>{
                                console.log("invoice data updated");
                                res.status(200).send({success : true});
                            })
                            .catch(error =>{
                                console.log("db error in update invoice data");
                                res.status(400).send({success : false, error});
                            })
                        }
                        else{
                            let invoiceData = new InvoiceModel({
                                userId : user._id,
                                invoices : {
                                    invoiceId :  invoiceSucceeded.id,
                                    amountPaid : invoiceSucceeded.amount_paid/100,
                                    billingReason : invoiceSucceeded.billing_reason,
                                    chargeId : invoiceSucceeded.charge,
                                    startDate : new Date(invoiceSucceeded.period_start*1000),
                                    endDate : new Date(invoiceSucceeded.period_end*1000),
                                    pdfUrl : invoiceSucceeded.invoice_pdf
                                }
                            })
                            invoiceData.save()
                            .then(doc =>{
                                console.log("invoice data saved");
                                res.status(200).send({success : true});
                            })
                            .catch(error =>{
                                console.log("error in invoice data saved");
                                res.status(400).send({success : false, error});
                            })
                        }
                    })
                })
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

            case 'charge.refunded':
                User.updateOne({stripeCustomerId : event.data.object.customer}, {$set : {
                    status : 'inactive', isCanceled : true
                }})
                .then(doc =>{
                    console.log("doc: ", doc);
                })
                .catch(error =>{
                    console.log("error: ", error);
                });
                User.findOne({stripeCustomerId : event.data.object.customer})
                .then(user =>{
                    stripe.subscriptions.del(user.subscriptionId)
                    .then(response =>{
                        User.updateOne({_id : user._id}, {$set : {
                            subscriptionId : null
                        }})
                        .then(result =>{
                            console.log("result: ", result);
                            res.status(200).send({success : true});
                        })
                    })
                })
                .catch(error =>{
                    res.status(400).send({success : false, error});
                })
                break;
                
            default:
                console.log("unknown event type: ", event);
        }
    }
    catch (error) {
        res.send({error, success : false, message : "stripe webhook error"});
    }
}