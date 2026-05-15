import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'
import { Layers } from 'lucide-react'
import { appConfig } from '@/lib/app-config'

interface AuthLayoutProps {
  children: ReactNode
  footer?: ReactNode
}

export function AuthLayout({ children, footer }: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/30 px-4 py-10">
      <Link to={appConfig.loginPath} className="mb-8 flex items-center gap-2.5 text-foreground">
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <Layers className="h-4 w-4" />
        </div>
        <span className="text-lg font-semibold tracking-tight">{appConfig.name}</span>
      </Link>

      <div className="w-full max-w-[400px]">{children}</div>

      {footer && <div className="mt-6 text-center text-xs text-muted-foreground">{footer}</div>}
    </div>
  )
}
