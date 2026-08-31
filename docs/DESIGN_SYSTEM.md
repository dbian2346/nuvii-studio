# Nuvii Studio Design System

## Status and sources

This document describes the design system implemented in Nuvii Studio through Phase 6. The approved main editor Figma frame, `apps/studio/src/styles/tokens.css`, and the reusable UI components in `apps/studio/src/components/ui` are the sources of truth. Values below reflect the application; they are not proposals for a separate visual language.

## Product visual direction

Nuvii is a desktop-first professional creative tool with a soft, editorial character. The interface is light, spacious, and visually quiet so the nail artwork remains the focus. Translucent white panels, restrained shadows, warm neutral nail colours, and a single lavender accent create a polished studio feel rather than an e-commerce catalogue.

The approved editor is designed around a 1512 × 982 workspace shell within a 1580 × 1042 reference viewport. The implementation preserves a desktop working area with a minimum width of 79rem and a minimum shell height of 55rem rather than collapsing the full editor into a mobile layout.

## Colour tokens

### Primitive palette

| Token | Value | Use |
| --- | --- | --- |
| `--color-black` | `#000000` | Primary text and strong icons |
| `--color-white` | `#ffffff` | Panels and elevated controls |
| `--color-gray-50` | `#fafafc` | Workspace background |
| `--color-gray-75` | `#f9f9fb` | Top navigation |
| `--color-gray-100` | `#f7f7f7` | Neutral control surfaces |
| `--color-gray-200` | `#eeeeee` | Outer canvas |
| `--color-gray-300` | `#c9c9c9` | Secondary borders |
| `--color-gray-600` | `#75737a` | Secondary text |
| `--color-purple-500` | `#9573e4` | Primary accent |
| `--color-purple-200` | `#e2e2ff` | Soft accent surface |
| `--color-purple-selection` | `rgb(170 133 255 / 14%)` | Selected controls and rows |
| `--color-pink-200` | `#f4c3d3` | Nail colour preset |
| `--color-sage-200` | `#d1e0d6` | Nail colour preset |
| `--color-cream-100` | `#f8f2e7` | Nail colour preset |
| `--color-nail-default` | `#f3e7e0` | Default nail base |
| `--color-nail-selected` | `#f5e6eb` | Demo selected nail base |

### Semantic palette

| Token | Value |
| --- | --- |
| `--color-canvas` | `var(--color-gray-200)` |
| `--color-workspace` | `var(--color-gray-50)` |
| `--color-topbar` | `var(--color-gray-75)` |
| `--color-surface` | `var(--color-white)` |
| `--color-surface-translucent` | `rgb(255 255 255 / 30%)` |
| `--color-control` | `rgb(250 250 252 / 55%)` |
| `--color-control-hover` | `rgb(255 255 255 / 72%)` |
| `--color-text` | `var(--color-black)` |
| `--color-text-secondary` | `var(--color-gray-600)` |
| `--color-text-muted` | `rgb(117 115 122 / 64%)` |
| `--color-accent` | `var(--color-purple-500)` |
| `--color-selected` | `var(--color-purple-selection)` |
| `--color-border-glass` | `rgb(255 255 255 / 50%)` |
| `--color-border-control` | `var(--color-white)` |
| `--color-focus` | `#6f4ac8` |
| `--color-danger` | `#9d3057` |

Use semantic tokens in components. Primitive tokens are the palette foundation, not a substitute for component intent.

## Typography

- Display and brand type: Cinzel, with Georgia as the fallback.
- Interface type: Nunito, with the platform UI sans-serif stack as fallback.
- Supported weights: 400, 600, and 700.
- Caption: 11px.
- Label and compact control text: 12px.
- Body and standard control text: 16px.
- Display title: 24px.
- Tight line height: 1.15.
- Body line height: 1.375.

Cinzel is reserved for brand and editorial display moments. Nunito is used for navigation, labels, controls, metadata, and working content.

## Spacing

The spacing scale is tokenized at 0, 4, 8, 12, 16, 20, 24, 30, 32, 42, 48, 55, and 68px. Components should compose these values instead of introducing near-duplicate gaps.

The interface intentionally combines compact controls with generous separation between functional regions. The top bar is 67px high, the left tool rail is 88px wide, and the right inspector is 350px wide.

## Radii

| Token | Value | Use |
| --- | --- | --- |
| `--radius-swatch` | 13px | Colour and asset swatches |
| `--radius-control` | 14px | Buttons, fields, and compact controls |
| `--radius-selected` | 18px | Selected tool surfaces |
| `--radius-panel` | 20px | Panels and breadcrumb surface |
| `--radius-round` | 999px | Circular controls and pills |

## Borders, shadows, and surfaces

Glass panels use a translucent white fill, the implemented glass gradient, a 2px `--color-border-glass` border, 4px backdrop blur, and `--shadow-panel`:

`0 9px 24px -7px rgb(0 0 0 / 7%), inset 0 -1px 4px rgb(0 0 0 / 11%), inset 0 1px 4px rgb(255 255 255 / 30%)`

Solid panels use a white surface with a 1px border. Additional elevation tokens are:

- Button: `0 2px 2px rgb(151 71 255 / 10%), inset 0 1px 4px rgb(0 0 0 / 5%)`.
- Swatch: `0 0 2px rgb(0 0 0 / 21%)`.
- Top bar: `0 3px 12px rgb(0 0 0 / 4%)`.
- Focus: `0 0 0 3px rgb(255 255 255 / 90%), 0 0 0 6px rgb(111 74 200 / 50%)`.

Nails use a softer artwork shadow (`drop-shadow(0 .75rem .75rem rgb(77 55 63 / 18%))`) so they read as objects without competing with controls.

## Control sizing

- Standard control and icon button: 42px minimum height/size.
- Large field/control: 57px minimum height.
- Standard button: 38px minimum height.
- Compact button: 32px minimum height.
- Tool-rail target: 68px square.
- Colour swatch: 53 × 50px.
- Icons: 20px small, 24px medium, and 35px large/tool.

These dimensions provide comfortable targets while retaining the dense, professional character of a creative editor.

## Buttons

Buttons share the control radius, semibold interface typography, a visible focus treatment, and a 140ms ease transition.

- `surface`: the standard neutral action on a light elevated surface.
- `accent`: the primary action using the lavender accent.
- `ghost`: a low-emphasis action with minimal surface treatment.
- `compact`: 32px minimum height with 4px vertical and 12px horizontal padding.

Enabled buttons translate upward by 1px on hover. Disabled buttons do not move and use 45% opacity.

## Icon buttons

Icon buttons use the same interaction language as text buttons:

- Compact: 32px.
- Default: 42px.
- Tool rail: 68px with an 18px selected radius.
- Selected: pale lavender `--color-selected` surface.
- Hover: raised by 1px with the control-hover surface.
- Disabled: 45% opacity and no pointer action.

The editor rail intentionally keeps the future AI tool visually present but disabled. It remains non-interactive and is not represented as a shipped feature.

## Inputs

Text and number fields use a 57px minimum height where displayed as primary property controls, 12px vertical and 16px horizontal padding, 16px bold text, a white border, and the control radius. Compact numeric layer controls retain the same visual vocabulary at the smaller working density.

Fields receive the standard focus ring. Invalid fields use `--color-danger` for the error state and must expose the error programmatically as well as visually.

## Sliders

Range inputs use the lavender accent through `accent-color`. Layer property sliders are paired with numeric values where precision matters. Pointer, keyboard, and blur completion commit a single domain change so continuous adjustment does not create an unusable undo history.

## Segmented controls and tabs

Segmented controls use neutral translucent tracks and clear selected surfaces. Selected items use a white or pale lavender surface with accent emphasis; unselected items remain quiet but gain a visible hover surface.

The asset browser's top-level categories form a four-column segmented control. Property tabs and asset subtype filters reuse the same selection language rather than introducing feature-specific colours.

## Panels

Panels group related controls without heavy chrome. The right inspector is contextual: Nail Properties, Assets, and Layers occupy the same 350px region. Panel content may scroll independently while the main workspace remains stable.

The Projects Library extends the same surface language into a gallery. Project cards use the glass panel border, radius, blur, and shadow; the nail-set preview remains the dominant card content while text metadata and management actions stay compact. Loading, empty, search-empty, and dialog states use the same workspace background, lavender emphasis, typography, and control hierarchy as the editor.

The Nuvii AI inspector uses the established inspector width and density. Native construction is emphasized with lavender and the primary button hierarchy; model-generated artwork uses a restrained warm-pink marker without introducing a second product brand. Progress, result, candidate, and error cards reuse control radii, panel borders, and semantic colours. Candidate imagery remains compact so the ten-nail canvas stays the primary visual workspace.

Panel headings use clear hierarchy, compact labels, and spacing tokens. Rows use a 42px minimum height with 8px vertical and 12px horizontal padding. Empty and no-result states stay within the panel instead of replacing the editor workspace.

## Interaction states

- Default: neutral translucent or white control surface.
- Hover: increased white opacity and, where implemented, a subtle 1–2px lift.
- Selected: pale lavender surface and/or a stronger lavender outline.
- Focus-visible: the two-part high-contrast focus shadow; focus must not depend on colour alone.
- Disabled: non-interactive, no hover movement, and 45% opacity unless a layout-specific rule deliberately preserves visibility.
- Destructive: danger colour, an explicit accessible name, and no ambiguous icon-only meaning.

Colour swatches use a 2px secondary border when selected and lift by 2px on hover. Add/custom swatches use a dashed border. Placed layer selection uses a dashed outline with 12px lavender handles and a 2px white edge.

## Icon conventions

Use the supplied SVG icon set in `apps/studio/public/icons/nuvii`. Icons should be rendered at the token sizes, maintain a consistent stroke weight, and not carry feature-specific colour unless communicating state.

Every icon-only interactive control requires an accessible name through `aria-label` or equivalent visible/associated text. Decorative SVGs are hidden from assistive technology. Do not use an icon alone where its meaning is not established in the editor context.

## Accessibility conventions

- All interactive elements are native buttons, inputs, or controls where possible.
- Every control has a programmatic name; icon-only actions use explicit labels.
- Keyboard focus is visible with the shared focus token.
- Selection and errors are conveyed with state and text/semantics, not colour alone.
- Disabled controls use the native disabled state where appropriate.
- Touch/click targets use the standard sizing tokens.
- Reduced-motion preferences set interaction duration to zero.
- Keyboard adjustments and shortcuts must avoid firing while the user is typing in an editable field.
- Contrast-sensitive text uses primary or secondary semantic text tokens rather than low-opacity decorative colours.
