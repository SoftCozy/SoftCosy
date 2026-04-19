'use client'

import { Bell } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale/fr'
import Link from 'next/link'

interface Alert {
  id: number
  titre: string
  message: string
  severite: 'info' | 'warning' | 'critical'
  dateAlerte: string
  estLue: boolean
  estResolue: boolean
}

export default function NotificationBell() {
  const queryClient = useQueryClient()

  const { data: alerts = [] } = useQuery<Alert[]>({
    queryKey: ['alerts'],
    queryFn: async () => {
      const res = await api.get('/alerts/')
      return res.data.results || res.data // Gérer pagination DRF
    },
    refetchInterval: 30000, // Rafraîchir toutes les 30s
  })

  // Afficher uniquement les alertes non lues OU non résolues
  const activeAlerts = alerts.filter(a => !a.estLue || !a.estResolue)
  const unreadCount = activeAlerts.filter(a => !a.estLue).length

  const markAsReadMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.patch(`/alerts/${id}/`, { estLue: true })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] })
    },
  })

  return (
    <DropdownMenu>
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
          <h3 className="font-semibold text-foreground">Notifications</h3>
          {unreadCount > 0 && (
            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
              {unreadCount} nouvelles
            </span>
          )}
        </div>
        <div className="max-h-[400px] overflow-auto">
          {activeAlerts.length > 0 ? (
            activeAlerts.map((alert) => (
              <DropdownMenuItem
                key={alert.id}
                className={`p-4 flex flex-col items-start gap-1 cursor-pointer focus:bg-muted/50 ${
                  !alert.estLue ? 'bg-primary/5' : ''
                }`}
                onClick={() => !alert.estLue && markAsReadMutation.mutate(alert.id)}
              >
                <div className="flex items-center gap-2 w-full">
                  <span className={`w-2 h-2 rounded-full ${
                    alert.severite === 'critical' ? 'bg-red-500' : 
                    alert.severite === 'warning' ? 'bg-orange-500' : 'bg-blue-500'
                  }`} />
                  <span className="font-medium text-sm text-foreground flex-1">{alert.titre}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {formatDistanceToNow(new Date(alert.dateAlerte), { addSuffix: true, locale: fr })}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">{alert.message}</p>
              </DropdownMenuItem>
            ))
          ) : (
            <div className="p-8 text-center text-muted-foreground text-sm">
              Aucune notification active
            </div>
          )}
        </div>
        <DropdownMenuSeparator />
        <Button asChild variant="ghost" className="w-full text-xs text-primary hover:bg-primary/5 h-10 rounded-none">
          <Link href="/dashboard/settings">
            Voir toutes les alertes
          </Link>
        </Button>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
