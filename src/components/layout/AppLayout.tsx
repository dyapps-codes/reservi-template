import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { ChevronRight } from 'lucide-react'
import { useAuth } from '@dypai-ai/client-sdk/react'
import { getBreadcrumbs, getPageTitle } from '@/config/navigation'

interface AppLayoutProps {
  appName?: string
}

export function AppLayout({ appName }: AppLayoutProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, signOut } = useAuth()

  const pageTitle = getPageTitle(location.pathname)
  const userEmail = user?.email ?? ''
  const userRole = user?.role ?? ''

  const handleLogout = async () => {
    await signOut()
    navigate('/login')
  }

  const breadcrumbs = getBreadcrumbs(location.pathname)

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar onLogout={handleLogout} appName={appName} userEmail={userEmail} userRole={userRole} />

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="flex items-center justify-between h-16 px-6 lg:px-8 border-b border-border bg-card shrink-0">
          <div className="pl-12 lg:pl-0">
            <nav className="flex items-center gap-1.5 text-xs text-muted-foreground mb-0.5">
              {breadcrumbs.map((crumb, i) => (
                <span key={crumb.href} className="flex items-center gap-1.5">
                  {i > 0 && <ChevronRight className="h-3 w-3" />}
                  <span className={i === breadcrumbs.length - 1 ? 'text-foreground' : ''}>
                    {crumb.label}
                  </span>
                </span>
              ))}
            </nav>
            <h1 className="text-lg font-semibold tracking-tight">{pageTitle}</h1>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 border border-primary/20 text-xs font-semibold text-primary">
              {(userEmail || 'A').charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="p-6 lg:p-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
