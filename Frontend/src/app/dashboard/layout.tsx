'use client'

import { useState } from 'react'
import Sidebar from '@/components/sidebar'
import Navbar from '@/components/navbar'
import { useAuth } from '@/components/AuthContext'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const { signOut } = useAuth()

  return (
    <div className="flex h-screen bg-muted/20">
      <Sidebar 
        isOpen={isSidebarOpen} 
        onLogout={signOut} 
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Navbar 
          onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)} 
          sidebarOpen={isSidebarOpen} 
        />
        {children}
      </div>
    </div>
  )
}
