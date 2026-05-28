import { useEffect, useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import { Loader2, LogIn } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/auth-context'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PasswordInput } from '@/components/password-input'

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(1, 'Please enter your password'),
})

type LoginForm = z.infer<typeof loginSchema>

export function LoginPage() {
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()
  const search = useSearch({ from: '/(auth)/sign-in' })
  const { login, isAuthenticated, isLoading: isAuthLoading } = useAuth()

  useEffect(() => {
    if (!isAuthLoading && isAuthenticated) {
      navigate({ to: '/', replace: true })
    }
  }, [isAuthenticated, isAuthLoading, navigate])

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  async function onSubmit(data: LoginForm) {
    setIsLoading(true)
    try {
      await login({ email: data.email, password: data.password })
      const redirect = (search as { redirect?: string }).redirect
      navigate({ to: redirect || '/', replace: true })
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'requiresMfa' in error) {
        navigate({ to: '/mfa', search: { email: data.email } })
        return
      }
      const message =
        error instanceof Error ? error.message : 'Invalid email or password'
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container grid h-svh max-w-none items-center justify-center">
      <div className="mx-auto flex w-full flex-col justify-center space-y-2 py-8 sm:p-8">
        <Card className="max-w-sm gap-4">
          <CardHeader>
            <CardTitle className="text-lg tracking-tight">Sign in</CardTitle>
            <CardDescription>
              Enter your email and password to log into your account.{' '}
              <Link
                to="/sign-up"
                className="text-nowrap underline underline-offset-4 hover:text-primary"
              >
                Sign Up
              </Link>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="grid gap-3">
              <div className="grid gap-1">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  placeholder="name@example.com"
                  type="email"
                  autoCapitalize="none"
                  autoComplete="email"
                  autoFocus
                  disabled={isLoading}
                  {...register('email')}
                />
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email.message}</p>
                )}
              </div>
              <div className="grid gap-1">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Link
                    to="/forgot-password"
                    className="text-sm text-muted-foreground underline underline-offset-4 hover:text-primary"
                  >
                    Forgot password?
                  </Link>
                </div>
                <PasswordInput
                  id="password"
                  placeholder="********"
                  autoComplete="current-password"
                  disabled={isLoading}
                  {...register('password')}
                />
                {errors.password && (
                  <p className="text-sm text-destructive">{errors.password.message}</p>
                )}
              </div>
              <Button className="mt-2" disabled={isLoading} type="submit">
                {isLoading ? <Loader2 className="animate-spin" /> : <LogIn />}
                Sign in
              </Button>
            </form>
          </CardContent>
          <CardFooter>
            <p className="px-8 text-center text-sm text-muted-foreground">
              By clicking sign in, you agree to our{' '}
              <a
                href="/terms"
                className="underline underline-offset-4 hover:text-primary"
              >
                Terms of Service
              </a>{' '}
              and{' '}
              <a
                href="/privacy"
                className="underline underline-offset-4 hover:text-primary"
              >
                Privacy Policy
              </a>
              .
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
