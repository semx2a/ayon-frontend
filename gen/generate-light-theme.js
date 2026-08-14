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
  // the same colour as the line above, written as 8-digit hex (alpha 0x29 = 16%)
  '#64b5f629': 'var(--md-sys-color-primary-container)',
}

// longest first so #ffffffde is matched before any shorter prefix
const LITERALS = Object.keys(COLOR_MAP).sort((a, b) => b.length - a.length)

const normalise = (value) => value.replace(/\s+/g, '').toLowerCase()

const isHexLiteral = (literal) => /^#[0-9a-f]+$/i.test(literal)

/** Swaps every mapped literal in a declaration value. Returns null if none hit. */
const remapValue = (value) => {
  let out = value
  let changed = false
  for (const literal of LITERALS) {
    // compare on a whitespace-free copy so `rgba(255, 255, 255, .87)` matches too
    const escaped = literal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/,/g, ',\\s*')
    /*
     * A hex literal must not match a *prefix* of a longer one. `#64b5f6` used to
     * match inside `#64b5f629`, swapping the first six digits and stranding the
     * alpha pair: `var(--md-sys-color-primary)29`. That is invalid CSS, so the
     * browser dropped the whole declaration and the rule silently did nothing.
     *
     * With the boundary, an 8-digit literal is only remapped when COLOR_MAP names
     * it outright. That is deliberate: an unmapped alpha colour is left alone,
     * which is right for the fully transparent ones (`#1e1e1e00`), since
     * transparent reads the same in both themes and needs no override.
     */
    const boundary = isHexLiteral(literal) ? '(?![0-9a-f])' : ''
    const pattern = new RegExp(escaped + boundary, 'gi')
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

const BORDER_SIDES = ['top', 'right', 'bottom', 'left']

/**
 * The colour longhands a property is capable of setting. `border` reaches every
 * side, `background` only ever means `background-color` by the time we get here.
 */
const colourTargets = (prop) => {
  const p = prop.toLowerCase()
  if (p === 'background' || p === 'background-color') return ['background-color']
  if (p === 'border' || p === 'border-color')
    return ['border-color', ...BORDER_SIDES.map((side) => `border-${side}-color`)]
  const side = /^border-(top|right|bottom|left)(-color)?$/.exec(p)
  if (side) return [`border-${side[1]}-color`]
  return [p]
}

const contextOf = (rule) =>
  rule.parent?.type === 'atrule' ? `@${rule.parent.name} ${rule.parent.params}` : ''

/**
 * Indexes every rule by selector so we can tell whether a *later* rule already
 * set the same property.
 */
const buildOverrideIndex = (root) => {
  const index = new Map()
  let order = 0
  root.walkRules((rule) => {
    const position = order++
    const context = contextOf(rule)
    const targets = new Set()
    rule.walkDecls((decl) => {
      for (const target of colourTargets(decl.prop)) targets.add(target)
    })
    if (!targets.size) return
    for (const part of rule.selector.split(',')) {
      const key = `${context}||${part.trim()}`
      const entries = index.get(key) || []
      entries.push({ position, targets })
      index.set(key, entries)
    }
  })
  return index
}

/**
 * True when a later rule with the same selector already overrode this property,
 * so the declaration never applies in dark mode either and must not be re-emitted
 * for light.
 *
 * The design system does this deliberately: the compiled PrimeReact theme paints
 * `.p-splitter` `#1e1e1e`, then a later `.p-splitter` rule resets it to
 * `transparent`. Remapping the first rule in isolation put a surface colour back
 * on the splitter in light mode only, covering the page background.
 *
 * Only an exact selector match counts. A later rule with the same selector always
 * wins on source order, which makes this provably dead; anything subtler is left
 * alone rather than guessed at. For a grouped selector the declaration has to be
 * dead for every part before it is dropped.
 */
const isOverriddenLater = (index, rule, position, prop) => {
  const context = contextOf(rule)
  return rule.selector
    .split(',')
    .map((part) => part.trim())
    .every((part) =>
      (index.get(`${context}||${part}`) || []).some(
        (entry) => entry.position > position && entry.targets.has(prop),
      ),
    )
}

const main = () => {
  if (!fs.existsSync(SOURCE)) {
    console.error(`Design system stylesheet not found at ${SOURCE}. Run "yarn install" first.`)
    process.exit(1)
  }

  const root = postcss.parse(fs.readFileSync(SOURCE, 'utf8'))
  const overrideIndex = buildOverrideIndex(root)
  const blocks = []
  let ruleCount = 0
  let declCount = 0
  let deadCount = 0

  // counted over every rule, so it stays in step with the override index
  let position = -1

  root.walkRules((rule) => {
    position += 1
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
      // a later rule already killed this one, so light must not revive it
      if (isOverriddenLater(overrideIndex, rule, position, prop)) {
        deadCount += 1
        return
      }
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
  console.log(`  ${deadCount} declarations skipped, already overridden later in the source`)
}

main()
