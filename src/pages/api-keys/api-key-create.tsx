import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { ArrowLeft, Check, Copy, Eye, EyeOff, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { ApiKeyController_create } from '@/lib/api/wms-saas-core-api/api-keys/api-keys'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
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

const createKeySchema = z.object({
  keyName: z.string().min(1, 'Key name is required').max(100),
  description: z.string().max(500).optional(),
  expiresAt: z.string().optional(),
  scopes: z.string().optional(),
})

type CreateKeyForm = z.input<typeof createKeySchema>

export function CreateApiKeyPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [createdSecret, setCreatedSecret] = useState<string | null>(null)
  const [secretRevealed, setSecretRevealed] = useState(false)
  const [copied, setCopied] = useState(false)

  const form = useForm<CreateKeyForm>({
    resolver: zodResolver(createKeySchema),
    defaultValues: {
      keyName: '',
      description: '',
      expiresAt: '',
      scopes: '',
    },
  })

  const createMutation = useMutation({
    mutationFn: async (values: CreateKeyForm) => {
      const payload: Parameters<typeof ApiKeyController_create>[0] = {
        keyName: values.keyName,
      }
      if (values.description) payload.description = values.description
      if (values.expiresAt) payload.expiresAt = new Date(values.expiresAt).toISOString()
      if (values.scopes?.trim()) payload.scopes = values.scopes.split(',').map((s) => s.trim()).filter(Boolean)
      const res = await ApiKeyController_create(payload)
      return (res as unknown as { data: { apiKey: string; id: string } }).data
    },
    onSuccess: (result) => {
      if (result?.apiKey) {
        setCreatedSecret(result.apiKey)
        queryClient.invalidateQueries({ queryKey: ['api-keys'] })
        toast.success('API key created! Save the secret now — it will not be shown again.')
      } else {
        toast.success('API key created')
        navigate({ to: '/api-keys' })
      }
    },
    onError: (err: Error) => {
      const msg =
        (err as unknown as { response?: { data?: { error?: { message?: string } } } })
          ?.response?.data?.error?.message ?? err.message
      toast.error(msg)
    },
  })

  function onSubmit(values: CreateKeyForm) {
    createMutation.mutate(values)
  }

  function handleCopy() {
    if (!createdSecret) return
    navigator.clipboard.writeText(createdSecret)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleDone() {
    navigate({ to: '/api-keys' })
  }

  if (createdSecret) {
    return (
      <div className='space-y-6'>
        <div className='flex items-center gap-4'>
          <Button variant='ghost' size='icon' onClick={handleDone}>
            <ArrowLeft className='h-4 w-4' />
          </Button>
          <div>
            <h1 className='text-2xl font-bold tracking-tight'>API Key Created</h1>
            <p className='text-sm text-muted-foreground'>
              Your new API key has been generated
            </p>
          </div>
        </div>
        <Separator />
        <Card className='max-w-xl mx-auto border-amber-200 dark:border-amber-800'>
          <CardHeader className='bg-amber-50 dark:bg-amber-950/30'>
            <CardTitle className='flex items-center gap-2 text-base text-amber-800 dark:text-amber-300'>
              <EyeOff className='h-4 w-4' />
              Save This Secret Key
            </CardTitle>
            <CardDescription className='text-amber-700 dark:text-amber-400'>
              This is the only time the full API key secret will be shown. You must save it securely now.
            </CardDescription>
          </CardHeader>
          <CardContent className='pt-6 space-y-4'>
            <div className='rounded-md border bg-card p-4'>
              <div className='flex items-center justify-between gap-2'>
                <code className='flex-1 break-all font-mono text-sm'>
                  {secretRevealed ? createdSecret : createdSecret.slice(0, 8) + '••••••••••••••••'}
                </code>
                <div className='flex shrink-0 gap-1'>
                  <Button
                    variant='ghost'
                    size='icon'
                    className='h-8 w-8'
                    onClick={() => setSecretRevealed((v) => !v)}
                    title={secretRevealed ? 'Hide' : 'Reveal'}
                  >
                    {secretRevealed ? <EyeOff className='h-4 w-4' /> : <Eye className='h-4 w-4' />}
                  </Button>
                  <Button
                    variant='ghost'
                    size='icon'
                    className='h-8 w-8'
                    onClick={handleCopy}
                    title='Copy to clipboard'
                  >
                    {copied ? <Check className='h-4 w-4 text-green-600' /> : <Copy className='h-4 w-4' />}
                  </Button>
                </div>
              </div>
            </div>
            <p className='text-xs text-muted-foreground'>
              Make sure to copy this key now. For security reasons, it will not be shown again.
            </p>
            <Button className='w-full' onClick={handleDone}>
              I&apos;ve Saved the Key — Done
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className='space-y-6'>
      <div className='flex items-center gap-4'>
        <Button variant='ghost' size='icon' onClick={() => navigate({ to: '/api-keys' })}>
          <ArrowLeft className='h-4 w-4' />
        </Button>
        <div>
          <h1 className='text-2xl font-bold tracking-tight'>Create API Key</h1>
          <p className='text-sm text-muted-foreground'>
            Generate a new API key for programmatic access
          </p>
        </div>
      </div>

      <Separator />

      <Card className='max-w-2xl'>
        <CardHeader>
          <CardTitle>Key Details</CardTitle>
          <CardDescription>
            Configure your new API key
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-6'>
              <FormField
                control={form.control}
                name='keyName'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Key Name <span className='text-destructive'>*</span>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder='e.g. Production Integration' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='description'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder='What is this key used for?'
                        className='resize-none'
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='expiresAt'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expiry Date</FormLabel>
                    <FormControl>
                      <Input type='datetime-local' {...field} />
                    </FormControl>
                    <FormDescription>
                      Leave empty for no expiry
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='scopes'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Scopes</FormLabel>
                    <FormControl>
                      <Input placeholder='e.g. read:users, write:tenants' {...field} />
                    </FormControl>
                    <FormDescription>
                      Comma-separated permission scopes
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className='flex justify-end gap-3'>
                <Button type='button' variant='outline' onClick={() => navigate({ to: '/api-keys' })}>
                  Cancel
                </Button>
                <Button type='submit' disabled={createMutation.isPending}>
                  {createMutation.isPending && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
                  Generate API Key
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}
