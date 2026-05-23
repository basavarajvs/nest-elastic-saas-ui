import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type BreadcrumbItem = {
  label: string
  href?: string
}

type PageHeaderProps = {
  title: string
  description?: string
  actions?: ReactNode
  breadcrumbs?: BreadcrumbItem[]
  className?: string
}

export function PageHeader({ title, description, actions, breadcrumbs, className }: PageHeaderProps) {
  return (
    <div className={cn('flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between', className)}>
      <div>
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav className='mb-1 text-sm text-muted-foreground'>
            {breadcrumbs.map((crumb, i) => (
              <span key={i}>
                {i > 0 && <span className='mx-1'>/</span>}
                {crumb.href ? (
                  <a href={crumb.href} className='hover:text-foreground transition-colors'>
                    {crumb.label}
                  </a>
                ) : (
                  <span className='text-foreground'>{crumb.label}</span>
                )}
              </span>
            ))}
          </nav>
        )}
        <h1 className='text-2xl font-bold tracking-tight'>{title}</h1>
        {description && (
          <p className='text-sm text-muted-foreground'>{description}</p>
        )}
      </div>
      {actions && <div className='flex items-center gap-2'>{actions}</div>}
    </div>
  )
}
