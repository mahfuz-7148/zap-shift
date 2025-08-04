import React from 'react'
import useAxiosSecure from '../hooks/useAxiosSecure.jsx';
import {useQuery} from '@tanstack/react-query';

export const AssignRider = () => {
    const axiosSecure = useAxiosSecure();

    const {data: parcels = [], isLoading} = useQuery({
        queryKey: ['assignableParcels'],
        queryFn: async () => {
            const res = await axiosSecure.get('/parcels?payment_status=paid&delivery_status=not_collected')
            // console.log(res.data)
            return res.data
        }

    })
    // console.log(parcels)

    return (
        <div className="p-6">
            <h2 className="text-2xl font-bold mb-4">Assign Rider to Parcels</h2>
            {
                isLoading ? (
                    <p>Loading parcels...</p>
                ) : parcels.length === 0 ? (
                <p className="text-gray-500">No parcels available for assignment.</p>
                ): (
                    <div className="overflow-x-auto">
                        <table className="table table-zebra w-full">
                            <thead>
                            <tr>
                                <th>Tracking ID</th>
                                <th>Title</th>
                                <th>Type</th>
                                <th>Sender Center</th>
                                <th>Receiver Center</th>
                                <th>Cost</th>
                                <th>Created At</th>
                                <th>Action</th>
                            </tr>
                            </thead>

                        </table>
                        {/* 🛵 Assign Rider Modal */}
                        <dialog id="assignModal" className="modal">
                            <div className="modal-box max-w-2xl">
                                <h3 className="text-lg font-bold mb-3">
                                    Assign Rider for Parcel:
                                    <span className="text-primary">title</span>
                                </h3>


                                <p>Loading riders...</p>

                                <p className="text-error">No available riders in this district.</p>

                                <div className="overflow-x-auto max-h-80 overflow-y-auto">
                                    <table className="table table-sm">
                                        <thead>
                                        <tr>
                                            <th>Name</th>
                                            <th>Phone</th>
                                            <th>Bike Info</th>
                                            <th>Action</th>
                                        </tr>
                                        </thead>
                                        <tbody>

                                        <tr >
                                            <td>fdfd</td>
                                            <td>phone</td>

                                            <td>
                                                <button
                                                    className="btn btn-xs btn-success">
                                                    Assign
                                                </button>
                                            </td>
                                        </tr>

                                        </tbody>
                                    </table>
                                </div>


                                <div className="modal-action">
                                    <form method="dialog">
                                        <button className="btn">Close</button>
                                    </form>
                                </div>
                            </div>
                        </dialog>
                    </div>
                )
            }



        </div>
    );
};