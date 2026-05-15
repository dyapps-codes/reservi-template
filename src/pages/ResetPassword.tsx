import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Loader2, ArrowLeft, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '@dypai-ai/client-sdk/react'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { appConfig } from '@/lib/app-config'
import { toast } from 'sonner'

export function ResetPassword() {
  const navigate = useNavigate()
  const {
    setPassword: doSetPassword,
    isAuthenticated,
    authEvent,
    isLoading,
    isPasswordRecovery,
    lastError,
  } = useAuth()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [show, setShow] = useState(false)
  const validSession = isPasswordRecovery || authEvent === 'PASSWORD_RECOVERY' || isAuthenticated

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!password || !confirm) {
      toast.error('Please fill in all fields')
      return
    }
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }
    if (password !== confirm) {
      toast.error('Passwords do not match')
      return
    }
    setLoading(true)
    const { error } = await doSetPassword(password)
    setLoading(false)
    if (error) {
      toast.error(error.message ?? 'Could not update password')
      return
    }
    toast.success('Password updated successfully')
    navigate(appConfig.homePath)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    )
  }

  const strength = password.length === 0 ? 0 : password.length < 8 ? 1 : password.length < 12 ? 2 : 3
  const strengthLabel = ['', 'Weak', 'Good', 'Strong'][strength]
  const strengthColor = ['', 'bg-red-400', 'bg-amber-400', 'bg-emerald-500'][strength]

  return (
    <AuthLayout>
      <Card className="border-border/80 shadow-sm">
        {!validSession ? (
          <CardContent className="space-y-4 pt-6">
            <div className="space-y-1">
              <h1 className="text-xl font-semibold tracking-tight">Link expired</h1>
              <p className="text-sm text-muted-foreground">
                {lastError?.message || 'This reset link is invalid or has expired. Please request a new one.'}
              </p>
            </div>
            <Button asChild className="h-11 w-full font-medium">
              <Link to={appConfig.forgotPasswordPath}>Request new link</Link>
            </Button>
          </CardContent>
        ) : (
          <>
            <CardHeader className="space-y-1 pb-4">
              <CardTitle className="text-xl font-semibold tracking-tight">Set new password</CardTitle>
              <CardDescription>Choose a strong password for your account.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="password" className="text-sm font-medium">New password</label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={show ? 'text' : 'password'}
                      placeholder="Min. 8 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoFocus
                      className="h-11 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShow(!show)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {password.length > 0 && (
                    <div className="space-y-1 pt-1">
                      <div className="flex gap-1">
                        {[1, 2, 3].map((i) => (
                          <div
                            key={i}
                            className={`h-1 flex-1 rounded-full transition-all duration-300 ${i <= strength ? strengthColor : 'bg-muted'}`}
                          />
                        ))}
                      </div>
                      <p className={`text-xs font-medium ${strength === 1 ? 'text-red-500' : strength === 2 ? 'text-amber-500' : 'text-emerald-600'}`}>
                        {strengthLabel}
                      </p>
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="confirm" className="text-sm font-medium">Confirm password</label>
                  <Input
                    id="confirm"
                    type="password"
                    placeholder="Repeat your password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    className="h-11"
                  />
                  {confirm.length > 0 && password !== confirm && (
                    <p className="text-xs text-destructive">Passwords do not match</p>
                  )}
                </div>

                <Button type="submit" className="h-11 w-full font-medium" disabled={loading}>
                  {loading ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Updating...</>
                  ) : (
                    'Update password'
                  )}
                </Button>
              </form>
            </CardContent>
          </>
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
