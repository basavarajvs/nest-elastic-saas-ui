import { useEffect, useState } from 'react'
import { Link, useSearch } from '@tanstack/react-router'
import { CheckCircle2, XCircle, Loader2, Mail } from 'lucide-react'
import { toast } from 'sonner'
import { AXIOS_INSTANCE } from '@/lib/http/httpClient'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

type VerificationState = 'loading' | 'success' | 'error'

export function VerifyEmailPage() {
  const [state, setState] = useState<VerificationState>('loading')
  const search = useSearch({ from: '/verify-email' })
  const token = (search as { token?: string }).token

  useEffect(() => {
    if (!token) {
      setState('error')
      return
    }

    let cancelled = false

    async function verify() {
      try {
        await AXIOS_INSTANCE.post('/auth/verify-email', { token })
        if (!cancelled) setState('success')
      } catch {
        if (!cancelled) {
          setState('error')
          toast.error('Verification failed. The link may be expired or invalid.')
        }
      }
    }

    verify()
    return () => { cancelled = true }
  }, [token])

  return (
    <div className="container grid h-svh max-w-none items-center justify-center">
      <div className="mx-auto flex w-full flex-col justify-center space-y-2 py-8 sm:p-8">
        <Card className="max-w-sm gap-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg tracking-tight">
              <Mail className="h-5 w-5" />
              Email Verification
            </CardTitle>
            <CardDescription>
              {!token
                ? 'No verification token found.'
                : state === 'loading'
                  ? 'Verifying your email address...'
                  : state === 'success'
                    ? 'Your email has been verified.'
                    : 'Verification failed.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            {state === 'loading' && (
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
            )}
            {state === 'success' && (
              <>
                <CheckCircle2 className="h-12 w-12 text-green-500" />
                <p className="text-center text-sm text-muted-foreground">
                  Email verified! You can now log in.
                </p>
                <Button asChild className="w-full">
                  <Link to="/sign-in">Go to Sign In</Link>
                </Button>
              </>
            )}
            {state === 'error' && (
              <>
                <XCircle className="h-12 w-12 text-destructive" />
                <p className="text-center text-sm text-muted-foreground">
                  Verification failed. The link may be expired or invalid.
                </p>
                <Button asChild className="w-full">
                  <Link to="/sign-in">Go to Sign In</Link>
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
