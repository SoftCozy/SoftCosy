'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/components/AuthContext'
import api from '@/lib/api'

interface UserProfileModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function UserProfileModal({ isOpen, onClose }: UserProfileModalProps) {
  // Récupère l'utilisateur connecté depuis le contexte (déjà chargé au login)
  const { user, loading } = useAuth()

  // État du formulaire (initialisé avec les données actuelles de l'utilisateur)
  const [formData, setFormData] = useState({
    full_name: '',           // ← champ réel du backend (full_name au lieu de firstName + lastName)
    phone: '',               // ← champ réel
    address: '',             // ← champ réel
    currentPassword: '',     // pour vérifier l'ancien mot de passe
    newPassword: '',
    confirmPassword: '',
  })

  // États pour feedback utilisateur
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Charge les données actuelles de l'utilisateur quand le modal s'ouvre
  useEffect(() => {
    if (isOpen && user) {
      setFormData({
        full_name: user.full_name || '',
        phone: user.phone?.toString() || '',
        address: user.address || '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      })
      setError('')
      setSuccess('')
    }
  }, [isOpen, user])

  // Fonction appelée quand on clique sur "Enregistrer"
  const handleSave = async () => {
    setError('')
    setSuccess('')
    setIsSubmitting(true)

    // Validation de base côté frontend
    if (!formData.full_name.trim()) {
      setError('Le nom complet est obligatoire')
      setIsSubmitting(false)
      return
    }

    // Si l'utilisateur veut changer son mot de passe
    if (formData.newPassword) {
      if (formData.newPassword !== formData.confirmPassword) {
        setError('Les nouveaux mots de passe ne correspondent pas')
        setIsSubmitting(false)
        return
      }
      if (formData.newPassword.length < 6) {
        setError('Le nouveau mot de passe doit contenir au moins 6 caractères')
        setIsSubmitting(false)
        return
      }
      if (!formData.currentPassword) {
        setError('Veuillez indiquer votre mot de passe actuel pour le changer')
        setIsSubmitting(false)
        return
      }
    }

    try {
      // Prépare les données à envoyer pour la mise à jour du profil
      const profileData: any = {
        full_name: formData.full_name,
        phone: formData.phone ? Number(formData.phone) : undefined,
        address: formData.address || undefined,
      }

      // Appel PATCH vers /users/me/ pour modifier le profil
      await api.patch('/users/me/', profileData)

      // Si changement de mot de passe demandé
      if (formData.newPassword) {
        await api.post('/users/change_password/', {
          old_password: formData.currentPassword,
          new_password: formData.newPassword,
          new_password2: formData.confirmPassword,
        })
      }

      // Succès → message + refresh des données utilisateur
      setSuccess('Profil mis à jour avec succès !')
      
      // Optionnel : recharger les données utilisateur dans le contexte
      // (tu peux ajouter une fonction refreshUser dans auth.ts si besoin)

      // Ferme le modal après 1.5 seconde
      setTimeout(() => {
        onClose()
      }, 1500)

    } catch (err: any) {
      // Gestion des erreurs renvoyées par le backend
      const errorMsg = err.response?.data?.detail 
        || err.response?.data?.non_field_errors?.[0]
        || 'Une erreur est survenue lors de la mise à jour'
      setError(errorMsg)
      console.error('Erreur mise à jour profil:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Si modal fermé ou pas d'utilisateur → ne rien afficher
  if (!isOpen || !user || loading) return null

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-lg max-w-md w-full shadow-lg flex flex-col max-h-[90vh] overflow-hidden">
        {/* En-tête du modal */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-xl font-bold text-foreground">Mon Profil</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenu principal avec défilement natif */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Aperçu actuel du profil */}
          <div className="bg-muted p-4 rounded-lg text-center">
            <p className="font-medium text-lg">{user.full_name}</p>
            <p className="text-sm text-muted-foreground">{user.email}</p>
            <p className="text-xs mt-1 text-muted-foreground bg-primary/10 text-primary inline-block px-2 py-0.5 rounded-full font-semibold">
              {user.role === 'ADMIN' ? 'Administrateur' : 
              user.role === 'SELLER' ? 'Vendeur' : 'Manager'}
            </p>
          </div>

          {/* Champs modifiables */}
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground block mb-1.5">
                Nom complet
              </label>
              <Input
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                placeholder="Nom complet"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground block mb-1.5">
                Téléphone
              </label>
              <Input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="Ex: 0612345678"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground block mb-1.5">
                Adresse
              </label>
              <Input
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Adresse complète"
              />
            </div>
          </div>

          {/* Section changement de mot de passe */}
          <div className="border-t border-border pt-6">
            <h3 className="font-medium text-foreground mb-4">Changer le mot de passe</h3>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">
                  Mot de passe actuel
                </label>
                <Input
                  type="password"
                  value={formData.currentPassword}
                  onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
                  placeholder="Requis pour changer le mot de passe"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">
                  Nouveau mot de passe
                </label>
                <Input
                  type="password"
                  value={formData.newPassword}
                  onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                  placeholder="Laisser vide pour ne pas changer"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">
                  Confirmer le nouveau mot de passe
                </label>
                <Input
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  placeholder="Confirmer"
                />
              </div>
            </div>
          </div>

          {/* Messages de feedback */}
          {error && <p className="text-sm text-destructive text-center bg-destructive/10 p-2 rounded">{error}</p>}
          {success && <p className="text-sm text-green-600 text-center bg-green-50 p-2 rounded">{success}</p>}
        </div>

        {/* Pied de modal fixe */}
        <div className="flex gap-3 p-6 border-t border-border">
          <Button 
            onClick={handleSave} 
            disabled={isSubmitting}
            className="flex-1"
          >
            {isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
          </Button>
          
          <Button 
            variant="outline" 
            onClick={onClose} 
            disabled={isSubmitting}
            className="flex-1"
          >
            Annuler
          </Button>
        </div>
      </div>
    </div>
  )
}