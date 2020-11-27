const myEnv = require('dotenv').config();
const secretKey = myEnv.parsed.STRIPE_KEY;

const Stripe = require('stripe');
const stripe = Stripe(secretKey);

module.exports.createMonthlyPlans = async (req, res) => {
    const products = await stripe.products.create({
        name: 'monthly counselling plan'
    })
        .then(product => {
            const plan = stripe.plans.create({
                amount: 2000,
                currency: 'usd',
                interval: 'month',
                product: product.id,
                active: true
            })
                .then(plan => {
                    res.send({ data: plan, success: true, message: "monthly plan created" });
                })
                .catch(error => {
                    res.send({ data: {}, success: false, error: error, message: "error in monthly plan creation" });
                });
        })
}


module.exports.createWeeklyPlans = async (req, res) => {
    const product = await stripe.products.create({
        name: 'weekly counselling plan'
    })
        .then(product => {
            console.log("product", product.id);
            const plan = stripe.plans.create({
                amount: 500,
                currency: 'usd',
                interval: 'week',
                product: product.id,
                active: true
            })
                .then(plan => {
                    res.send({ data: plan, success: true, message: "weekly plan created" });
                })
                .catch(error => {
                    res.send({ data: {}, success: false, error: error, message: "error in weekly plan creation" });
                });
        })
}