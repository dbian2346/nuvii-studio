# Nuvii Studio UX Specification

## Status and scope

This document records the product experience implemented through Phase 6 and the agreed direction for later features. The approved main editor Figma frame, current application behavior, and domain architecture are the sources of truth.

Anything labelled **PLANNED — NOT YET IMPLEMENTED** is product direction only and must not be presented as currently available.

## Editor information architecture

The editor is organized into four persistent regions:

1. Top navigation: Nuvii brand, save status, Save, Undo, Redo, Export, and profile affordance.
2. Left tool rail: Nail Properties, Asset Browser, Layers, and a disabled future AI entry.
3. Central canvas: project breadcrumb and ten nails arranged as right and left hands.
4. Right inspector: contextual controls for the active tool and current nail/layer selection.

The product is desktop-first. Functional panels remain spatially stable so switching tools does not move the nail canvas or require a new page.

## Main editor workflow

1. Open the editor; the saved local project is restored when available, otherwise the demo project is created.
2. Select one of the ten nails on the canvas.
3. Use Nail Properties to edit shape, length, base colour, and finish.
4. Use Assets to search or browse artwork and add it to the selected nail.
5. Use Layers or direct canvas manipulation to position and style placed artwork.
6. Undo or redo project changes as needed.
7. Save explicitly or rely on local autosave.
8. Export the complete ten-nail design as a PNG.

## Nail selection

- Exactly one nail is selected at a time.
- The demo project initially selects the right index nail.
- Selecting a nail updates `selectedNailId`; it does not clone nail state or create a second presentation model.
- Selecting a different nail clears the selected layer because layers belong to a specific nail.
- Tool choice remains stable when moving between nails.
- The selected nail is visually distinct and exposes its properties in the inspector.

## Shape, length, base, and finish editing

Each nail owns one appearance model. Property controls write directly to the selected nail through editor commands.

- Shapes: almond, oval, square, coffin, and stiletto.
- Lengths: short, medium, and long.
- Base: native/custom colour selection plus curated colour presets.
- Finishes: glossy, matte, chrome, glitter, and jelly.

Each property panel provides an Apply to all action. Individual and all-nail changes are undoable domain operations. Display labels, selected values, and control state are derived from the project rather than maintained as duplicate UI state.

## Asset Browser

The Asset Browser is a professional creative-tool panel designed for rapid discovery and application, not purchasing.

Top-level categories are Design, 3D, Charms, and Chrome. Supported subtypes include:

- Design: bows, French tips, aura, ombre, florals, swirls, stars, hearts, animal prints, and patterns.
- 3D: gel swirls, flowers, bubbles, and shells.
- Charms: pearls, rhinestones, gems, chains, bows, caviar beads, and stars.
- Chrome: gold, silver, and isolated chrome elements.

Asset definitions are data-driven and reference reusable vector artwork and capabilities. The browser provides:

- Category navigation.
- Text search with deferred filtering.
- Compact subtype filters.
- Recently used assets, stored separately from the project with a maximum of eight entries.
- Compact artwork cards with clear selected/hover behavior.
- A no-results state inside the inspector.

Activating an asset adds it at a sensible centered position on the selected nail, records it as recently used, selects the new layer, and moves the inspector to Layers for immediate adjustment.

## Adding and editing layers

A nail owns an ordered `layers` array. A placed layer references an asset definition and stores only editable instance data: transform, opacity, order, and optional colour customization.

Supported layer actions are:

- Add from the Asset Browser.
- Select from the nail canvas or Layers list.
- Drag within the nail canvas.
- Resize with the on-canvas handle or size control.
- Rotate with the on-canvas handle or rotation control.
- Adjust opacity.
- Duplicate with a small positional offset.
- Delete.
- Move forward or backward in the stack.
- Change colour when the asset definition declares tint support.

Pointer manipulation uses transient gesture state for responsive feedback and commits one project change at gesture completion. This keeps drag, resize, and rotate operations useful with undo/redo.

## Layer ordering

The nail's layer array is ordered back-to-front. The Layers panel displays the topmost layer first, matching common creative-tool expectations. Bring Forward and Send Backward change the domain order by one position. Ordering is saved, exported, and included in undo history.

Selecting another nail clears layer selection but does not remove any layer. A nail with no artwork shows a concise Layers empty state.

## Undo and redo

Undo/redo stores project snapshots with a maximum history depth of 50. Project mutations—including nail appearance and layer operations—participate in history. Navigation choices such as active inspector tool, nail selection, and selected layer are UI state and do not create history entries.

Keyboard shortcuts:

- Undo: Command/Ctrl + Z.
- Redo: Command/Ctrl + Shift + Z or Command/Ctrl + Y.

Shortcuts do not fire while focus is in an input, textarea, select, or content-editable element. Toolbar buttons communicate when no past or future history is available.

## Save and autosave

The implemented persistence model is local to the current browser.

- On hydration, Nuvii reads the stored project and migrates supported older schemas to schema version 3.
- Project and recently used asset changes autosave after a 350ms debounce.
- Save writes immediately.
- The top navigation communicates opening, saving, saved, and error states.
- The default/demo project is used when no valid saved project exists.

There is no cloud sync, account project storage, collaboration, or cross-device persistence in the current phase.

## Export

Export creates a 1800 × 1050 PNG in the browser from the vector editor state. It renders all ten nails with their shape, length, base colour, finish, and ordered layers. The file name is derived from a safe slug of the project name and is downloaded locally. Export does not upload artwork or credentials to a server.

## Important keyboard behavior

- Tab and Shift+Tab move through native interactive controls.
- Enter and Space activate buttons according to browser semantics.
- Arrow keys move a selected placed layer by 2 editor units.
- Shift + Arrow moves it by 10 editor units.
- Slider and number controls commit precise layer changes without producing one undo entry per intermediate value.
- Visible focus uses the shared design-system focus treatment.
- Global editor shortcuts are suppressed while the user is typing in an editable control.

## Projects

Projects is a dedicated creative gallery reached from the editor breadcrumb. It uses the same studio shell, dotted workspace, glass surfaces, typography, and lavender action hierarchy as the main editor.

- Each card prioritizes a rendered preview of the complete ten-nail set, followed by the project name and last-modified time.
- Search filters by project name. Sorting supports last modified and name.
- New Project opens a named-project dialog, creates a clean demo-derived ten-nail set, makes it active, and opens the editor.
- Open makes that record active and loads the same project state in the editor.
- Rename updates project metadata and its last-modified time.
- Duplicate deep-copies the complete editable nail/layer state and assigns a collision-safe Copy name.
- Delete requires confirmation and permanently removes that browser-local record. If the active project is deleted, another saved project becomes active when available.
- Loading, first-project empty, and no-search-results states remain within the gallery workspace.

Persistence is implemented behind a `ProjectsRepository` interface with a versioned local-storage implementation. Existing single-project browser data migrates once into the library. The editor hydrates and autosaves through the active project record, while recent assets remain separate browser-local preference data.

**PLANNED — NOT YET IMPLEMENTED:** cloud sync, accounts, collaboration, cross-device persistence, and recovery of deleted projects.

## Precision Nail Focus

Precision Nail Focus is an in-editor modal workspace for the selected nail. It opens from the visible Focus Nail action or by double-clicking a nail and closes from its labelled close control or Escape.

- The enlarged nail is rendered with the same `NailSurface` and `PlacedLayer` components used by the ten-nail canvas.
- Focus resolves the selected nail directly from the shared editor project. It does not create a precision-only nail or layer model.
- Layer selection, drag, resize, rotate, opacity, duplicate, delete, tint, and ordering dispatch through the existing editor reducer and project history.
- Precise X/Y fields and one-unit directional nudges supplement direct manipulation.
- The view zooms from 75% to 180% in five-percent steps; optional browser fullscreen is exposed only when supported.
- A compact layer stack remains visible. Progressive Layer and Nail tabs reveal transform controls or base-colour/finish controls without crowding the canvas.
- Undo/redo is shared with the main editor, so closing and reopening Focus shows the exact same project state.
- Focus is trapped inside the modal while open, restores the prior control on close, labels icon-only controls, and keeps the background editor inert.

This layout is derived from the approved main editor's workspace, glass-panel, control-density, and lavender selection language. It is not represented as a separate Figma-approved frame.

## AI Assistant

Nuvii AI is a contextual design builder in the right inspector, opened from the wand in the editor rail. It is not a conversation interface. The user writes one design brief, may add one local reference image, and chooses one of two construction methods.

### Build Editable Set

- This is the preferred action for concepts represented by the Nuvii asset catalogue.
- The server converts the brief into a structured five-finger `NailSetSpec`; the plan is mirrored across both hands.
- Bows, French tips, aura, ombre, flowers, pearls, rhinestones, gems, chains, caviar beads, and isolated chrome normally become native layers.
- Shape, length, colour, finish, placement, rotation, opacity, and layer dimensions come from the structured plan.
- The complete ten-nail result is applied as one undoable project change.
- When the brief also contains novel concepts, the editable foundation is applied and the success state directs the user to Smart Generate for the remaining artwork.

### Smart Generate

- Smart Generate is for visual artwork that cannot be represented accurately with native assets.
- Fast, Balanced, and Quality request one, two, or three candidates respectively. Quality controls are shown only with the image-model action.
- The Next.js server interprets the prompt before calling the separate FastAPI/LoRA service.
- Known elements remain native layers in hybrid results.
- Candidate artwork is not applied automatically. The user chooses a candidate; Nuvii's evaluated recommendation is clearly marked when available.
- Applying a candidate creates one transformable generated-image layer on the selected nail plus the native ten-nail plan, in one undoable project change.

### States and failure behavior

- Loading stays inside the inspector and communicates interpretation, native matching, model preparation, rendering, and candidate evaluation stages.
- Success distinguishes native editable layers from generated artwork and offers View Layers and Refine Brief.
- Reference images remain local until an AI action is run and are not stored with the project prompt state.
- Interpretation and inference errors explicitly state that the current design was not changed.
- If FastAPI is unavailable, the UI says the AI design service is not running; it never displays a raw `Failed to fetch` message.
- The editor, assets, layers, Projects, Precision Focus, save, and export remain usable when all AI services are unavailable.

OpenAI credentials remain in server-only environment variables. The deterministic local parser remains available when OpenAI is not configured. FastAPI owns model loading and inference, and no browser code receives provider credentials.
