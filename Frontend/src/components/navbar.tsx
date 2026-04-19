'use client'

import { useTheme } from 'next-themes'
import { Menu, Sun, Moon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import NotificationBell from './notification-bell'

interface NavbarProps {
  onMenuClick: () => void
  sidebarOpen: boolean
}

export default function Navbar({ onMenuClick, sidebarOpen }: NavbarProps) {
  const { theme, setTheme } = useTheme()

  return (
    <nav className="border-b border-border bg-card backdrop-blur-sm sticky top-0 z-40">
      <div className="flex items-center justify-between h-16 px-4 md:px-8">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={onMenuClick}
            className="md:hidden"
          >
            <Menu className="w-5 h-5" />
          </Button>
          <div className="hidden md:flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">S&C</span>
            </div>
            <h1 className="text-xl font-bold text-foreground">SoftCosy</h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <NotificationBell />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            className="text-muted-foreground hover:text-foreground"
          >
            {theme === 'light' ? (
              <Moon className="w-5 h-5" />
            ) : (
              <Sun className="w-5 h-5" />
            )}
          </Button>
        </div>
      </div>
    </nav>
  )
}
