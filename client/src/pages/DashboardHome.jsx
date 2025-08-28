import React from 'react'
import useUserRole from '../hooks/useUserRole.jsx';
import {UserDashboard} from './UserDashboard.jsx';
import {RiderDashboard} from './RiderDashboard.jsx';
import {AdminDashboard} from './AdminDashboard.jsx';
import Forbidden from './Forbidden.jsx';

export const DashboardHome = () => {
const { role, roleLoading } = useUserRole()
    if (roleLoading) {
        return <p>Loading ..</p>
    }
    if (role === 'user'){
        return <UserDashboard />
    }
    else if (role === 'rider') {
        return <RiderDashboard />
    }
    else if (role === 'admin') {
        return <AdminDashboard />
    }
    else {
        return <Forbidden />
    }
    
}