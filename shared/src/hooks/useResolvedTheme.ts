import { useEffect, useState } from 'react'

export type ResolvedTheme = 'dark' | 'light'

const DEFAULT_THEME: ResolvedTheme = 'dark'

/**
 * Reads the theme that is currently painted.
 *
 * The host owns the theme, but it publishes the result as
 * `<html data-theme="dark|light">` and treats that attribute as the source of
 * truth for what is on screen. Shared components cannot reach the host's theme
 * store, so they read the DOM instead. That also keeps working in an addon
 * frontend, and inside an error boundary where the store may be the thing that
 * broke.
 *
 * `system` never reaches the attribute, the host resolves it before painting.
 */
export const getResolvedTheme = (): ResolvedTheme =>
  document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : DEFAULT_THEME

/** Re-renders whenever the host flips the theme. */
export const useResolvedTheme = (): ResolvedTheme => {
  const [theme, setTheme] = useState<ResolvedTheme>(getResolvedTheme)

  useEffect(() => {
    const observer = new MutationObserver(() => setTheme(getResolvedTheme()))
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    })
    // the attribute can flip between first render and the observer attaching
    setTheme(getResolvedTheme())
    return () => observer.disconnect()
  }, [])

  return theme
}
