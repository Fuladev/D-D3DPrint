import { useEffect, useState } from 'react'

const KEY = 'dd-theme'

const read = () => {
  try {
    return localStorage.getItem(KEY)
  } catch {
    return null
  }
}

const systemTheme = () => (window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')

// Light/dark preference for this device; follows the system until the user picks one.
export function useTheme() {
  const [theme, setTheme] = useState(() => read() || systemTheme())

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    try {
      localStorage.setItem(KEY, next)
    } catch {
      // the choice just won't be remembered
    }
  }
  return [theme, toggle]
}
