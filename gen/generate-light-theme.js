/**
 * Generates the light-mode override sheet for PrimeReact.
 *
 * @ynput/ayon-react-components bundles a *compiled* PrimeReact dark theme: ~700
 * `.p-*` rules with literal colours baked in rather than variables. Those rules
 * ignore `html[data-theme='light']`, so a light user gets white-on-white text
 * inside every PrimeReact widget.
 *
 * This script reads that bundled stylesheet, finds the declarations carrying a
 * known dark literal, and re-emits just those declarations under the light
 * selector with the equivalent design token. Re-run it after upgrading the
 * design system:
 *
 *   yarn generate-light-theme
 */
const fs = require('fs')
const path = require('path')
const postcss = require('postcss')

const SOURCE = path.join(
  __dirname,
  '..',
  'node_modules',
  '@ynput',
  'ayon-react-components',
  'dist',
  'style.css',
)
const OUTPUT = path.join(__dirname, '..', 'src', 'styles', 'primereact-light.generated.css')

/**
 * Wrapped in :where() so the theme scope contributes **zero** specificity.
 *
 * A bare `html[data-theme='light']` prefix adds a specificity point, which
 * lifted every generated rule above the app's own PrimeReact overrides: table
 * zebra striping lost to the base row rule, and `border: none` on cells lost to
 * the design system's border. With :where() each override matches the original
 * rule's specificity exactly, so ordinary source order decides and the app's
 * customisations still win.
 */
const LIGHT_SELECTOR = ":where(html[data-theme='light'])"

/**
 * Dark literals from the compiled theme mapped to the token that means the same
 * thing. Only structural colours are mapped: text, surfaces, borders, hover and
 * the accent. Shadows are left alone (they read the same in both themes) and so
 * are the pastel severity colours, which are not used by AYON's own components.
 */
const COLOR_MAP = {
  '#ffffffde': 'var(--md-sys-color-on-surface)',
  'rgba(255,255,255,.87)': 'var(--md-sys-color-on-surface)',
  '#fff9': 'var(--md-sys-color-on-surface-variant)',
  'rgba(255,255,255,.6)': 'var(--md-sys-color-on-surface-variant)',
  'rgba(255,255,255,.03)': 'var(--md-sys-color-surface-container-hover)',
  '#1e1e1e': 'var(--md-sys-color-surface-container)',
  '#121212': 'var(--md-sys-color-surface)',
  '#2a2a2a': 'var(--md-sys-color-surface-container-high)',
  '#383838': 'var(--md-sys-color-outline-variant)',
  '#64b5f6': 'var(--md-sys-color-primary)',
  '#212529': 'var(--md-sys-color-on-primary)',
  'rgba(100,181,246,.16)': 'var(--md-sys-color-primary-container)',
}

// longest first so #ffffffde is matched before any shorter prefix
const LITERALS = Object.keys(COLOR_MAP).sort((a, b) => b.length - a.length)

const normalise = (value) => value.replace(/\s+/g, '').toLowerCase()

/** Swaps every mapped literal in a declaration value. Returns null if none hit. */
const remapValue = (value) => {
  let out = value
  let changed = false
  for (const literal of LITERALS) {
    // compare on a whitespace-free copy so `rgba(255, 255, 255, .87)` matches too
    const pattern = new RegExp(
      literal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/,/g, ',\\s*'),
      'gi',
    )
    if (pattern.test(out)) {
      out = out.replace(pattern, COLOR_MAP[literal])
      changed = true
    }
  }
  return changed ? out : null
}

const prefixSelector = (selector) =>
  selector
    .split(',')
    .map((part) => `${LIGHT_SELECTOR} ${part.trim()}`)
    .join(',\n')

const BORDER_STYLES =
  /^(none|hidden|dotted|dashed|solid|double|groove|ridge|inset|outset)$/

/**
 * Narrows a shorthand to its colour longhand where that is unambiguous, so an
 * override can never reintroduce a border width or drop a background image that
 * a later rule set. Returns [prop, value] unchanged when narrowing is unsafe.
 */
const narrowToColour = (prop, value) => {
  const v = value.trim()
  if (prop === 'background') {
    // only a bare colour is safe; anything with a gradient or url keeps the shorthand
    if (!/\b(url|gradient)\s*\(/i.test(v) && !/\s(repeat|no-repeat|center|cover|contain)\b/i.test(v)) {
      return ['background-color', v]
    }
    return [prop, v]
  }
  if (prop === 'border' || /^border-(top|right|bottom|left)$/.test(prop)) {
    // `<width> <style> <colour>` -> just the colour
    const parts = v.split(/\s+(?![^(]*\))/)
    if (parts.length === 3 && BORDER_STYLES.test(parts[1])) {
      return [`${prop}-color`, parts[2]]
    }
    return [prop, v]
  }
  return [prop, v]
}

const main = () => {
  if (!fs.existsSync(SOURCE)) {
    console.error(`Design system stylesheet not found at ${SOURCE}. Run "yarn install" first.`)
    process.exit(1)
  }

  const root = postcss.parse(fs.readFileSync(SOURCE, 'utf8'))
  const blocks = []
  let ruleCount = 0
  let declCount = 0

  root.walkRules((rule) => {
    const selector = rule.selector
    // :root is handled by hand in themes.scss, and non-PrimeReact rules already
    // use tokens
    if (!selector.includes('.p-') || selector.includes(':root')) return
    // keyframe steps have no meaningful selector to scope
    if (rule.parent?.type === 'atrule' && rule.parent.name.endsWith('keyframes')) return

    const decls = []
    rule.walkDecls((decl) => {
      const remapped = remapValue(decl.value)
      if (!remapped) return
      const [prop, value] = narrowToColour(decl.prop, remapped)
      decls.push(`  ${prop}: ${value}${decl.important ? ' !important' : ''};`)
    })
    if (!decls.length) return

    ruleCount += 1
    declCount += decls.length

    const body = `${prefixSelector(selector)} {\n${decls.join('\n')}\n}`
    const media = rule.parent?.type === 'atrule' ? rule.parent : null
    blocks.push(media ? `@${media.name} ${media.params} {\n${body}\n}` : body)
  })

  const header = [
    '/*',
    ' * GENERATED FILE, DO NOT EDIT.',
    ' * Run `yarn generate-light-theme` to rebuild after upgrading',
    ' * @ynput/ayon-react-components. See gen/generate-light-theme.js.',
    ' *',
    ` * ${ruleCount} rules, ${declCount} declarations remapped to design tokens.`,
    ' */',
    '',
  ].join('\n')

  fs.writeFileSync(OUTPUT, `${header}${blocks.join('\n\n')}\n`)
  console.log(`Wrote ${path.relative(process.cwd(), OUTPUT)}`)
  console.log(`  ${ruleCount} rules, ${declCount} declarations`)
}

main()
