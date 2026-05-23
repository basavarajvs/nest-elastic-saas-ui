import { useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link } from '@tanstack/react-router'
import { ArrowRight, Loader2 } from 'lucide-react'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email'),
})

type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>

export function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ForgotPasswordForm>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  })

  async function onSubmit(data: ForgotPasswordForm) {
    setIsLoading(true)
    try {
      await AXIOS_INSTANCE.post('/auth/forgot-password', { email: data.email })
      toast.success('Check your email for the reset link.')
      reset()
    } catch {
      toast.error('Check your email for the reset link.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container grid h-svh max-w-none items-center justify-center">
      <div className="mx-auto flex w-full flex-col justify-center space-y-2 py-8 sm:p-8">
        <Card className="max-w-sm gap-4 sm:min-w-sm">
          <CardHeader>
            <CardTitle className="text-lg tracking-tight">
              Forgot Password
            </CardTitle>
            <CardDescription>
              Enter your registered email and we will send you a link to reset
              your password.
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
              <Button className="mt-2" disabled={isLoading} type="submit">
                Continue
                {isLoading ? <Loader2 className="animate-spin" /> : <ArrowRight />}
              </Button>
            </form>
          </CardContent>
          <CardFooter>
            <p className="mx-auto px-8 text-center text-sm text-balance text-muted-foreground">
              Don't have an account?{' '}
              <Link
                to="/sign-up"
                className="underline underline-offset-4 hover:text-primary"
              >
                Sign up
              </Link>
              .
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
