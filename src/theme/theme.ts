/**
 * Theme mode plumbing.
 *
 * The DOM is the single source of truth for what is currently painted:
 * `<html data-theme="dark|light">` drives the token overrides in
 * `src/styles/themes.scss`, and `data-color-mode` drives the third-party
 * markdown editor that reads that attribute directly.
 *
 * The user's *choice* lives in two places: `frontendPreferences.theme` on the
 * server (so it follows them between machines) and localStorage (so the very
 * first paint is correct, before any request resolves).
 */

export type ThemeMode = 'dark' | 'light' | 'system'
export type ResolvedTheme = 'dark' | 'light'

const THEME_MODES: ThemeMode[] = ['light', 'dark', 'system']

const DEFAULT_THEME_MODE: ThemeMode = 'dark'

/** Kept in sync with the inline bootstrap script in index.html. */
const THEME_STORAGE_KEY = 'ayon-theme'

const SYSTEM_DARK_QUERY = '(prefers-color-scheme: dark)'

const isThemeMode = (value: unknown): value is ThemeMode =>
  typeof value === 'string' && (THEME_MODES as string[]).includes(value)

/**
 * Pulls a theme out of the user's frontend preferences, which come from the
 * untyped user slice. Returns undefined when nothing valid is saved, which is
 * the signal to fall back to the locally cached choice.
 */
export const readPreferredTheme = (preferences: unknown): ThemeMode | undefined => {
  const theme = (preferences as { theme?: unknown } | undefined)?.theme
  return isThemeMode(theme) ? theme : undefined
}

export const getSystemTheme = (): ResolvedTheme =>
  window.matchMedia?.(SYSTEM_DARK_QUERY).matches ? 'dark' : 'light'

export const resolveTheme = (mode: ThemeMode): ResolvedTheme =>
  mode === 'system' ? getSystemTheme() : mode

export const readStoredTheme = (): ThemeMode => {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY)
    return isThemeMode(stored) ? stored : DEFAULT_THEME_MODE
  } catch {
    // private browsing or a blocked storage partition
    return DEFAULT_THEME_MODE
  }
}

export const storeTheme = (mode: ThemeMode): void => {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, mode)
  } catch {
    // preference just will not survive a reload, nothing to recover from
  }
}

/** Browser chrome colour, mirrors the values in the index.html bootstrap. */
const THEME_COLORS: Record<ResolvedTheme, string> = {
  dark: '#2c313a',
  light: '#f9f9fc',
}

/** Paints a mode onto <html>. Returns what actually got applied. */
export const applyTheme = (mode: ThemeMode): ResolvedTheme => {
  const resolved = resolveTheme(mode)
  const root = document.documentElement
  root.setAttribute('data-theme', resolved)
  root.setAttribute('data-color-mode', resolved)
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', THEME_COLORS[resolved])
  return resolved
}

/** Calls back whenever the OS theme flips. Only meaningful in `system` mode. */
export const subscribeToSystemTheme = (onChange: (theme: ResolvedTheme) => void): (() => void) => {
  const query = window.matchMedia?.(SYSTEM_DARK_QUERY)
  if (!query) return () => {}

  const handler = (e: MediaQueryListEvent) => onChange(e.matches ? 'dark' : 'light')
  query.addEventListener('change', handler)
  return () => query.removeEventListener('change', handler)
}
