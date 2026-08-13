import { useCallback, useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '@state/store'
import { setResolvedTheme, setThemeMode, syncThemeMode } from '@state/theme'
import { updateUserPreferences } from '@state/user'
import { useSetFrontendPreferencesMutation } from '@shared/api'
import {
  applyTheme,
  getSystemTheme,
  readPreferredTheme,
  subscribeToSystemTheme,
  type ThemeMode,
} from '@/theme/theme'

/**
 * Reads the current theme and changes it. Safe to call from any component.
 *
 * `setTheme` applies immediately and caches locally, then saves to the user's
 * preferences so the choice follows them to another machine.
 */
export const useTheme = () => {
  const dispatch = useAppDispatch()
  const mode = useAppSelector((state) => state.theme.mode)
  const resolved = useAppSelector((state) => state.theme.resolved)
  const userName = useAppSelector((state) => state.user.name)

  const [updatePreferences] = useSetFrontendPreferencesMutation()

  const setTheme = useCallback(
    async (next: ThemeMode) => {
      // apply first so the UI never waits on the network
      dispatch(setThemeMode(next))
      if (!userName) return

      dispatch(updateUserPreferences({ theme: next }))
      try {
        await updatePreferences({ userName, patchData: { theme: next } }).unwrap()
      } catch (error) {
        // the theme still applied and is cached locally, it just will not follow
        // the user to another machine
        console.error('Unable to save theme preference', error)
      }
    },
    [dispatch, userName, updatePreferences],
  )

  return { mode, resolved, setTheme }
}

/**
 * Owns the side effects that keep <html>, the saved preference and the OS
 * setting in step. Mount exactly once, high in the tree.
 */
export const useThemeSync = () => {
  const dispatch = useAppDispatch()
  const mode = useAppSelector((state) => state.theme.mode)
  const savedMode = useAppSelector((state) =>
    readPreferredTheme(state.user.data?.frontendPreferences),
  )

  // paint whatever the store starts with, and keep <html> honest after a reload
  useEffect(() => {
    applyTheme(mode)
  }, [mode])

  // the saved preference wins once the user resolves, it outranks the local cache
  useEffect(() => {
    if (savedMode) dispatch(syncThemeMode(savedMode))
  }, [savedMode, dispatch])

  // follow the OS while the user is on `system`
  useEffect(() => {
    if (mode !== 'system') return
    dispatch(setResolvedTheme(getSystemTheme()))
    return subscribeToSystemTheme((theme) => {
      applyTheme('system')
      dispatch(setResolvedTheme(theme))
    })
  }, [mode, dispatch])
}

export default useTheme
