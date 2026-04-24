# Browser Host Refactor

## Goal

Refactor the current browser host boundary so runtime capabilities, presentation state, and future IPC concerns are more clearly separated, without weakening the interpreter's class- and polymorphism-heavy core model.

This refactor should preserve current web behavior and keep the interpreter running in-process on the renderer side for now.

## Why

The current browser host implementation in `packages/lang-browser/src/browser.ts` mixes several concerns:

- runtime-facing behavior
- presentation state for shapes and terminal cells
- repaint scheduling
- snapshot state used for inspection and rewind

That structure works, but it makes it harder to:

- add non-browser capabilities like file and network access cleanly
- model CLI behavior explicitly
- keep Electron-specific code out of the language/runtime layer
- introduce IPC or snapshot transport later without dragging the whole host across the boundary

## Design Direction

The interpreter core should stay rich and object-oriented:

- nodes remain classes
- frames remain classes
- handlers remain classes
- in-process snapshots remain rich object graphs

We should not flatten the interpreter model into plain data just to make host boundaries cleaner.

Instead, the host side should become more explicit.

## Target Shape

### 1. Runtime globals and suspensions

Runtime operations that can pause execution should return first-class suspensions
instead of relying on a host/environment callback or a pending promise.

Examples:

- prompting for input
- file access
- project access
- network access

This keeps pause/resume state inside the interpreter frame model and avoids
closed-over state that cannot be rewound or rehydrated.

### 2. Presentation host

A presentation-focused interface for:

- graphics output
- text/cell output
- presentational configuration
- presentation-only snapshots

This is the part that the renderer UI actually needs to observe and render.

### 3. Renderer presentation implementation

The current browser-specific implementation should likely become a more focused renderer presentation host.

Responsibilities:

- own shapes, cells, and output buffer state
- emit repaint events
- take and restore presentation snapshots

### 4. Explicit non-graphical hosts

We should model non-browser behavior intentionally instead of implicitly.

Likely future types:

- `NullPresentationHost`
- `CliPresentationHost`

This keeps CLI behavior legible and makes tests easier to reason about.

## Snapshot Boundary

We should conceptually distinguish three levels of state:

### Core execution snapshot

Interpreter internals used for actual pause/resume/rewind:

- frame stack
- namespace stack
- runtime state

This remains rich and in-process.

### Presentation snapshot

Renderer-facing output state:

- shapes
- text/cell buffers
- presentational config

This can still be rich in memory for now.

### Future transport/inspector DTOs

Only needed if we later move execution across an IPC boundary or want lighter-weight transport.

Not a goal for this refactor.

## Incremental Plan

### Step 1

Define small interfaces for:

- presentation host behavior
- snapshot support where needed

Keep these close to the interpreter layer, likely in `packages/lang-core` unless they grow enough to merit a dedicated package.

### Step 2

Adapt the current browser implementation to satisfy the presentation interface.

Behavior should remain unchanged.

### Step 3

Split browser globals by concern.

The browser-facing globals should remain split by concern:

- presentation operations
- runtime operations that suspend execution

This keeps future file/network/project capabilities from being conceptually tied
to browser presentation.

### Step 4

Add an explicit no-op or text-only presentation host for CLI usage.

This makes the absence of graphics/inspector support intentional and testable.

### Step 5

Clarify naming.

The browser presentation implementation should keep a precise name, such as:

- `RendererPresentationHost`
- `BrowserPresentationHost`

The name should reflect that it is primarily a presentation implementation, not the full runtime environment.

## Non-Goals

These are intentionally out of scope for the first pass:

- no IPC bridge
- no snapshot codec/serializer
- no off-renderer interpreter execution
- no conversion of interpreter classes into plain data
- no Electron-specific coupling in the language runtime

## Recommended First Slice

The best low-risk first implementation is:

1. introduce `PresentationHost` and first-class runtime suspensions
2. make the current browser implementation satisfy `PresentationHost`
3. move built-in runtime operations like `input` into explicit runtime globals
4. keep the web app behavior identical

This should give us a cleaner architecture without forcing a large behavioral rewrite.
