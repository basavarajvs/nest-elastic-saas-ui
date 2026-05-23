import { useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { Loader2, Shield } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/auth-context'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const mfaSchema = z.object({
  code: z
    .string()
    .length(6, 'Code must be 6 digits')
    .regex(/^\d+$/, 'Code must contain only digits'),
})

type MfaForm = z.infer<typeof mfaSchema>

export function MfaPage() {
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()
  const search = useSearch({ from: '/mfa' })
  const { loginWithMfa } = useAuth()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<MfaForm>({
    resolver: zodResolver(mfaSchema),
    defaultValues: { code: '' },
  })

  async function onSubmit(data: MfaForm) {
    setIsLoading(true)
    try {
      await loginWithMfa({
        email: (search as { email?: string }).email || '',
        password: '',
        mfaCode: data.code,
      })
      navigate({ to: '/', replace: true })
    } catch {
      toast.error('Invalid verification code. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container grid h-svh max-w-none items-center justify-center">
      <div className="mx-auto flex w-full flex-col justify-center space-y-2 py-8 sm:p-8">
        <Card className="max-w-sm gap-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg tracking-tight">
              <Shield className="h-5 w-5" />
              Two-Factor Authentication
            </CardTitle>
            <CardDescription>
              Enter the 6-digit code from your authenticator app.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="grid gap-3">
              <div className="grid gap-1">
                <Label htmlFor="code">Verification Code</Label>
                <Input
                  id="code"
                  placeholder="000000"
                  maxLength={6}
                  autoComplete="one-time-code"
                  autoFocus
                  disabled={isLoading}
                  className="text-center text-lg tracking-widest"
                  {...register('code')}
                />
                {errors.code && (
                  <p className="text-sm text-destructive">{errors.code.message}</p>
                )}
              </div>
              <Button className="mt-2" disabled={isLoading} type="submit">
                {isLoading ? <Loader2 className="animate-spin" /> : null}
                Verify
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
