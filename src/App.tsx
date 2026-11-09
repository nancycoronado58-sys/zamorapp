import { BrowserRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { AppProvider, useApp } from '@/context/AppContext';
import { CartProvider } from '@/context/CartContext';
import { ToastProvider } from '@/components/ui/Toast';
import { EmergencyBar } from '@/components/layout/EmergencyBar';
import { LayoutShell } from '@/components/layout/Header';
import { CartDrawer } from '@/components/layout/CartDrawer';
import { ChatWidget } from '@/components/ChatWidget';
import { PublishModal } from '@/components/PublishModal';
import { HomePage } from '@/pages/HomePage';
import { StoresPage } from '@/pages/StoresPage';
import { ServicesPage } from '@/pages/ServicesPage';
import { JobsPage } from '@/pages/JobsPage';
import { HealthPage } from '@/pages/HealthPage';
import { DroppersPage } from '@/pages/DroppersPage';
import { CategoriesPage } from '@/pages/CategoriesPage';
import { BusinessDetailPage } from '@/pages/BusinessDetailPage';
import { ProductDetailPage } from '@/pages/ProductDetailPage';
import { CheckoutPage } from '@/pages/CheckoutPage';
import { OrdersPage, OrderDetailPage } from '@/pages/OrdersPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { AdminPage } from '@/pages/AdminPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { SignInPage } from '@/pages/auth/SignInPage';
import { SignUpPage } from '@/pages/auth/SignUpPage';
import { ResetPasswordPage } from '@/pages/auth/ResetPasswordPage';
import { supabase } from '@/lib/supabase';

function AppShell() {
  const [publishOpen, setPublishOpen] = useState(false);
  const { profile, loading, signOut } = useApp();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' && window.location.pathname !== '/reset-password') {
        navigate('/reset-password', { replace: true });
      }
    });

    return () => listener.subscription.unsubscribe();
  }, [navigate]);

  // Auth pages render without the marketplace chrome
  const isAuthPage = location.pathname === '/signin' || location.pathname === '/signup' || location.pathname === '/reset-password';

  if (!loading && profile && profile.role !== 'admin' && profile.approval_status !== 'approved' && !isAuthPage) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4">
        <div className="card max-w-md p-8 text-center">
          <h1 className="text-xl font-bold text-neutral-900">Cuenta pendiente de aprobación</h1>
          <p className="mt-2 text-sm text-neutral-600">Tu registro fue recibido. El equipo de Zamorapp revisará tu solicitud y te notificará por correo.</p>
          <button onClick={() => void signOut()} className="btn-primary mt-6">Cerrar sesión</button>
        </div>
      </div>
    );
  }

  if (isAuthPage) {
    return (
      <Routes>
        <Route path="/signin" element={<SignInPage />} />
        <Route path="/signup" element={<SignUpPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
      </Routes>
    );
  }

  return (
    <>
      <EmergencyBar />
      <LayoutShell onOpenPublish={() => setPublishOpen(true)}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/categories" element={<CategoriesPage />} />
          <Route path="/stores" element={<StoresPage />} />
          <Route path="/services" element={<ServicesPage />} />
          <Route path="/jobs" element={<JobsPage />} />
          <Route path="/health" element={<HealthPage />} />
          <Route path="/droppers" element={<DroppersPage />} />
          <Route path="/business/:slug" element={<BusinessDetailPage />} />
          <Route path="/product/:id" element={<ProductDetailPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/orders/:id" element={<OrderDetailPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/superadmin" element={<AdminPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="*" element={<HomePage />} />
        </Routes>
      </LayoutShell>
      <CartDrawer />
      <ChatWidget />
      <PublishModal open={publishOpen} onClose={() => setPublishOpen(false)} />
    </>
  );
}

export default function App() {
  return (
    <AppProvider>
      <ToastProvider>
        <CartProvider>
          <BrowserRouter>
            <AppShell />
          </BrowserRouter>
        </CartProvider>
      </ToastProvider>
    </AppProvider>
  );
}
