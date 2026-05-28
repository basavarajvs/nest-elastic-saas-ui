import { useState, useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search } from 'lucide-react'
import { SystemAdminController_listTenants } from '@/lib/api/wms-saas-core-api/system-admin/system-admin'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'

export interface TenantOption {
  id: string
  tenantName: string
  tenantCode: string
}

type TenantSelectDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (tenant: TenantOption) => void
  title?: string
  description?: string
}

export function TenantSelectDialog({
  open,
  onOpenChange,
  onSelect,
  title = 'Select Tenant',
  description = 'Choose a tenant from the list below.',
}: TenantSelectDialogProps) {
  const [search, setSearch] = useState('')

  const { data: tenants, isLoading } = useQuery({
    queryKey: ['tenants', 'select-all'],
    queryFn: async () => {
      const res = await SystemAdminController_listTenants({ limit: 1000 })
      const body = res as unknown as {
        data: Array<{ tenantId: string; tenantName: string; tenantCode: string }>
      }
      return (body.data ?? []).map((t) => ({
        id: t.tenantId,
        tenantName: t.tenantName,
        tenantCode: t.tenantCode,
      })) as TenantOption[]
    },
    enabled: open,
    staleTime: 60_000,
  })

  useEffect(() => {
    if (!open) setSearch('')
  }, [open])

  const filtered = useMemo(() => {
    if (!tenants) return []
    if (!search) return tenants
    const q = search.toLowerCase()
    return tenants.filter(
      (t) =>
        t.tenantName.toLowerCase().includes(q) ||
        t.tenantCode.toLowerCase().includes(q),
    )
  }, [tenants, search])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className='relative'>
          <Search className='absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground' />
          <Input
            placeholder='Search by name or code...'
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className='pl-8'
            autoFocus
          />
        </div>
        <ScrollArea className='h-72'>
          {isLoading ? (
            <div className='flex items-center justify-center py-8 text-sm text-muted-foreground'>
              Loading tenants...
            </div>
          ) : filtered.length === 0 ? (
            <div className='flex items-center justify-center py-8 text-sm text-muted-foreground'>
              {search ? 'No tenants match your search' : 'No tenants found'}
            </div>
          ) : (
            <div className='space-y-1'>
              {filtered.map((tenant) => (
                <button
                  key={tenant.id}
                  type='button'
                  onClick={() => {
                    onSelect(tenant)
                    onOpenChange(false)
                  }}
                  className={cn(
                    'w-full rounded-md px-3 py-2 text-left text-sm transition-colors',
                    'hover:bg-accent hover:text-accent-foreground',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  )}
                >
                  <div className='font-medium'>{tenant.tenantName}</div>
                  <div className='text-xs text-muted-foreground'>
                    {tenant.tenantCode}
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
