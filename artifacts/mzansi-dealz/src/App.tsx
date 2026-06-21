import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CartProvider } from "@/hooks/use-cart";
import { Layout } from "@/components/Layout";
import { AdminLayout } from "@/components/AdminLayout";
import { useAdminToken } from "@/hooks/use-admin";

import Home from "@/pages/Home";
import Shop from "@/pages/Shop";
import ProductDetail from "@/pages/ProductDetail";
import Cart from "@/pages/Cart";
import Checkout from "@/pages/Checkout";
import OrderConfirmation from "@/pages/OrderConfirmation";
import About from "@/pages/About";
import Contact from "@/pages/Contact";
import PrivacyPolicy from "@/pages/PrivacyPolicy";
import TermsConditions from "@/pages/TermsConditions";
import ReturnsRefunds from "@/pages/ReturnsRefunds";
import ShippingDelivery from "@/pages/ShippingDelivery";
import NotFound from "@/pages/not-found";

import AdminLogin from "@/pages/admin/AdminLogin";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import AdminProducts from "@/pages/admin/AdminProducts";
import AdminProductForm from "@/pages/admin/AdminProductForm";
import AdminOrders from "@/pages/admin/AdminOrders";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000,
    },
  },
});

function AdminRoutes() {
  const { token } = useAdminToken();
  const [, navigate] = useLocation();

  if (!token) {
    return (
      <Switch>
        <Route path="/login" component={AdminLogin} />
        <Route>
          {() => {
            navigate("/login");
            return null;
          }}
        </Route>
      </Switch>
    );
  }

  return (
    <AdminLayout>
      <Switch>
        <Route path="/">
          {() => {
            navigate("/products");
            return null;
          }}
        </Route>
        <Route path="/dashboard" component={AdminDashboard} />
        <Route path="/products" component={AdminProducts} />
        <Route path="/products/new">
          {() => <AdminProductForm params={{ id: "new" }} />}
        </Route>
        <Route path="/products/:id/edit">
          {(params) => <AdminProductForm params={{ id: params.id }} />}
        </Route>
        <Route path="/orders" component={AdminOrders} />
        <Route component={NotFound} />
      </Switch>
    </AdminLayout>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/admin">
        {() => (
          <WouterRouter base="/admin">
            <AdminRoutes />
          </WouterRouter>
        )}
      </Route>
      <Route path="/admin/*">
        {() => (
          <WouterRouter base="/admin">
            <AdminRoutes />
          </WouterRouter>
        )}
      </Route>
      <Route>
        <Layout>
          <Switch>
            <Route path="/" component={Home} />
            <Route path="/shop" component={Shop} />
            <Route path="/shop/:category">
              {(params) => <Shop params={{ category: params.category }} />}
            </Route>
            <Route path="/product/:id">
              {(params) => <ProductDetail params={{ id: params.id }} />}
            </Route>
            <Route path="/cart" component={Cart} />
            <Route path="/checkout" component={Checkout} />
            <Route path="/order-confirmation/:orderNumber">
              {(params) => <OrderConfirmation params={{ orderNumber: params.orderNumber }} />}
            </Route>
            <Route path="/about" component={About} />
            <Route path="/contact" component={Contact} />
            <Route path="/privacy-policy" component={PrivacyPolicy} />
            <Route path="/terms-conditions" component={TermsConditions} />
            <Route path="/returns-refunds" component={ReturnsRefunds} />
            <Route path="/shipping-delivery" component={ShippingDelivery} />
            <Route component={NotFound} />
          </Switch>
        </Layout>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <CartProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </CartProvider>
    </QueryClientProvider>
  );
}

export default App;
