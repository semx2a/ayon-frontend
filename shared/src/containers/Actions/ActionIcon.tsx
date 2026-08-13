import { IconModel } from '@shared/api'
import { Icon } from '@ynput/ayon-react-components'
import { FC } from 'react'
import styled, { keyframes } from 'styled-components'

const spinning = keyframes`
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
`

const SpinningIcon = styled(Icon)`
  .icon {
    animation: ${spinning} 1s linear infinite;
  }
`

interface ActionIconProps {
  icon: IconModel | undefined
  isExecuting?: boolean
}

const NAMED: Record<string, [number, number, number]> = {
  white: [255, 255, 255],
  black: [0, 0, 0],
}

const toRgb = (color: string): [number, number, number] | null => {
  const c = color.trim().toLowerCase()
  if (NAMED[c]) return NAMED[c]
  const hex = c.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/)
  if (hex) {
    const h = hex[1].length === 3 ? [...hex[1]].map((x) => x + x).join('') : hex[1]
    return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as [number, number, number]
  }
  const rgb = c.match(/^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/)
  if (rgb) return [+rgb[1], +rgb[2], +rgb[3]]
  return null
}

/**
 * Addon actions carry their own icon colour. Some were authored against the
 * dark-only UI and hardcode white, which vanishes in light mode. A greyscale
 * extreme carries no brand meaning, so drop it and inherit; hues are kept.
 */
const themeSafeColor = (color?: string | null): string | undefined => {
  if (!color) return undefined
  const rgb = toRgb(color)
  if (!rgb) return color
  const [r, g, b] = rgb
  const achromatic = Math.max(r, g, b) - Math.min(r, g, b) <= 24
  const avg = (r + g + b) / 3
  return achromatic && (avg >= 225 || avg <= 30) ? undefined : color
}

const ActionIcon: FC<ActionIconProps> = ({ icon, isExecuting }) => {
  let component

  if (isExecuting) component = <SpinningIcon icon="sync" />
  else if (icon?.type === 'material-symbols' && icon?.name) {
    component = <Icon icon={icon.name} style={{ color: themeSafeColor(icon.color) }} />
  } else if (icon?.type === 'url') {
    component = <img src={icon.url} title="Action" />
  } else {
    component = <Icon icon="category" />
  }

  return component
}

export default ActionIcon
