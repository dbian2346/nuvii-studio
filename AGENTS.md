# Nuvii Studio Engineering Rules

## Product

Nuvii Studio is a professional browser-based design application for creating
press-on nail sets.

The editor should behave like a specialized creative tool, not a marketing site.

## Core principles

- Figma is the visual source of truth.
- Existing verified product behaviour should not be removed without reason.
- Prefer simple architecture over unnecessary abstractions.
- UI components should not own business/domain state.
- Maintain one source of truth for project, nail and layer state.
- Keep AI optional; the editor must remain usable without AI.

## TypeScript

- TypeScript strict mode must remain enabled.
- Avoid `any`.
- Prefer explicit domain types.
- Do not suppress type errors unless there is a documented reason.
- Do not use type assertions to hide incorrect models.

## React

- Prefer small focused components.
- Do not create giant page components.
- Extract behaviour into hooks/services only when it improves clarity.
- Avoid unnecessary effects.
- Avoid duplicated derived state.
- Memoize only when there is an actual rerender/performance reason.

## Editor architecture

Core domain concepts:

Project
Nail
Layer
Asset
Selection
History

A nail owns its design layers.

Precision Nail Focus must edit the same nail state used by the normal editor.
Never maintain a separate copy of the focused nail.

## Assets

Assets must be data-driven.

Do not implement individual assets using repeated conditional logic.

A placed design element should have a typed layer representation containing
properties such as:

id
nailId
assetId/type
x
y
scale/width/height
rotation
opacity
zIndex
customizable properties

## Styling

Use Figma variables/tokens whenever possible.

Do not scatter arbitrary hex values, spacing values or radii throughout
components.

Maintain central design tokens.

Avoid excessive inline styles.

## Accessibility

- Semantic buttons
- Accessible labels for icon buttons
- Keyboard focus states
- Dialog focus management
- Escape closes dialogs where expected
- Reasonable keyboard interactions for editor controls
- Adequate contrast

## Performance

Changing one nail should not cause expensive rerenders throughout the editor.

Do not load the diffusion model until AI generation is requested.

Optimize large images/assets.

## AI

OpenAI API keys must remain server-side.

Raw natural-language prompts should first become a structured NailSpec.

Prefer native editable Nuvii layers over diffusion-generated artwork whenever
the requested design already exists in the asset system.

The LoRA service should only generate visual concepts that cannot reasonably be
constructed using native editor layers.

## Testing

Before considering a task complete:

- run TypeScript checks
- run lint
- run relevant unit tests
- start the app
- test the changed flow in the browser
- check browser console for meaningful errors

Do not hide runtime errors.

## Dependencies

Do not introduce a new major dependency without explaining why existing or
native functionality is insufficient.

## Git

Keep commits focused.

Do not commit:

.env files
API keys
training datasets
user files
model checkpoints
.safetensors files
node_modules
build artifacts

## Completion response

At the end of every implementation task, report:

Files changed
What changed
Tests run
Remaining issues

Keep this summary concise.