import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type ErrorStateProps = {
  title?: string
  message?: string
  onRetry?: () => void
  className?: string
}

export function ErrorState({ title, message, onRetry, className }: ErrorStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 p-6 text-center', className)}>
      <AlertTriangle className='h-10 w-10 text-destructive' />
      <div>
        <h3 className='text-sm font-semibold'>{title ?? 'Error'}</h3>
        {message && (
          <p className='mt-1 text-sm text-muted-foreground'>{message}</p>
        )}
      </div>
      {onRetry && (
        <Button variant='outline' size='sm' onClick={onRetry}>
          <RefreshCw className='mr-1 h-4 w-4' />
          Try again
        </Button>
      )}
    </div>
  )
}
