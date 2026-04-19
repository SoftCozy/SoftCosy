'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  TrendingUp,
  AlertTriangle,
  Package,
  BarChart3,
  Download,
  TrendingDown,
  History,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import { useAuth } from '@/components/AuthContext'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale/fr'

// ────────────────────────────────────────────────
// Types pour les données réelles
// ────────────────────────────────────────────────
interface DashboardSummary {
  total_products: number
  total_stock_value: number
  active_alerts: number
  total_sales_amount: number
}

interface ChartData {
  month: string
  ventes: number
  entrees: number
}

interface CategoryData {
  name: string
  value: number
  color: string
}

interface ProductPerf {
  high_rotation: Array<{ name: string; sales: number; rotation: number }>
  low_rotation: any[]
}

interface RecentData {
  low_stock: Array<{ id: number; titre: string; message: string; severite: string }>
  movements: Array<{ id: number; product_name: string; type: string; qty: number; date_val: string }>
  audit_logs: Array<{ id: number; action: string; enitity: string; perform_at: string; user_name: string }>
}

export default function DashboardV2() {
  const { user } = useAuth()
  const router = useRouter()
  const [auditPeriod, setAuditPeriod] = useState<'day' | 'week'>('day')

  // Récupération des données
  const { data: summary } = useQuery<DashboardSummary>({
    queryKey: ['dashboard-summary'],
    queryFn: async () => (await api.get('/dashboard/summary/')).data
  })

  const { data: charts = [] } = useQuery<ChartData[]>({
    queryKey: ['dashboard-charts'],
    queryFn: async () => (await api.get('/dashboard/charts/')).data
  })

  const { data: categories = [] } = useQuery<CategoryData[]>({
    queryKey: ['dashboard-categories'],
    queryFn: async () => (await api.get('/dashboard/categories/')).data
  })

  const { data: performance } = useQuery<ProductPerf>({
    queryKey: ['dashboard-performance'],
    queryFn: async () => (await api.get('/dashboard/product_performance/')).data
  })

  const { data: recentData, isLoading: recentLoading } = useQuery<RecentData>({
    queryKey: ['dashboard-recent'],
    queryFn: async () => (await api.get('/dashboard/recent_data/')).data
  })

  const stats = [
    { label: 'Produits Totaux', value: summary?.total_products || 0, icon: Package, color: 'text-blue-500' },
    { label: 'Valeur Stock', value: `${(summary?.total_stock_value || 0).toLocaleString()} FCFA`, icon: TrendingUp, color: 'text-green-500' },
    { label: 'Alertes Actives', value: summary?.active_alerts || 0, icon: AlertTriangle, color: 'text-orange-500' },
    { label: 'Ventes (Total)', value: `${(summary?.total_sales_amount || 0).toLocaleString()} FCFA`, icon: BarChart3, color: 'text-purple-500' },
  ]

  const handleExportAudit = () => {
    // Placeholder pour l'export, on peut lier à une action backend plus tard
    console.log('Exporting audit...')
  }

  // On ne bloque plus l'affichage

  return (
    <div className="flex flex-col h-full text-foreground">
      <main className="flex-1 overflow-auto p-4 md:p-8 space-y-6">
          <div className="flex flex-col gap-2">
            <h2 className="text-3xl font-bold text-foreground">Tableau de Bord</h2>
            <p className="text-muted-foreground">
              Bienvenue, <span className="text-foreground font-medium">{user?.full_name || user?.email}</span>
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {(recentLoading || !summary) ? (
              Array.from({ length: 4 }).map((_, i) => (
                <Card key={i} className="p-6 border border-border bg-card animate-pulse h-24 shadow-sm" />
              ))
            ) : (
              stats.map((stat, idx) => {
                const Icon = stat.icon
                return (
                  <Card key={idx} className="p-6 border border-border bg-card hover:border-primary/50 transition-colors shadow-sm">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">{stat.label}</p>
                        <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                      </div>
                      <div className={`p-2 rounded-lg bg-muted ${stat.color}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                    </div>
                  </Card>
                )
              })
            )}
          </div>

          {/* Performance Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="col-span-1 lg:col-span-2 p-6 border border-border bg-card shadow-sm">
              <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary" />
                Mouvements de Stock (6 mois)
              </h3>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={charts}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" vertical={false} />
                    <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                      itemStyle={{ fontSize: '12px' }}
                    />
                    <Line type="monotone" dataKey="ventes" stroke="hsl(var(--primary))" strokeWidth={3} dot={false} name="Ventes" />
                    <Line type="monotone" dataKey="entrees" stroke="#06b6d4" strokeWidth={3} dot={false} name="Entrées" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card className="p-6 border border-border bg-card shadow-sm">
              <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                <PieChart className="w-5 h-5 text-primary" />
                Par Catégorie
              </h3>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categories}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {categories.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          {/* Details Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-6 border border-border bg-card shadow-sm">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-500" />
                Forte Rotation
              </h3>
              <div className="space-y-4">
                {performance?.high_rotation.map((p, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border">
                    <div>
                      <p className="font-medium text-sm">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{p.sales} unités vendues</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-500">{p.rotation}x</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Rotation</p>
                    </div>
                  </div>
                ))}
                {!performance?.high_rotation.length && <p className="text-center text-muted-foreground py-4 text-sm">Données insuffisantes</p>}
              </div>
            </Card>

            <Card className="p-6 border border-border bg-card shadow-sm">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-foreground">
                <History className="w-5 h-5 text-primary" />
                Activités Récentes
              </h3>
              <div className="space-y-4">
                {recentLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="h-12 w-full bg-muted/50 rounded-lg animate-pulse" />
                  ))
                ) : (
                  <>
                    {recentData?.movements.map((m) => (
                      <div key={m.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border">
                        <div>
                          <p className="font-medium text-sm">{m.product_name}</p>
                          <p className="text-xs text-muted-foreground">{m.type} • {m.date_val}</p>
                        </div>
                        <p className={`font-bold ${m.type === 'SORTIE' ? 'text-red-500' : 'text-green-500'}`}>
                          {m.type === 'SORTIE' ? '-' : '+'}{m.qty}
                        </p>
                      </div>
                    ))}
                    {!recentData?.movements.length && <p className="text-center text-muted-foreground py-4 text-sm">Aucun mouvement</p>}
                  </>
                )}
              </div>
            </Card>
          </div>

          {/* Audit Logs Table */}
          <Card className="p-6 border border-border bg-card shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <History className="w-5 h-5 text-primary" />
                Journal d'Audit Réel
              </h3>
              <div className="flex items-center gap-2">
                <select 
                  value={auditPeriod}
                  onChange={(e) => setAuditPeriod(e.target.value as any)}
                  className="bg-muted text-xs border-border rounded px-2 py-1 outline-none"
                >
                  <option value="day">Aujourd'hui</option>
                  <option value="week">Cette semaine</option>
                </select>
                <Button size="sm" variant="outline" className="text-xs" onClick={handleExportAudit}>
                  <Download className="w-3 h-3 mr-1" /> PDF
                </Button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-muted-foreground border-b border-border">
                  <tr>
                    <th className="pb-3 pr-4 font-medium uppercase text-[10px]">Date</th>
                    <th className="pb-3 pr-4 font-medium uppercase text-[10px]">Utilisateur</th>
                    <th className="pb-3 pr-4 font-medium uppercase text-[10px]">Action</th>
                    <th className="pb-3 pr-4 font-medium uppercase text-[10px]">Module</th>
                    <th className="pb-3 font-medium uppercase text-[10px] text-right">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {recentData?.audit_logs.map((log) => (
                    <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3 text-xs pr-4">{format(new Date(log.perform_at), 'dd/MM HH:mm', { locale: fr })}</td>
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px]">
                            {log.user_name ? log.user_name[0].toUpperCase() : 'S'}
                          </div>
                          {log.user_name || 'Système'}
                        </div>
                      </td>
                      <td className="py-3 pr-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-medium border ${
                          log.action === 'create' ? 'bg-green-500/10 text-green-500 border-green-500/20' : 
                          log.action === 'update' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' : 
                          'bg-red-500/10 text-red-500 border-red-500/20'
                        }`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground">{log.enitity}</td>
                      <td className="py-3 text-right">
                        <span className="text-green-500 text-[10px] font-bold">● Succès</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!recentData?.audit_logs.length && <p className="text-center text-muted-foreground py-10 text-sm">Aucun log d'audit</p>}
            </div>
          </Card>
      </main>
    </div>
  )
}