'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { X, Plus, Trash2, Edit2, Layers, Check, AlertCircle } from 'lucide-react'
import api from '@/lib/api'
import { Card } from '@/components/ui/card'
import React from 'react'

interface Category {
  id: number
  name: string
  description?: string
  image_url?: string
}

interface CategoryManagementModalProps {
  isOpen: boolean
  onClose: () => void
}

const fetchCategories = async (): Promise<Category[]> => {
  const res = await api.get('/categories/')
  return res.data.results || res.data
}

export default function CategoryManagementModal({ isOpen, onClose }: CategoryManagementModalProps) {
  const queryClient = useQueryClient()
  
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editForm, setEditForm] = useState<{ name: string; description: string }>({ name: '', description: '' })
  const [isAdding, setIsAdding] = useState(false)

  // ────────────────────────────────────────────────
  // Queries
  // ────────────────────────────────────────────────
  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
    enabled: isOpen,
  })

  // ────────────────────────────────────────────────
  // Mutations
  // ────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: (data: { name: string; description: string }) => api.post('/categories/', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      setIsAdding(false)
      setEditForm({ name: '', description: '' })
    }
  })

  const updateMutation = useMutation({
    mutationFn: (data: { id: number; name: string; description: string }) => 
      api.patch(`/categories/${data.id}/`, { name: data.name, description: data.description }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      setEditingId(null)
    }
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/categories/${id}/`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['categories'] }),
    onError: () => alert("Impossible de supprimer cette catégorie (elle est probablement utilisée par des produits).")
  })

  // ────────────────────────────────────────────────
  // Handlers
  // ────────────────────────────────────────────────
  const startEditing = (cat: Category) => {
    setEditingId(cat.id)
    setEditForm({ name: cat.name, description: cat.description || '' })
  }

  const handleSave = () => {
    if (!editForm.name.trim()) return
    if (editingId) {
      updateMutation.mutate({ id: editingId, ...editForm })
    } else {
      createMutation.mutate(editForm)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl bg-card shadow-2xl border-border flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="p-6 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Layers className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">Gestion des Catégories</h2>
              <p className="text-xs text-muted-foreground">Créez et organisez vos types de produits</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6">
          {/* Add New Category */}
          {!isAdding && !editingId && (
            <Button 
              onClick={() => setIsAdding(true)} 
              className="w-full gap-2 h-12 border-dashed" 
              variant="outline"
            >
              <Plus className="w-4 h-4" />
              Nouvelle Catégorie
            </Button>
          )}

          {(isAdding || editingId) && (
            <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 space-y-4 animate-in fade-in zoom-in-95 duration-200">
              <div className="grid grid-cols-1 gap-4">
                <Input 
                  placeholder="Nom de la catégorie" 
                  value={editForm.name}
                  onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                  className="bg-background"
                />
                <Input 
                  placeholder="Description (optionnel)" 
                  value={editForm.description}
                  onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                  className="bg-background"
                />
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={handleSave} 
                  className="flex-1 gap-2"
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  <Check className="w-4 h-4" />
                  Enregistrer
                </Button>
                <Button 
                  variant="ghost" 
                  onClick={() => { setIsAdding(false); setEditingId(null); setEditForm({ name: '', description: '' }) }}
                >
                  Annuler
                </Button>
              </div>
            </div>
          )}

          {/* List */}
          <div className="space-y-3">
            {isLoading ? (
              <div className="text-center py-10 text-muted-foreground animate-pulse">Chargement...</div>
            ) : (Array.isArray(categories) && categories.length === 0) ? (
              <div className="text-center py-10 border border-dashed rounded-xl flex flex-col items-center gap-2">
                 <AlertCircle className="w-8 h-8 opacity-20" />
                 <p className="text-muted-foreground">Aucune catégorie définie</p>
              </div>
            ) : (
              Array.isArray(categories) && categories.map(cat => (
                <div key={cat.id} className="flex items-center justify-between p-4 rounded-xl border border-border hover:bg-muted/30 transition-colors group">
                  <div>
                    <h3 className="font-bold text-foreground text-sm">{cat.name}</h3>
                    {cat.description && <p className="text-xs text-muted-foreground">{cat.description}</p>}
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-primary"
                      onClick={() => startEditing(cat)}
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-destructive"
                      onClick={() => { if(confirm('Supprimer cette catégorie ?')) deleteMutation.mutate(cat.id) }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="p-4 border-t border-border bg-muted/10 text-center">
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
            {categories.length} Catégories au total
          </p>
        </div>
      </Card>
    </div>
  )
}
