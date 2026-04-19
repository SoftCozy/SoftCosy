'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/AuthContext'
import LoginPage from '@/app/login/page'
import Navbar from '@/components/navbar'
import Sidebar from '@/components/sidebar'
//import Products from '@/app/dashboard/products/page'

export default function Home() {
  const { isAuthenticated, loading } = useAuth()
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [currentPage, setCurrentPage] = useState('dashboard')

  // Si déjà connecté → redirige vers dashboard (ou une page placeholder pour l'instant)
  useEffect(() => {
    if (!loading && isAuthenticated) {
      router.push('/dashboard')  // ← on créera cette page plus tard
    }
  }, [isAuthenticated, loading, router])

  // Pendant le chargement → écran de chargement
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 rounded-lg bg-primary mx-auto animate-pulse" />
          <p className="text-foreground font-medium">Chargement de la session...</p>
        </div>
      </div>
    )
  }

  // Si NON connecté → affiche la page de login
  if (!isAuthenticated) {
    return <LoginPage />
  }

  // Si connecté → affiche le dashboard avec Navbar et Sidebar
  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Navbar en haut */}
      <Navbar onMenuClick={() => setSidebarOpen(!sidebarOpen)} sidebarOpen={sidebarOpen} />

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar gauche */}
        <Sidebar 
          currentPage={currentPage} 
          setCurrentPage={setCurrentPage} 
          isOpen={sidebarOpen}
          onLogout={() => {
            localStorage.removeItem('token')
            localStorage.removeItem('user')
            router.push('/login')
          }}
        />

        {/* Zone contenu principal */}
        <main className="flex-1 overflow-auto">
          <div className="p-8">
            <h1 className="text-3xl font-bold mb-4">Bienvenue sur SoftCosy !</h1>
            <p className="text-muted-foreground">
              Vous êtes connecté. Page actuelle : <strong>{currentPage}</strong>
            </p>
          </div>
        </main>
      
  
        
        {/* Bouton temporaire pour tester logout */}
        <button
          onClick={() => {
            localStorage.removeItem('token')
            localStorage.removeItem('user')
            router.push('/login')
          }}
          className="px-6 py-3 bg-destructive text-destructive-foreground rounded-md hover:opacity-90"
        >
          Se déconnecter (test)
        </button>
      </div>
    </div>
  )
}