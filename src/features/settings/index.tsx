import { Outlet, useLocation, useNavigate } from '@tanstack/react-router'
import { Monitor, Bell, Palette, Wrench, UserCog } from 'lucide-react'
import { Separator } from '@/components/ui/separator'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

export function Settings() {
  const { pathname } = useLocation()
  const navigate = useNavigate()

  // Normalize path to handle trailing slash on root Settings route
  const activeTab = pathname === '/settings/' ? '/settings' : pathname

  return (
    <>
      {/* ===== Top Heading ===== */}
      <Header>
        <Search className='me-auto' />
        <ThemeSwitch />
        <ConfigDrawer />
        <ProfileDropdown />
      </Header>

      <Main fixed>
        <div className='space-y-0.5'>
          <h1 className='text-2xl font-bold tracking-tight md:text-3xl'>
            Settings
          </h1>
          <p className='text-muted-foreground'>
            Manage your account settings and set e-mail preferences.
          </p>
        </div>
        <Separator className='my-4 lg:my-6' />
        <div className='flex flex-1 flex-col space-y-6 overflow-hidden'>
          <Tabs
            value={activeTab}
            onValueChange={(val) => navigate({ to: val })}
            className='w-full'
          >
            <TabsList className='flex w-full justify-start border-b border-muted bg-transparent p-0 rounded-none h-auto gap-6 overflow-x-auto scrollbar-none'>
              <TabsTrigger
                value='/settings'
                className='data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none rounded-none border-b-2 border-transparent px-1 pb-3 pt-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-all duration-200 cursor-pointer'
              >
                <div className='flex items-center gap-2'>
                  <UserCog size={16} />
                  <span>Profile</span>
                </div>
              </TabsTrigger>
              <TabsTrigger
                value='/settings/account'
                className='data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none rounded-none border-b-2 border-transparent px-1 pb-3 pt-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-all duration-200 cursor-pointer'
              >
                <div className='flex items-center gap-2'>
                  <Wrench size={16} />
                  <span>Account</span>
                </div>
              </TabsTrigger>
              <TabsTrigger
                value='/settings/appearance'
                className='data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none rounded-none border-b-2 border-transparent px-1 pb-3 pt-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-all duration-200 cursor-pointer'
              >
                <div className='flex items-center gap-2'>
                  <Palette size={16} />
                  <span>Appearance</span>
                </div>
              </TabsTrigger>
              <TabsTrigger
                value='/settings/notifications'
                className='data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none rounded-none border-b-2 border-transparent px-1 pb-3 pt-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-all duration-200 cursor-pointer'
              >
                <div className='flex items-center gap-2'>
                  <Bell size={16} />
                  <span>Notifications</span>
                </div>
              </TabsTrigger>
              <TabsTrigger
                value='/settings/display'
                className='data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none rounded-none border-b-2 border-transparent px-1 pb-3 pt-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-all duration-200 cursor-pointer'
              >
                <div className='flex items-center gap-2'>
                  <Monitor size={16} />
                  <span>Display</span>
                </div>
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <div className='flex w-full overflow-y-auto p-1'>
            <Outlet />
          </div>
        </div>
      </Main>
    </>
  )
}
