import {loadStripe} from '@stripe/stripe-js';
import {Elements} from '@stripe/react-stripe-js';
import PaymentForm from './PaymentForm.jsx';

const stripePromise = loadStripe(import.meta.env.VITE_payment_Key)
const Payment = () => {
    return (
       <Elements stripe={stripePromise}>
           <PaymentForm />
       </Elements>
    );
};

export default Payment;