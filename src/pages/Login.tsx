import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Loader2 } from 'lucide-react'
import { useAuth } from '@dypai-ai/client-sdk/react'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { appConfig } from '@/lib/app-config'
import { toast } from 'sonner'

export function Login() {
  const navigate = useNavigate()
  const { signIn, isAuthenticated, isLoading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate(appConfig.homePath, { replace: true })
    }
  }, [isAuthenticated, isLoading, navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      toast.error('Please fill in all fields')
      return
    }
    setLoading(true)
    const { error } = await signIn(email, password)
    setLoading(false)
    if (error) {
      toast.error(error.message ?? 'Invalid credentials')
      return
    }
    navigate(appConfig.homePath)
  }

  return (
    <AuthLayout>
      <Card className="w-full max-w-[400px] border-border/80 shadow-sm">
        <CardHeader className="space-y-1 pb-4">
          <CardTitle className="text-xl font-semibold tracking-tight">Sign in</CardTitle>
          <CardDescription>Use your workspace email and password.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium leading-none">
                Email
              </label>
              <Input
                id="email"
                type="email"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                autoFocus
                disabled={loading || isLoading}
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-4">
                <label htmlFor="password" className="text-sm font-medium leading-none">
                  Password
                </label>
                <Link
                  to={appConfig.forgotPasswordPath}
                  className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                disabled={loading || isLoading}
                className="h-11"
              />
            </div>
            <Button type="submit" className="h-11 w-full font-medium" disabled={loading || isLoading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Signing in…
                </>
              ) : (
                'Continue'
              )}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col items-center gap-1 border-t pt-6 text-center text-xs text-muted-foreground">
          <span>{appConfig.name}</span>
          <a
            href="https://www.dypai.ai/"
            target="_blank"
            rel="noreferrer"
            className="text-[10px] opacity-60 transition hover:opacity-100"
          >
            Powered by <span className="font-semibold tracking-wide">DYPAI</span>
          </a>
        </CardFooter>
      </Card>
    </AuthLayout>
  )
}
