import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { useAuth } from "@/hooks/useAuth";
import { useScreenshotProtection } from "@/hooks/useScreenshotProtection";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { FlairProvider } from "@/contexts/FlairContext";
import { GlobalFlairChat } from "@/components/ai/GlobalFlairChat";
import { useProactiveAlerts } from "@/hooks/useProactiveAlerts";

// Lazy load all pages for better code splitting
const Auth = lazy(() => import("./pages/Auth"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const AIHub = lazy(() => import("./pages/AIHub"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const ShipmentDetail = lazy(() => import("./pages/ShipmentDetail"));
const ShipmentSchedule = lazy(() => import("./pages/ShipmentSchedule"));
const Suppliers = lazy(() => import("./pages/Suppliers"));
const SupplierDetail = lazy(() => import("./pages/SupplierDetail"));
const Clients = lazy(() => import("./pages/Clients"));
const ClientDetail = lazy(() => import("./pages/ClientDetail"));
const Orders = lazy(() => import("./pages/Orders"));
const Payments = lazy(() => import("./pages/Payments"));
const Creditors = lazy(() => import("./pages/Creditors"));
const BankAccounts = lazy(() => import("./pages/BankAccounts"));
const ImportData = lazy(() => import("./pages/ImportData"));
const Financials = lazy(() => import("./pages/Financials"));
const Documents = lazy(() => import("./pages/Documents"));
const DocumentWorkflow = lazy(() => import("./pages/DocumentWorkflow"));
const NotFound = lazy(() => import("./pages/NotFound"));
const TeamManagement = lazy(() => import("./pages/TeamManagement"));
const SecurityCenter = lazy(() => import("./pages/SecurityCenter"));
const FileBrowser = lazy(() => import("./pages/FileBrowser"));
const Workspace = lazy(() => import("./pages/Workspace"));
const Invoices = lazy(() => import("./pages/Invoices"));
const FileCosting = lazy(() => import("./pages/FileCosting"));
const Tasks = lazy(() => import("./pages/Tasks"));
const Announcements = lazy(() => import("./pages/Announcements"));
const Messages = lazy(() => import("./pages/Messages"));
const TeamCalendar = lazy(() => import("./pages/TeamCalendar"));
const ActivityLog = lazy(() => import("./pages/ActivityLog"));

// Optimized QueryClient with better caching defaults
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes (formerly cacheTime)
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Loading spinner component
const PageLoader = () => (
  <div 
    className="min-h-screen flex items-center justify-center"
    style={{
      background: 'hsl(260 100% 3%)',
      backgroundImage: 'radial-gradient(circle at 15% 50%, hsl(239 84% 67% / 0.15) 0%, transparent 35%), radial-gradient(circle at 85% 30%, hsl(187 94% 43% / 0.12) 0%, transparent 35%)',
    }}
  >
    <div 
      className="animate-spin rounded-full h-10 w-10 border-2 border-transparent"
      style={{
        borderTopColor: 'hsl(239 84% 67%)',
        borderRightColor: 'hsl(187 94% 43%)',
      }}
    />
  </div>
);

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <PageLoader />;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <Suspense fallback={<PageLoader />}>{children}</Suspense>;
}

function AuthRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <PageLoader />;
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return <Suspense fallback={<PageLoader />}>{children}</Suspense>;
}

function ScreenshotProtectionWrapper({ children }: { children: React.ReactNode }) {
  useScreenshotProtection();
  return <>{children}</>;
}

// Component that enables proactive alerts with toast notifications
function ProactiveAlertListener() {
  useProactiveAlerts(true);
  return null;
}

// Component that renders FLAIR globally for authenticated users
function FlairIntegration() {
  const { user } = useAuth();
  
  if (!user) return null;
  
  return (
    <>
      <ProactiveAlertListener />
      <GlobalFlairChat />
    </>
  );
}

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
        <TooltipProvider>
          <ScreenshotProtectionWrapper>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <FlairProvider>
                <Suspense fallback={<PageLoader />}>
                  <Routes>
                    <Route path="/auth" element={<AuthRoute><Auth /></AuthRoute>} />
                    <Route path="/reset-password" element={<Suspense fallback={<PageLoader />}><ResetPassword /></Suspense>} />
                    <Route path="/" element={<ProtectedRoute><AIHub /></ProtectedRoute>} />
                    <Route path="/analyze" element={<ProtectedRoute><AIHub /></ProtectedRoute>} />
                    <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                    <Route path="/shipments" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                    <Route path="/shipments/:id" element={<ProtectedRoute><ShipmentDetail /></ProtectedRoute>} />
                    <Route path="/schedule" element={<ProtectedRoute><ShipmentSchedule /></ProtectedRoute>} />
                    <Route path="/suppliers" element={<ProtectedRoute><Suppliers /></ProtectedRoute>} />
                    <Route path="/suppliers/:id" element={<ProtectedRoute><SupplierDetail /></ProtectedRoute>} />
                    <Route path="/clients" element={<ProtectedRoute><Clients /></ProtectedRoute>} />
                    <Route path="/clients/:id" element={<ProtectedRoute><ClientDetail /></ProtectedRoute>} />
                    <Route path="/orders" element={<ProtectedRoute><Orders /></ProtectedRoute>} />
                    <Route path="/payments" element={<ProtectedRoute><Payments /></ProtectedRoute>} />
                    <Route path="/creditors" element={<ProtectedRoute><Creditors /></ProtectedRoute>} />
                    <Route path="/bank-accounts" element={<ProtectedRoute><BankAccounts /></ProtectedRoute>} />
                    <Route path="/import" element={<ProtectedRoute><ImportData /></ProtectedRoute>} />
                    <Route path="/financials" element={<ProtectedRoute><Financials /></ProtectedRoute>} />
                    <Route path="/documents" element={<ProtectedRoute><Documents /></ProtectedRoute>} />
                    <Route path="/document-workflow" element={<ProtectedRoute><DocumentWorkflow /></ProtectedRoute>} />
                    <Route path="/files" element={<ProtectedRoute><FileBrowser /></ProtectedRoute>} />
                    <Route path="/workspace" element={<ProtectedRoute><Workspace /></ProtectedRoute>} />
                    <Route path="/invoices" element={<ProtectedRoute><Invoices /></ProtectedRoute>} />
                    <Route path="/file-costing" element={<ProtectedRoute><FileCosting /></ProtectedRoute>} />
                    <Route path="/team" element={<ProtectedRoute><TeamManagement /></ProtectedRoute>} />
                    <Route path="/tasks" element={<ProtectedRoute><Tasks /></ProtectedRoute>} />
                    <Route path="/security" element={<ProtectedRoute><SecurityCenter /></ProtectedRoute>} />
                    <Route path="/announcements" element={<ProtectedRoute><Announcements /></ProtectedRoute>} />
                    <Route path="/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
                    <Route path="/calendar" element={<ProtectedRoute><TeamCalendar /></ProtectedRoute>} />
                    <Route path="/activity-log" element={<ProtectedRoute><ActivityLog /></ProtectedRoute>} />
                    <Route path="*" element={<Suspense fallback={<PageLoader />}><NotFound /></Suspense>} />
                  </Routes>
                </Suspense>
                {/* FLAIR - Global AI Assistant */}
                <FlairIntegration />
              </FlairProvider>
            </BrowserRouter>
          </ScreenshotProtectionWrapper>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
