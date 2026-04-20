'use client'

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'

export interface ThemeColors {
  primary: string
  accent: string
}

interface ThemeColorsContextType {
  colors: ThemeColors
  setColors: (colors: ThemeColors) => void
  presets: { name: string; primary: string; accent: string }[]
}

const ThemeColorsContext = createContext<ThemeColorsContextType | undefined>(undefined)

const COLOR_PRESETS = [
  { name: 'Bleu Royal', primary: '#4f46e5', accent: '#f97316' },
  { name: 'Émeraude', primary: '#059669', accent: '#f59e0b' },
  { name: 'Améthyste', primary: '#7c3aed', accent: '#06b6d4' },
  { name: 'Framboise', primary: '#db2777', accent: '#14b8a6' },
  { name: 'Océan', primary: '#0ea5e9', accent: '#f43f5e' },
]

export function ThemeColorsProvider({ children }: { children: ReactNode }) {
  const [colors, setColorsState] = useState<ThemeColors>({
    primary: '#4f46e5',
    accent: '#f97316',
  })
  const [mounted, setMounted] = useState(false)

  // Charger les couleurs de localStorage au montage
  useEffect(() => {
    const savedColors = localStorage.getItem('softcosy_theme_colors')
    if (savedColors) {
      try {
        setColorsState(JSON.parse(savedColors))
      } catch (error) {
        console.error('Failed to load colors:', error)
      }
    }
    setMounted(true)
  }, [])

  // Appliquer les couleurs aux variables CSS quand elles changent
  useEffect(() => {
    if (!mounted) return

    const root = document.documentElement
    
    // Injecter les variables CSS dynamiquement
    let existingStyle = document.getElementById('softcosy-theme-vars')
    if (existingStyle) {
      existingStyle.remove()
    }
    
    const style = document.createElement('style')
    style.id = 'softcosy-theme-vars'
    style.innerHTML = `
      :root {
        --primary: ${colors.primary} !important;
        --accent: ${colors.accent} !important;
        --color-primary: ${colors.primary} !important;
        --color-accent: ${colors.accent} !important;
        --ring: ${colors.primary} !important;
        --sidebar-primary: ${colors.primary} !important;
        --sidebar-primary-foreground: #ffffff !important;
      }
      .dark {
        --primary: ${colors.primary} !important;
        --accent: ${colors.accent} !important;
        --color-primary: ${colors.primary} !important;
        --color-accent: ${colors.accent} !important;
        --ring: ${colors.primary} !important;
        --sidebar-primary: ${colors.primary} !important;
        --sidebar-primary-foreground: #ffffff !important;
      }
    `
    document.head.appendChild(style)

    localStorage.setItem('softcosy_theme_colors', JSON.stringify(colors))
  }, [colors, mounted])

  const setColors = (newColors: ThemeColors) => {
    setColorsState(newColors)
  }

  return (
    <ThemeColorsContext.Provider
      value={{
        colors,
        setColors,
        presets: COLOR_PRESETS,
      }}
    >
      {children}
    </ThemeColorsContext.Provider>
  )
}

export function useThemeColors() {
  const context = useContext(ThemeColorsContext)
  if (context === undefined) {
    throw new Error('useThemeColors must be used within ThemeColorsProvider')
  }
  return context
}
