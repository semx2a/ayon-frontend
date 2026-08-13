import { useEffect, useState } from 'react'
import { useAppSelector } from '@state/store'

/**
 * Resolves a CSS custom property to a concrete colour string.
 *
 * Canvas APIs (Chart.js, the video player overlays) cannot read `var()`, so they
 * need the computed value. Re-resolves whenever the theme changes.
 *
 * @param token custom property name, including the leading dashes
 * @param fallback returned while the property is empty or unset
 */
export const useTokenColor = (token: string, fallback = 'transparent'): string => {
  const theme = useAppSelector((state) => state.theme.resolved)
  const [color, setColor] = useState(fallback)

  useEffect(() => {
    const value = getComputedStyle(document.documentElement).getPropertyValue(token).trim()
    setColor(value || fallback)
  }, [token, fallback, theme])

  return color
}

export default useTokenColor
