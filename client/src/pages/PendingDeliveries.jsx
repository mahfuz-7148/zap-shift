import React from 'react'
import useAxiosSecure from '../hooks/useAxiosSecure.jsx';
import useAuth from '../hooks/useAuth.jsx';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';

export const PendingDeliveries = () => {
    const axiosSecure = useAxiosSecure();
    const { user } = useAuth();
    const queryClient = useQueryClient();

    const {data: parcels = [], isLoading} = useQuery({
        queryKey: ['riderParcels', user?.email],
        enabled: !!user?.email,
        queryFn: async () => {
            const res = await axiosSecure.get('/rider/parcels', {
                params: {
                    email: user.email
                }
            })
            return res.data
        }
    })
    const {mutateAsync: updateStatus} = useMutation({
        mutationFn: async (parcel, status) => {
            const res = await axiosSecure.patch(`/parcels/${parcel._id}/status`, {
                status
            })
            return res.data
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['riderParcels', user?.email])
        }
    })
    return (
        <div>

        </div>
    )
}