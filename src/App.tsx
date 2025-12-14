import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { useAuth } from "@/hooks/useAuth";
import { useScreenshotProtection } from "@/hooks/useScreenshotProtection";
import Auth from "./pages/Auth";
import AIHub from "./pages/AIHub";
import Dashboard from "./pages/Dashboard";
import ShipmentDetail from "./pages/ShipmentDetail";
import ShipmentSchedule from "./pages/ShipmentSchedule";
import Suppliers from "./pages/Suppliers";
import SupplierDetail from "./pages/SupplierDetail";
import Clients from "./pages/Clients";
import ClientDetail from "./pages/ClientDetail";
import Orders from "./pages/Orders";
import Payments from "./pages/Payments";
import Creditors from "./pages/Creditors";
import BankAccounts from "./pages/BankAccounts";
import ImportData from "./pages/ImportData";
import Financials from "./pages/Financials";
import Documents from "./pages/Documents";
import NotFound from "./pages/NotFound";
import TeamManagement from "./pages/TeamManagement";
import SecurityCenter from "./pages/SecurityCenter";
import FileBrowser from "./pages/FileBrowser";
import Workspace from "./pages/Workspace";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center"
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
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
}

function AuthRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center"
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
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function ScreenshotProtectionWrapper({ children }: { children: React.ReactNode }) {
  useScreenshotProtection();
  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <TooltipProvider>
        <ScreenshotProtectionWrapper>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/auth" element={<AuthRoute><Auth /></AuthRoute>} />
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
              <Route path="/files" element={<ProtectedRoute><FileBrowser /></ProtectedRoute>} />
              <Route path="/workspace" element={<ProtectedRoute><Workspace /></ProtectedRoute>} />
              <Route path="/team" element={<ProtectedRoute><TeamManagement /></ProtectedRoute>} />
              <Route path="/security" element={<ProtectedRoute><SecurityCenter /></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </ScreenshotProtectionWrapper>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;