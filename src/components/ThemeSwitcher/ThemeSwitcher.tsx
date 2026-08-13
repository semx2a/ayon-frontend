import { Icon } from '@ynput/ayon-react-components'
import useTheme from '@hooks/useTheme'
import type { ThemeMode } from '@/theme/theme'
import * as Styled from './ThemeSwitcher.styled'

const OPTIONS: { id: ThemeMode; icon: string; label: string }[] = [
  { id: 'light', icon: 'light_mode', label: 'Light' },
  { id: 'dark', icon: 'dark_mode', label: 'Dark' },
  { id: 'system', icon: 'computer', label: 'Match system' },
]

export const ThemeSwitcher = () => {
  const { mode, setTheme } = useTheme()

  return (
    <Styled.Container>
      <Styled.Label>Theme</Styled.Label>
      <Styled.Options role="radiogroup" aria-label="Theme">
        {OPTIONS.map(({ id, icon, label }) => (
          <Styled.Option
            key={id}
            type="button"
            role="radio"
            aria-checked={mode === id}
            aria-label={label}
            data-tooltip={label}
            onClick={() => setTheme(id)}
          >
            <Icon icon={icon} />
          </Styled.Option>
        ))}
      </Styled.Options>
    </Styled.Container>
  )
}

export default ThemeSwitcher
