import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import {
  applyTheme,
  readStoredTheme,
  resolveTheme,
  storeTheme,
  type ResolvedTheme,
  type ThemeMode,
} from '@/theme/theme'

interface ThemeState {
  /** What the user picked, which may be `system`. */
  mode: ThemeMode
  /** What is actually painted right now. */
  resolved: ResolvedTheme
}

const initialMode = readStoredTheme()

const initialState: ThemeState = {
  mode: initialMode,
  resolved: resolveTheme(initialMode),
}

const themeSlice = createSlice({
  name: 'theme',
  initialState,
  reducers: {
    /** Picks a mode and persists it locally. Server sync is the caller's job. */
    setThemeMode: (state, action: PayloadAction<ThemeMode>) => {
      state.mode = action.payload
      state.resolved = applyTheme(action.payload)
      storeTheme(action.payload)
    },
    /**
     * Adopts a mode that came from somewhere already authoritative, such as the
     * user's saved preferences, without writing it back out.
     */
    syncThemeMode: (state, action: PayloadAction<ThemeMode>) => {
      if (state.mode === action.payload) return
      state.mode = action.payload
      state.resolved = applyTheme(action.payload)
      storeTheme(action.payload)
    },
    /** Reacts to the OS flipping while the user is in `system` mode. */
    setResolvedTheme: (state, action: PayloadAction<ResolvedTheme>) => {
      state.resolved = action.payload
    },
  },
})

export const { setThemeMode, syncThemeMode, setResolvedTheme } = themeSlice.actions
export default themeSlice.reducer
