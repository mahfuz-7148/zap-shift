import React from 'react';
import {CardElement, useElements, useStripe} from '@stripe/react-stripe-js';

const PaymentForm = () => {
    const stripe = useStripe()
    const elements = useElements()
    const handleSubmit = async e => {
        e.preventDefault()
        if (!stripe || !elements) {
            return
        }
        const card = elements.getElement(CardElement)
        if (!card) {
            return
        }
        const {paymentMethod, error} = await stripe.createPaymentMethod({
            type: 'card',
            card
        })
        if (error) {
            console.log(error)
        }
        else {
            console.log(paymentMethod)

        }
    }
    return (
        <form onSubmit={handleSubmit} className="space-y-4 bg-white p-6 rounded-xl shadow-md w-full mt-20 max-w-md mx-auto">
            <CardElement className="p-2 border rounded" />
            <button
                type='submit'
                className="btn btn-primary text-black w-full"
            >
                Pay
            </button>
        </form>
    );
};

export default PaymentForm;