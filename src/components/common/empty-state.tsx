import { Inbox } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

type EmptyStateProps = {
  title?: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
  icon?: ReactNode
  className?: string
}

export function EmptyState({ title, description, action, icon, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 p-6 text-center', className)}>
      <div className='text-muted-foreground'>
        {icon ?? <Inbox className='h-10 w-10' />}
      </div>
      <div>
        <h3 className='text-sm font-semibold'>{title ?? 'No data'}</h3>
        {description && (
          <p className='mt-1 text-sm text-muted-foreground'>{description}</p>
        )}
      </div>
      {action && (
        <Button variant='outline' size='sm' onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  )
}
