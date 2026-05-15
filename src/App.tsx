import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { DypaiProvider, ProtectedRoute } from '@dypai-ai/client-sdk/react'
import { Loader2 } from 'lucide-react'
import { dypai } from '@/lib/dypai'
import { appConfig } from '@/lib/app-config'
import { AppLayout } from './components/layout/AppLayout'
import { Login } from './pages/Login'
import { ForgotPassword } from './pages/ForgotPassword'
import { ResetPassword } from './pages/ResetPassword'
import { Dashboard } from './pages/Dashboard'
import { Bookings } from './pages/Bookings'
import { Calendar } from './pages/Calendar'
import { Services } from './pages/Services'
import { Resources } from './pages/Resources'
import { Customers } from './pages/Customers'
import { CustomerDetail } from './pages/CustomerDetail'
import { Settings } from './pages/Settings'
import { Book } from './pages/Book'
import { BookingDetail } from './pages/BookingDetail'
import { Landing } from './pages/Landing'
import { AdminUsers } from './pages/admin/AdminUsers'
import NotFound from './pages/NotFound'

const queryClient = new QueryClient()

function LoadingScreen() {
  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
    </div>
  )
}

const App = () => (
  <DypaiProvider client={dypai}>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public landing */}
            <Route path="/" element={<Landing />} />

            {/* Public booking flow */}
            <Route path={appConfig.publicBookPath} element={<Book />} />
            <Route path={`${appConfig.publicBookPath}/:serviceSlug`} element={<Book />} />
            <Route path="/r/:code" element={<BookingDetail />} />
            <Route path={appConfig.loginPath} element={<Login />} />
            <Route path={appConfig.forgotPasswordPath} element={<ForgotPassword />} />
            <Route path={appConfig.passwordRecoveryPath} element={<ResetPassword />} />

            {/* Protected app shell */}
            <Route
              element={
                <ProtectedRoute
                  loadingComponent={<LoadingScreen />}
                  unauthenticatedComponent={<Navigate to={appConfig.loginPath} replace />}
                >
                  <Outlet />
                </ProtectedRoute>
              }
            >
              <Route element={<AppLayout appName={appConfig.name} />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/bookings"  element={<Bookings />} />
                <Route path="/calendar"  element={<Calendar />} />
                <Route path="/services"  element={<Services />} />
                <Route path="/resources" element={<Resources />} />
                <Route path="/customers" element={<Customers />} />
                <Route path="/customers/:id" element={<CustomerDetail />} />
                <Route path="/settings"  element={<Settings />} />
                <Route
                  path={appConfig.adminUsersPath}
                  element={
                    <ProtectedRoute
                      roles={['admin']}
                      loadingComponent={<LoadingScreen />}
                      unauthorizedComponent={<Navigate to="/dashboard" replace />}
                    >
                      <AdminUsers />
                    </ProtectedRoute>
                  }
                />
              </Route>
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </DypaiProvider>
)

export default App
