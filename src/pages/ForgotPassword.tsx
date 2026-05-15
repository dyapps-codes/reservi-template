import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Loader2, ArrowLeft, Mail } from 'lucide-react'
import { useAuth } from '@dypai-ai/client-sdk/react'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { appConfig } from '@/lib/app-config'
import { toast } from 'sonner'

export function ForgotPassword() {
  const { resetPassword } = useAuth()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) {
      toast.error('Enter your email address')
      return
    }
    setLoading(true)
    const { error } = await resetPassword(email)
    setLoading(false)
    if (error) {
      toast.error(error.message ?? 'Could not send reset email')
      return
    }
    setSent(true)
  }

  return (
    <AuthLayout>
      <Card className="border-border/80 shadow-sm">
        {!sent ? (
          <>
            <CardHeader className="space-y-1 pb-4">
              <CardTitle className="text-xl font-semibold tracking-tight">Reset password</CardTitle>
              <CardDescription>Enter your email and we'll send you a reset link.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium leading-none">Email</label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    autoFocus
                    className="h-11"
                  />
                </div>
                <Button type="submit" className="h-11 w-full font-medium" disabled={loading}>
                  {loading ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Sending...</>
                  ) : (
                    'Send reset link'
                  )}
                </Button>
              </form>
            </CardContent>
          </>
        ) : (
          <CardContent className="space-y-4 pt-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-md border bg-muted">
              <Mail className="h-6 w-6 text-muted-foreground" />
            </div>
            <div className="space-y-1">
              <h1 className="text-xl font-semibold tracking-tight">Check your inbox</h1>
              <p className="text-sm text-muted-foreground">
                We sent a reset link to <span className="font-medium text-foreground">{email}</span>.
                Check your spam folder if you don't see it.
              </p>
            </div>
            <button onClick={() => setSent(false)} className="text-sm text-primary hover:underline">
              Resend email
            </button>
          </CardContent>
        )}
      </Card>

      <div className="mt-6">
        <Link
          to={appConfig.loginPath}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to sign in
        </Link>
      </div>
    </AuthLayout>
  )
}
