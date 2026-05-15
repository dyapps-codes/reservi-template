import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { cn, getAvatarColor } from '@/lib/utils'
import { Separator } from '@/components/ui/separator'
import { appConfig } from '@/lib/app-config'
import { adminNavItems, mainNavItems, type AppNavItem } from '@/config/navigation'
import { LogOut, ChevronLeft, Menu, X, Layers, ShieldCheck } from 'lucide-react'

interface SidebarProps {
  onLogout: () => void
  appName?: string
  userEmail?: string
  userRole?: string
}

export function Sidebar({ onLogout, appName = appConfig.name, userEmail = '', userRole = '' }: SidebarProps) {
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  const isActive = (href: string) =>
    href === '/' ? location.pathname === '/' : location.pathname.startsWith(href)

  const avatarColor = getAvatarColor(userEmail || 'A')
  const initials = userEmail ? userEmail.charAt(0).toUpperCase() : 'A'
  const visibleAdminNavItems = adminNavItems.filter((item) => !item.requiredRole || item.requiredRole === userRole)
  const showAdmin = visibleAdminNavItems.length > 0

  const renderNavItems = (items: AppNavItem[]) => items.map((item) => {
    const Icon = item.icon
    const active = isActive(item.href)

    return (
      <Link
        key={item.href}
        to={item.href}
        onClick={() => setMobileOpen(false)}
        className={cn(
          'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all duration-200 group relative',
          collapsed ? 'justify-center px-2' : '',
          active
            ? 'bg-primary/10 text-foreground'
            : 'text-muted-foreground hover:text-foreground hover:bg-sidebar-accent'
        )}
      >
        {active && (
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-primary" />
        )}
        <Icon className={cn('h-4 w-4 shrink-0', active ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground')} />
        {!collapsed && <span className="flex-1">{item.label}</span>}
        {!collapsed && item.badge != null && item.badge > 0 && (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground px-1.5">
            {item.badge}
          </span>
        )}
        {collapsed && item.badge != null && item.badge > 0 && (
          <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
            {item.badge}
          </span>
        )}
        {collapsed && (
          <div className="absolute left-full ml-2 px-2 py-1 rounded-md bg-popover border border-border shadow-sm text-xs font-medium opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
            {item.label}{item.badge ? ` (${item.badge})` : ''}
          </div>
        )}
      </Link>
    )
  })

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className={cn('flex items-center gap-3 px-4 h-16 shrink-0', collapsed ? 'justify-center' : 'justify-between')}>
        <div className={cn('flex items-center gap-3 min-w-0', collapsed && 'justify-center')}>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
            <Layers className="h-4 w-4 text-primary" />
          </div>
          {!collapsed && <span className="text-sm font-semibold truncate">{appName}</span>}
        </div>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden lg:flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors"
        >
          <ChevronLeft className={cn('h-4 w-4 transition-transform duration-200', collapsed && 'rotate-180')} />
        </button>
      </div>

      <Separator className="bg-sidebar-border" />

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {renderNavItems(mainNavItems)}

        {showAdmin && (
          <div className="pt-4">
            {!collapsed && (
              <div className="mb-2 flex items-center gap-2 px-3 text-[11px] font-medium uppercase text-muted-foreground">
                <ShieldCheck className="h-3.5 w-3.5" />
                Admin
              </div>
            )}
            <div className="space-y-1">{renderNavItems(visibleAdminNavItems)}</div>
          </div>
        )}
      </nav>

      {/* User section */}
      <div className="mt-auto">
        <Separator className="bg-sidebar-border" />
        <div className={cn('px-3 py-4', collapsed ? 'flex justify-center' : '')}>
          {!collapsed ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold', avatarColor)}>
                  {initials}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">Account</p>
                  <p className="text-xs text-muted-foreground truncate">{userEmail}</p>
                </div>
              </div>
              <button
                onClick={onLogout}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors"
                aria-label="Log out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={onLogout}
              className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors group relative"
              aria-label="Log out"
            >
              <LogOut className="h-4 w-4" />
              <div className="absolute left-full ml-2 px-2 py-1 rounded-md bg-popover border border-border shadow-sm text-xs font-medium opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                Log out
              </div>
            </button>
          )}
        </div>
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-4 left-4 z-50 flex lg:hidden h-10 w-10 items-center justify-center rounded-lg border border-border bg-card shadow-sm text-foreground"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-64 bg-sidebar border-r border-sidebar-border">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
            {sidebarContent}
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className={cn(
        'hidden lg:flex flex-col h-screen bg-sidebar border-r border-sidebar-border shrink-0 transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}>
        {sidebarContent}
      </aside>
    </>
  )
}
