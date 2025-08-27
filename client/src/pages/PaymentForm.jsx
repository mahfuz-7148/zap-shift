import React, {useState} from 'react';
import {CardElement, useElements, useStripe} from '@stripe/react-stripe-js';
import {useNavigate, useParams} from 'react-router';
import {useQuery} from '@tanstack/react-query';
import useAxiosSecure from '../hooks/useAxiosSecure.jsx';
import useAuth from '../hooks/useAuth.jsx';
import Swal from 'sweetalert2';
import {UseTrackingLogger} from '../hooks/useTrackingLogger.jsx';

const PaymentForm = () => {
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const stripe = useStripe()
    const elements = useElements()
    const {parcelId} = useParams()
    const axiosSecure = useAxiosSecure();
    const { user } = useAuth();
    const {logTracking} = UseTrackingLogger()

    const {isPending, data: parcelInfo = {}} = useQuery({
        queryKey: ['parcels', parcelId],
        queryFn: async () => {
            const res = await axiosSecure.get(`/parcels/${parcelId}`)
            return res.data
        }
    })
    if (isPending) {
        return 'loading.....'
    }

    // console.log(parcelInfo)
    const amount = parcelInfo.cost
    const amountInCents = amount * 100


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
            setError(error.message)
        }
        else {
            setError('')
            console.log(paymentMethod)
            const res = await axiosSecure.post('/create-payment-intent', {
                amountInCents,
                parcelId
            })
            const {clientSecret} = res.data
            console.log(clientSecret)
            const result = await stripe.confirmCardPayment(clientSecret, {
                payment_method: {
                    card: elements.getElement(CardElement),
                    billing_details: {
                        name: user.displayName,
                        email: user.email
                    },
                }
            })
            console.log(result)

            if (result.error) {
                setError(result.error.message)
            }
            else {
                setError('')
                if (result.paymentIntent.status === 'succeeded') {
                    console.log('succ')
                    const transactionId = result.paymentIntent.id
                    const paymentData = {
                        parcelId,
                        email: user.email,
                        amount,
                        transactionId: transactionId,
                        paymentMethod: result.paymentIntent.payment_method_types
                    }

                    const paymentRes = await axiosSecure.post('/payments', paymentData);
                    if (paymentRes.data.insertedId) {

                        // ✅ Show SweetAlert with transaction ID
                        await Swal.fire({
                            icon: 'success',
                            title: 'Payment Successful!',
                            html: `<strong>Transaction ID:</strong> <code>${transactionId}</code>`,
                            confirmButtonText: 'Go to My Parcels',
                        });
                        await logTracking({
                            tracking_id: parcelInfo.tracking_id,
                            status: 'Payment done',
                            details: `Paid by ${user.displayName}`,
                            updated_by: user.email
                        })
                        // ✅ Redirect to /myParcels
                        navigate('/dashboard/myParcels');

                    }
                }

                }


        }
    }
    return (
        <form onSubmit={handleSubmit} className="space-y-4 bg-white p-6 rounded-xl shadow-md w-full mt-20 max-w-md mx-auto">
            <CardElement className="p-2 border rounded" />
            <button
                type='submit'
                className="btn btn-primary text-black w-full"
            >
                Pay ${amount}
            </button>
            {
                error && <p className='text-red-500'>{error}</p>
            }
        </form>
    );
};

export default PaymentForm;