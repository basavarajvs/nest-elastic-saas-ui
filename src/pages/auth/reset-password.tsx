import { useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import { Loader2, Lock } from 'lucide-react'
import { toast } from 'sonner'
import { AXIOS_INSTANCE } from '@/lib/http/httpClient'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { PasswordInput } from '@/components/password-input'

const resetPasswordSchema = z
  .object({
    newPassword: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

type ResetPasswordForm = z.infer<typeof resetPasswordSchema>

export function ResetPasswordPage() {
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()
  const search = useSearch({ from: '/reset-password' })
  const token = (search as { token?: string }).token

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordForm>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { newPassword: '', confirmPassword: '' },
  })

  async function onSubmit(data: ResetPasswordForm) {
    if (!token) return
    setIsLoading(true)
    try {
      await AXIOS_INSTANCE.post('/auth/reset-password', {
        newPassword: data.newPassword,
        token,
      })
      toast.success('Password reset successfully!')
      navigate({ to: '/sign-in', replace: true })
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Failed to reset password'
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }

  if (!token) {
    return (
      <div className="container grid h-svh max-w-none items-center justify-center">
        <div className="mx-auto flex w-full flex-col justify-center space-y-2 py-8 sm:p-8">
          <Card className="max-w-sm gap-4">
            <CardHeader>
              <CardTitle className="text-lg tracking-tight">Invalid Link</CardTitle>
              <CardDescription>
                This password reset link is invalid or has expired.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full">
                <Link to="/forgot-password">Request a new reset link</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="container grid h-svh max-w-none items-center justify-center">
      <div className="mx-auto flex w-full flex-col justify-center space-y-2 py-8 sm:p-8">
        <Card className="max-w-sm gap-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg tracking-tight">
              <Lock className="h-5 w-5" />
              Reset Password
            </CardTitle>
            <CardDescription>
              Enter your new password below.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="grid gap-3">
              <div className="grid gap-1">
                <Label htmlFor="newPassword">New Password</Label>
                <PasswordInput
                  id="newPassword"
                  placeholder="********"
                  autoComplete="new-password"
                  autoFocus
                  disabled={isLoading}
                  {...register('newPassword')}
                />
                {errors.newPassword && (
                  <p className="text-sm text-destructive">
                    {errors.newPassword.message}
                  </p>
                )}
              </div>
              <div className="grid gap-1">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <PasswordInput
                  id="confirmPassword"
                  placeholder="********"
                  autoComplete="new-password"
                  disabled={isLoading}
                  {...register('confirmPassword')}
                />
                {errors.confirmPassword && (
                  <p className="text-sm text-destructive">
                    {errors.confirmPassword.message}
                  </p>
                )}
              </div>
              <Button className="mt-2" disabled={isLoading} type="submit">
                {isLoading ? <Loader2 className="animate-spin" /> : null}
                Reset Password
              </Button>
            </form>
          </CardContent>
          <CardFooter>
            <p className="mx-auto px-8 text-center text-sm text-balance text-muted-foreground">
              Remember your password?{' '}
              <Link
                to="/sign-in"
                className="underline underline-offset-4 hover:text-primary"
              >
                Sign in
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
