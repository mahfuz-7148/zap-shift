import { createBrowserRouter } from "react-router";
import RootLayout from "../layouts/RootLayout";
import Home from "../pages/Home/Home/Home";
import AuthLayout from "../layouts/AuthLayout";
import Login from "../pages/Authentication/Login/Login";
import Register from "../pages/Authentication/Register/Register";
import Coverage from '../pages/Coverage.jsx';
import PrivateRoute from '../routes/PrivateRoute.jsx';
import SendParcel from '../pages/SendParcel.jsx';
import DashboardLayout from '../layouts/DashboardLayout.jsx';
import MyParcels from '../pages/MyParcels.jsx';
import Payment from '../pages/Payment.jsx';
import PaymentHistory from '../pages/PaymentHistory.jsx';
import TrackParcel from '../pages/TrackParcel.jsx';
import BeARider from '../pages/BeARider.jsx';
import PendingRiders from '../pages/PendingRiders.jsx';
import ActiveRiders from '../pages/ActiveRiders.jsx';


export const router = createBrowserRouter([
  {
    path: "/",
    Component: RootLayout,
    children: [
      {
        index: true,
        Component: Home
      },
      {
        path: 'coverage',
        Component: Coverage,
        loader: () => fetch('./serviceCenter.json')
      },
      {
        path: 'beARider',
        element: <PrivateRoute><BeARider></BeARider></PrivateRoute>,
        loader: () => fetch('./serviceCenter.json')
      },
      {
        path: 'sendParcel',
        element: <PrivateRoute><SendParcel></SendParcel></PrivateRoute>,
        loader: () => fetch('./serviceCenter.json')
      }
    ]
  },
  {
    path: '/',
    Component: AuthLayout,
    children: [
      {
        path: 'login',
        Component: Login
      },
      {
        path: 'register',
        Component: Register
      }
    ]
  },
  {
    path: '/dashboard',
    element: <PrivateRoute>
      <DashboardLayout></DashboardLayout>
    </PrivateRoute>,
    children: [
      {
        path: 'myParcels',
        Component: MyParcels
      },
      {
        path: 'payment/:parcelId',
        Component: Payment
      },
      {
        path: 'paymentHistory',
        Component: PaymentHistory
      },
      {
        path: 'track',
        Component: TrackParcel
      },
      {
        path: 'pending-riders',
        Component: PendingRiders
      },
      {
        path: 'active-riders',
        Component: ActiveRiders
      }
    ]
  }

]);