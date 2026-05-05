'use client'

import { Bell } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import { useState } from 'react'

interface LowStockAlert {
  id: number
  titre: string
  message: string
  severite: 'warning' | 'critical'
}

export default function NotificationBell() {
  // IDs des alertes déjà vues — elles disparaissent jusqu'à ce qu'un nouveau stock passe sous seuil
  const [seenIds, setSeenIds] = useState<Set<number>>(new Set())

  const { data: recentData } = useQuery({
    queryKey: ['dashboard-recent'],
    queryFn: async () => (await api.get('/dashboard/recent_data/')).data,
    refetchInterval: 60000,
  })

  const allAlerts: LowStockAlert[] = recentData?.low_stock || []
  // Seules les alertes non encore vues sont affichées
  const visibleAlerts = allAlerts.filter(a => !seenIds.has(a.id))
  const unreadCount = visibleAlerts.length

  const handleOpenChange = (open: boolean) => {
    if (open && visibleAlerts.length > 0) {
      // Marquer toutes les alertes actuelles comme vues
      setSeenIds(prev => new Set([...prev, ...visibleAlerts.map(a => a.id)]))
    }
  }

  return (
    <DropdownMenu onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full animate-in fade-in zoom-in">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0 bg-card border-border">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h3 className="font-semibold text-foreground">Notifications Stock</h3>
          {unreadCount > 0 && (
            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
              {unreadCount} nouvelle{unreadCount > 1 ? 's' : ''}
            </span>
          )}
        </div>
        <div className="max-h-[400px] overflow-auto">
          {visibleAlerts.length > 0 ? (
            visibleAlerts.map((alert) => (
              <DropdownMenuItem
                key={alert.id}
                className="p-4 flex flex-col items-start gap-1 cursor-default focus:bg-muted/50"
              >
                <div className="flex items-center gap-2 w-full">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${
                    alert.severite === 'critical' ? 'bg-red-500' : 'bg-orange-500'
                  }`} />
                  <span className="font-medium text-sm text-foreground flex-1">{alert.titre}</span>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2 pl-4">{alert.message}</p>
              </DropdownMenuItem>
            ))
          ) : (
            <div className="p-8 text-center text-muted-foreground text-sm">
              Aucune alerte de stock active
            </div>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
