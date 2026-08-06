import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';

import Login from './pages/auth/Login';
import Register from './pages/auth/Register';

import VendorDashboard from './pages/vendor/VendorDashboard';
import Wallet from './pages/vendor/Wallet';
import BuyPins from './pages/vendor/BuyPins';
import BuyAirtime from './pages/vendor/BuyAirtime';
import MyPurchases from './pages/vendor/MyPurchases';
import PurchasedPins from './pages/vendor/PurchasedPins';
import Transactions from './pages/vendor/Transactions';

import AdminDashboard from './pages/admin/AdminDashboard';
import CreateBatch from './pages/admin/CreateBatch';
import UploadPins from './pages/admin/UploadPins';
import Inventory from './pages/admin/Inventory';
import Vendors from './pages/admin/Vendors';
import Sales from './pages/admin/Sales';
import Reports from './pages/admin/Reports';

function RootRedirect() {
  const { isAuthenticated, user, isLoading } = useAuth();
  if (isLoading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Navigate to={user?.role === 'ADMIN' ? '/admin' : '/vendor'} replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route element={<ProtectedRoute allowedRoles={['VENDOR']} />}>
          <Route element={<Layout />}>
            <Route path="/vendor" element={<VendorDashboard />} />
            <Route path="/vendor/wallet" element={<Wallet />} />
            <Route path="/vendor/buy-pins" element={<BuyPins />} />
            <Route path="/vendor/buy-airtime" element={<BuyAirtime />} />
            <Route path="/vendor/purchases" element={<MyPurchases />} />
            <Route path="/vendor/purchases/:purchaseId" element={<PurchasedPins />} />
            <Route path="/vendor/transactions" element={<Transactions />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
          <Route element={<Layout />}>
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/create-batch" element={<CreateBatch />} />
            <Route path="/admin/upload-pins" element={<UploadPins />} />
            <Route path="/admin/inventory" element={<Inventory />} />
            <Route path="/admin/vendors" element={<Vendors />} />
            <Route path="/admin/sales" element={<Sales />} />
            <Route path="/admin/reports" element={<Reports />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
