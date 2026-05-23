import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

type LoadingStateProps = {
  rows?: number
  className?: string
  variant?: 'table' | 'card' | 'detail'
}

function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className='space-y-3 p-6'>
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className='h-12 w-full' />
      ))}
    </div>
  )
}

function CardSkeleton() {
  return (
    <div className='space-y-4 p-6'>
      <Skeleton className='h-6 w-2/3' />
      <Skeleton className='h-4 w-full' />
      <Skeleton className='h-4 w-3/4' />
      <Skeleton className='h-4 w-1/2' />
      <Skeleton className='h-10 w-full' />
    </div>
  )
}

function DetailSkeleton() {
  return (
    <div className='space-y-6 p-6'>
      <div className='flex items-center gap-4'>
        <Skeleton className='h-12 w-12 rounded-full' />
        <div className='space-y-2'>
          <Skeleton className='h-5 w-48' />
          <Skeleton className='h-4 w-32' />
        </div>
      </div>
      <div className='space-y-3'>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className='flex gap-4'>
            <Skeleton className='h-4 w-24' />
            <Skeleton className='h-4 w-48' />
          </div>
        ))}
      </div>
    </div>
  )
}

export function LoadingState({ rows = 5, className, variant = 'table' }: LoadingStateProps) {
  return (
    <div className={cn(className)}>
      {variant === 'table' && <TableSkeleton rows={rows} />}
      {variant === 'card' && <CardSkeleton />}
      {variant === 'detail' && <DetailSkeleton />}
    </div>
  )
}
