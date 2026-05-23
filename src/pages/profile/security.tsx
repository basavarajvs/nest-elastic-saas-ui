import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { ArrowLeft, CheckCircle2, Eye, EyeOff, Loader2, Shield, ShieldOff } from 'lucide-react'
import { toast } from 'sonner'
import { UserController_getMe } from '@/lib/api/wms-saas-core-api/users/users'
import { UserController_setupMyPin } from '@/lib/api/wms-saas-core-api/users/users'
import { UserController_changeMyPin } from '@/lib/api/wms-saas-core-api/users/users'
import { AuthController_changePassword } from '@/lib/api/wms-saas-core-api/auth/auth'
import { AuthController_enableMfa } from '@/lib/api/wms-saas-core-api/auth/auth'
import { AuthController_verifyMfa } from '@/lib/api/wms-saas-core-api/auth/auth'
import { AuthController_disableMfa } from '@/lib/api/wms-saas-core-api/auth/auth'
import type { ChangePasswordDto } from '@/lib/types/wms-saas-core-api'
import type { SetupPinDto, ChangePinDto, VerifyMfaDto } from '@/lib/types/wms-saas-core-api'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

type PasswordForm = z.input<typeof passwordSchema>

const pinSetupSchema = z.object({
  password: z.string().min(1, 'Current password is required'),
  pin: z.string().min(4, 'PIN must be at least 4 characters').max(10),
})

type PinSetupForm = z.input<typeof pinSetupSchema>

const pinChangeSchema = z.object({
  currentPin: z.string().min(1, 'Current PIN is required'),
  newPin: z.string().min(4, 'PIN must be at least 4 characters').max(10),
})

type PinChangeForm = z.input<typeof pinChangeSchema>

const mfaVerifySchema = z.object({
  code: z.string().min(6, 'Code must be 6 characters').max(6),
})

type MfaVerifyForm = z.input<typeof mfaVerifySchema>

export function SecuritySettingsPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [showPassword, setShowPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [mfaStep, setMfaStep] = useState<'idle' | 'enabling' | 'verify' | 'enabled'>('idle')
  const [mfaSecret, setMfaSecret] = useState('')
  const [disableMfaTarget, setDisableMfaTarget] = useState(false)

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile', 'me'],
    queryFn: async () => {
      const res = await UserController_getMe()
      return (res as unknown as { data: { mfaEnabled?: boolean } }).data ?? {}
    },
    staleTime: 60_000,
  })

  const mfaEnabled = profile?.mfaEnabled ?? false

  const passwordForm = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  })

  const pinSetupForm = useForm<PinSetupForm>({
    resolver: zodResolver(pinSetupSchema),
    defaultValues: { password: '', pin: '' },
  })

  const pinChangeForm = useForm<PinChangeForm>({
    resolver: zodResolver(pinChangeSchema),
    defaultValues: { currentPin: '', newPin: '' },
  })

  const mfaForm = useForm<MfaVerifyForm>({
    resolver: zodResolver(mfaVerifySchema),
    defaultValues: { code: '' },
  })

  // Password Change
  const changePasswordMutation = useMutation({
    mutationFn: async (values: PasswordForm) => {
      const dto: ChangePasswordDto = { currentPassword: values.currentPassword, newPassword: values.newPassword }
      await AuthController_changePassword(dto)
    },
    onSuccess: () => {
      toast.success('Password changed successfully')
      passwordForm.reset()
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? (err as Error).message ?? 'Failed to change password'
      toast.error(msg)
    },
  })

  // PIN Setup
  const setupPinMutation = useMutation({
    mutationFn: async (values: PinSetupForm) => {
      const dto: SetupPinDto = { password: values.password, pin: values.pin }
      await UserController_setupMyPin(dto)
    },
    onSuccess: () => {
      toast.success('PIN set up successfully')
      pinSetupForm.reset()
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? (err as Error).message ?? 'Failed to set up PIN'
      toast.error(msg)
    },
  })

  // PIN Change
  const changePinMutation = useMutation({
    mutationFn: async (values: PinChangeForm) => {
      const dto: ChangePinDto = { currentPin: values.currentPin, newPin: values.newPin }
      await UserController_changeMyPin(dto)
    },
    onSuccess: () => {
      toast.success('PIN changed successfully')
      pinChangeForm.reset()
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? (err as Error).message ?? 'Failed to change PIN'
      toast.error(msg)
    },
  })

  // MFA Enable
  const enableMfaMutation = useMutation({
    mutationFn: async () => {
      const res = await AuthController_enableMfa()
      const result = (res as unknown as { secret?: string }).secret ?? ''
      if (!result) throw new Error('No secret returned')
      return result
    },
    onSuccess: (secret) => {
      setMfaSecret(secret)
      setMfaStep('verify')
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? (err as Error).message ?? 'Failed to enable MFA'
      toast.error(msg)
    },
  })

  // MFA Verify
  const verifyMfaMutation = useMutation({
    mutationFn: async (values: MfaVerifyForm) => {
      const dto: VerifyMfaDto = { code: values.code }
      await AuthController_verifyMfa(dto)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', 'me'] })
      toast.success('MFA enabled successfully')
      setMfaStep('enabled')
      mfaForm.reset()
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? (err as Error).message ?? 'Failed to verify MFA'
      toast.error(msg)
    },
  })

  // MFA Disable
  const disableMfaMutation = useMutation({
    mutationFn: async () => {
      await AuthController_disableMfa()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', 'me'] })
      toast.success('MFA disabled')
      setDisableMfaTarget(false)
      setMfaStep('idle')
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? (err as Error).message ?? 'Failed to disable MFA'
      toast.error(msg)
    },
  })

  if (isLoading) {
    return (
      <div className='space-y-6 max-w-2xl'>
        <Skeleton className='h-8 w-48' />
        <Skeleton className='h-48 w-full' />
        <Skeleton className='h-48 w-full' />
      </div>
    )
  }

  return (
    <div className='space-y-6 max-w-2xl'>
      <div className='flex items-center gap-3'>
        <Button variant='ghost' size='icon' onClick={() => navigate({ to: '/profile' })}>
          <ArrowLeft className='h-4 w-4' />
        </Button>
        <div>
          <h1 className='text-2xl font-bold tracking-tight'>Security Settings</h1>
          <p className='text-sm text-muted-foreground'>Manage your password, MFA, and PIN</p>
        </div>
      </div>

      {/* Change Password */}
      <Card>
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
          <CardDescription>Update your account password</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...passwordForm}>
            <form onSubmit={passwordForm.handleSubmit((values) => changePasswordMutation.mutate(values))} className='space-y-4'>
              <FormField
                control={passwordForm.control}
                name='currentPassword'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current Password</FormLabel>
                    <FormControl>
                      <div className='relative'>
                        <Input type={showPassword ? 'text' : 'password'} {...field} />
                        <Button type='button' variant='ghost' size='icon' className='absolute right-0 top-0 h-full px-3' onClick={() => setShowPassword(!showPassword)}>
                          {showPassword ? <EyeOff className='h-4 w-4' /> : <Eye className='h-4 w-4' />}
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={passwordForm.control}
                name='newPassword'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Password</FormLabel>
                    <FormControl>
                      <div className='relative'>
                        <Input type={showNewPassword ? 'text' : 'password'} {...field} />
                        <Button type='button' variant='ghost' size='icon' className='absolute right-0 top-0 h-full px-3' onClick={() => setShowNewPassword(!showNewPassword)}>
                          {showNewPassword ? <EyeOff className='h-4 w-4' /> : <Eye className='h-4 w-4' />}
                        </Button>
                      </div>
                    </FormControl>
                    <FormDescription>Minimum 8 characters</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={passwordForm.control}
                name='confirmPassword'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm New Password</FormLabel>
                    <FormControl>
                      <Input type='password' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type='submit' disabled={changePasswordMutation.isPending}>
                {changePasswordMutation.isPending && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
                Change Password
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Separator />

      {/* Multi-Factor Authentication */}
      <Card>
        <CardHeader>
          <div className='flex items-center justify-between'>
            <div>
              <CardTitle>Multi-Factor Authentication</CardTitle>
              <CardDescription>Add an extra layer of security to your account</CardDescription>
            </div>
            <Badge variant={mfaEnabled ? 'default' : 'secondary'}>
              {mfaEnabled ? 'Enabled' : 'Disabled'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className='space-y-4'>
          {!mfaEnabled && mfaStep === 'idle' && (
            <Button onClick={() => { setMfaStep('enabling'); enableMfaMutation.mutate() }}>
              <Shield className='mr-2 h-4 w-4' />
              Enable MFA
            </Button>
          )}

          {mfaStep === 'enabling' && enableMfaMutation.isPending && (
            <div className='flex items-center gap-2 text-sm text-muted-foreground'>
              <Loader2 className='h-4 w-4 animate-spin' />
              Generating MFA secret...
            </div>
          )}

          {mfaStep === 'verify' && mfaSecret && (
            <div className='space-y-4'>
              <div className='rounded-lg bg-muted p-4'>
                <p className='text-sm font-medium mb-2'>Scan this secret with your authenticator app:</p>
                <code className='block text-xs break-all bg-background rounded p-2'>{mfaSecret}</code>
              </div>
              <Form {...mfaForm}>
                <form onSubmit={mfaForm.handleSubmit((values) => verifyMfaMutation.mutate(values))} className='space-y-4'>
                  <FormField
                    control={mfaForm.control}
                    name='code'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Verification Code</FormLabel>
                        <FormControl>
                          <Input placeholder='Enter 6-digit code' maxLength={6} {...field} />
                        </FormControl>
                        <FormDescription>Enter the code from your authenticator app</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className='flex gap-2'>
                    <Button type='button' variant='outline' onClick={() => { setMfaStep('idle'); setMfaSecret('') }}>
                      Cancel
                    </Button>
                    <Button type='submit' disabled={verifyMfaMutation.isPending}>
                      {verifyMfaMutation.isPending && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
                      Verify & Enable
                    </Button>
                  </div>
                </form>
              </Form>
            </div>
          )}

          {mfaStep === 'enabled' && (
            <div className='flex items-center gap-2 text-sm text-green-600'>
              <CheckCircle2 className='h-4 w-4' />
              MFA is now enabled
            </div>
          )}

          {mfaEnabled && (
            <Button variant='outline' className='text-red-600' onClick={() => setDisableMfaTarget(true)}>
              <ShieldOff className='mr-2 h-4 w-4' />
              Disable MFA
            </Button>
          )}
        </CardContent>
      </Card>

      <Separator />

      {/* PIN Management */}
      <Card>
        <CardHeader>
          <CardTitle>PIN Management</CardTitle>
          <CardDescription>Set up or change your quick-access PIN</CardDescription>
        </CardHeader>
        <CardContent className='space-y-6'>
          <div>
            <h3 className='text-sm font-medium mb-3'>Set Up PIN</h3>
            <Form {...pinSetupForm}>
              <form onSubmit={pinSetupForm.handleSubmit((values) => setupPinMutation.mutate(values))} className='space-y-4'>
                <FormField
                  control={pinSetupForm.control}
                  name='password'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Current Password</FormLabel>
                      <FormControl><Input type='password' {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={pinSetupForm.control}
                  name='pin'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New PIN</FormLabel>
                      <FormControl><Input type='password' maxLength={10} {...field} /></FormControl>
                      <FormDescription>4-10 characters</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type='submit' disabled={setupPinMutation.isPending} size='sm'>
                  {setupPinMutation.isPending && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
                  Set Up PIN
                </Button>
              </form>
            </Form>
          </div>

          <Separator />

          <div>
            <h3 className='text-sm font-medium mb-3'>Change PIN</h3>
            <Form {...pinChangeForm}>
              <form onSubmit={pinChangeForm.handleSubmit((values) => changePinMutation.mutate(values))} className='space-y-4'>
                <FormField
                  control={pinChangeForm.control}
                  name='currentPin'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Current PIN</FormLabel>
                      <FormControl><Input type='password' maxLength={10} {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={pinChangeForm.control}
                  name='newPin'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New PIN</FormLabel>
                      <FormControl><Input type='password' maxLength={10} {...field} /></FormControl>
                      <FormDescription>4-10 characters</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type='submit' disabled={changePinMutation.isPending} size='sm'>
                  {changePinMutation.isPending && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
                  Change PIN
                </Button>
              </form>
            </Form>
          </div>
        </CardContent>
      </Card>

      {/* Disable MFA Confirmation */}
      <AlertDialog open={disableMfaTarget} onOpenChange={setDisableMfaTarget}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disable MFA</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to disable multi-factor authentication? Your account will be less secure.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
              onClick={() => disableMfaMutation.mutate()}
            >
              Disable
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
