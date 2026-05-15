import {
  CalendarClock,
  CalendarDays,
  LayoutDashboard,
  Settings,
  Sparkles,
  Users,
  UsersRound,
  type LucideIcon,
} from 'lucide-react'
import { appConfig } from '@/lib/app-config'

export interface AppNavItem {
  label: string
  href: string
  icon: LucideIcon
  badge?: number
  requiredRole?: string
}

export interface BreadcrumbItem {
  label: string
  href: string
}

export const mainNavItems: AppNavItem[] = [
  { label: 'Dashboard',  href: '/dashboard', icon: LayoutDashboard },
  { label: 'Calendar',   href: '/calendar',  icon: CalendarDays },
  { label: 'Bookings',   href: '/bookings',  icon: CalendarClock },
  { label: 'Services',   href: '/services',  icon: Sparkles },
  { label: 'Resources',  href: '/resources', icon: UsersRound },
  { label: 'Customers',  href: '/customers', icon: Users },
  { label: 'Settings',   href: '/settings',  icon: Settings },
]

export const adminNavItems: AppNavItem[] = [
  { label: 'Users', href: appConfig.adminUsersPath, icon: Users, requiredRole: 'admin' },
]

export const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/calendar':  'Calendar',
  '/bookings':  'Bookings',
  '/services':  'Services',
  '/resources': 'Resources',
  '/customers': 'Customers',
  '/settings':  'Settings',
  [appConfig.adminUsersPath]: 'Users',
}

export function getPageTitle(pathname: string) {
  return pageTitles[pathname] ?? 'Page'
}

export function getBreadcrumbs(pathname: string): BreadcrumbItem[] {
  const pageTitle = getPageTitle(pathname)

  if (pathname === appConfig.homePath) {
    return [{ label: pageTitle, href: appConfig.homePath }]
  }

  if (pathname.startsWith('/admin')) {
    return [
      { label: 'Dashboard', href: appConfig.homePath },
      { label: 'Admin', href: '/admin' },
      { label: pageTitle, href: pathname },
    ]
  }

  return [
    { label: 'Dashboard', href: appConfig.homePath },
    { label: pageTitle, href: pathname },
  ]
}
