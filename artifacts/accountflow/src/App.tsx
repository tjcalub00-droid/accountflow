import { type ReactNode, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { TooltipProvider } from '@/components/ui/tooltip';
import {
  Route,
  Switch,
  useLocation,
  Router as WouterRouter,
} from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import DashboardPage from '@/app/page';
import LoginPage from '@/app/login/page';
import CompanySettingsPage from '@/app/company-settings/page';
import EmployeeManagementPage from '@/app/employee-management/page';
import ExpensesPage from '@/app/expenses/page';
import FinancialReportsPage from '@/app/financial-reports/page';
import InvoicesBillingPage from '@/app/invoices-billing/page';
import PayrollTaxPage from '@/app/payroll-tax/page';
import ReceiptStoragePage from '@/app/receipt-storage/page';
import UserManagementPage from '@/app/user-management/page';
import VoucherManagementPage from '@/app/voucher-management/page';
import AuthCallbackPage from '@/app/auth/callback/page';
import NotFound from '@/app/not-found';

const queryClient = new QueryClient();

function Router() {
  const [location, navigate] = useLocation();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user && location !== '/login' && location !== '/auth/callback') {
      navigate('/login', { replace: true });
    } else if (!loading && user && location === '/login') {
      navigate('/', { replace: true });
    }
  }, [loading, user, location, navigate]);
  if (
    loading ||
    (!user && location !== '/login' && location !== '/auth/callback') ||
    (user && location === '/login')
  ) return <div className="min-h-screen bg-background" />;

  return (
    // Keep a shared shell (sidebar, navbar) outside the boundary so it
    // survives a page crash.
    <RoutedErrorBoundary>
      <Switch>
        <Route path="/" component={DashboardPage} />
        <Route path="/login" component={LoginPage} />
        <Route path="/auth/callback" component={AuthCallbackPage} />
        <Route path="/company-settings" component={CompanySettingsPage} />
        <Route path="/employee-management" component={EmployeeManagementPage} />
        <Route path="/expenses" component={ExpensesPage} />
        <Route path="/financial-reports" component={FinancialReportsPage} />
        <Route path="/invoices-billing" component={InvoicesBillingPage} />
        <Route path="/payroll-tax" component={PayrollTaxPage} />
        <Route path="/receipt-storage" component={ReceiptStoragePage} />
        <Route path="/user-management" component={UserManagementPage} />
        <Route path="/voucher-management" component={VoucherManagementPage} />
        <Route component={NotFound} />
      </Switch>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
