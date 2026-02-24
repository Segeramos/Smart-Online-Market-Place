// src/App.jsx
import { Routes, Route, Navigate } from "react-router-dom";

import Login from "./pages/auth/Login";
import RoleRoute from "./components/RoleRoute";

import MarketplaceLayout from "./layouts/MarketplaceLayout";
import VendorLayout from "./layouts/VendorLayout";

import Home from "./pages/Home";
import CategoryPage from "./pages/CategoryPage";

// CUSTOMER
import ProductDetail from "./pages/customer/ProductDetail";
import Cart from "./pages/customer/Cart";
import Checkout from "./pages/customer/Checkout";
import MyOrders from "./pages/customer/MyOrders";
import Disputes from "./pages/customer/Disputes";
import DisputeDetail from "./pages/customer/DisputeDetail";

// VENDOR
import VendorDashboard from "./pages/vendor/Dashboard";
import VendorProducts from "./pages/vendor/Products";
import VendorOrders from "./pages/vendor/Orders";
import VendorDisputes from "./pages/vendor/Disputes";
import ProductCreate from "./pages/vendor/ProductCreate";
import ProductEdit from "./pages/vendor/ProductEdit";

// ADMIN
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminVendors from "./pages/admin/Vendors";
import AdminCommission from "./pages/admin/Commission";
import AdminReports from "./pages/admin/Reports";
import AdminDisputes from "./pages/admin/Disputes";
import AdminOrders from "./pages/admin/Orders";
import AdminLayout from "./layouts/AdminLayout";

import { MarketplaceProvider } from "./context/MarketplaceContext.jsx";
import { ToastProvider } from "./components/ToastProvider.jsx";

export default function App() {
  return (
    <MarketplaceProvider>
      <ToastProvider>
        <Routes>
          {/* PUBLIC */}
          <Route path="/login" element={<Login />} />

          {/* MARKETPLACE */}
          <Route path="/" element={<MarketplaceLayout />}>
            <Route index element={<Home />} />
            <Route path="category/:slug" element={<CategoryPage />} />
            <Route path="product/:slug" element={<ProductDetail />} />

            {/* CUSTOMER */}
            <Route element={<RoleRoute allowed={["customer"]} />}>
              <Route path="cart" element={<Cart />} />
              <Route path="checkout" element={<Checkout />} />
              <Route path="orders" element={<MyOrders />} />
              <Route path="disputes" element={<Disputes />} />
              <Route path="disputes/:id" element={<DisputeDetail />} />
            </Route>
          </Route>

          {/* VENDOR */}
          <Route element={<RoleRoute allowed={["vendor"]} />}>
            <Route path="/vendor" element={<VendorLayout />}>
              <Route index element={<VendorDashboard />} />
              <Route path="products" element={<VendorProducts />} />
              <Route path="products/new" element={<ProductCreate />} />
              <Route path="products/:id/edit" element={<ProductEdit />} />
              <Route path="orders" element={<VendorOrders />} />
              <Route path="disputes" element={<VendorDisputes />} />
              <Route path="disputes/:id" element={<DisputeDetail />} />
            </Route>
          </Route>

          {/* ADMIN */}
          <Route element={<RoleRoute allowed={["admin"]} />}>
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="vendors" element={<AdminVendors />} />
              <Route path="commission" element={<AdminCommission />} />
              <Route path="reports" element={<AdminReports />} />
              <Route path="disputes" element={<AdminDisputes />} />
              <Route path="disputes/:id" element={<DisputeDetail />} />
              <Route path="orders" element={<AdminOrders />} />
            </Route>
          </Route>

          {/* FALLBACK */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ToastProvider>
    </MarketplaceProvider>
  );
}