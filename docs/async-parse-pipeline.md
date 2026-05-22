# Async Parse Pipeline

## Goal

Move parsing off the synchronous critical path of keystroke handling. Decouple "the latest source string" from "the latest parsed program," so the parser can take longer (richer errors, multi-pass analysis, recovery) without blocking typing, and so downstream consumers (gutter hints, diagnostics, the interpreter) can settle independently.

## Why

Today, `EditorModel.parseCurrentSource()` is synchronous and called eagerly from several paths:

- `parseProgram()` (runner entry)
- `isMarkable(line)` (click gating)
- `markableLines()` (hint decorations)
- `toggleMarker(line)` (click handling)

Source changes bump `version`, which invalidates the parse cache. The next access re-parses synchronously on the main thread. For a beginner-language script this is currently fine (sub-ms), but the architecture forces every consumer to live with whatever the parser costs, and it gates richer diagnostics on parse latency staying small.

We want to pave the way for:

- Multi-pass diagnostics (e.g. lenient recovery + strict re-parse for better error messages).
- Eventually a worker-side parser if needed.
- A model that naturally tolerates the parse being slightly behind the source — exactly the typing-burst case.

## Design Direction

`EditorModel` becomes a publisher of *parse results*, not a synchronous oracle.

- `source` updates immediately on keystrokes.
- A parse is *scheduled* (microtask, idle callback, or worker — implementation detail).
- The parse callback commits its result only if its version is still current; stale parses are discarded.
- The snapshot exposed to consumers carries both the source AND the last-good parse, plus a version tag.

Consumers tolerate staleness explicitly:

- **Gutter hints** read `markableLines` from whatever's in the current snapshot. During typing bursts, hints lag the source by one frame — invisible in practice.
- **Click handler** reads `markableLines` from the current snapshot; if the clicked line isn't in there, the click is silently no-op'd. (You'd never notice because the parse settles in ms.)
- **Runner** waits for a fresh parse: `await model.parsedFor(version)` or similar. Different code path from the keystroke-driven hint updates.

## Target Snapshot Shape

```ts
interface EditorSnapshot {
  readonly version: number;
  readonly source: string;
  readonly markers: readonly EditorMarker[];

  // Last successfully parsed program. May be from an earlier version than `version`.
  readonly program: Program | null;
  readonly programVersion: number; // version that produced `program`
  readonly markableLines: readonly number[];
  readonly parseError: Error | null;
}
```

Notes:

- `program` is `null` only on initial load before the first parse settles. After that, we always keep the *last good* program.
- `programVersion === version` means the snapshot is fully fresh. `programVersion < version` means a parse is in flight; `markableLines` reflects the older program.
- `parseError` is the most recent failed parse (if any). The previous good `program` is preserved so the runner can still work off the last-known-good state.

## Implementation Path

The plan collapsed simpler than originally drafted. Phases 1–3 as conceived have all landed via the introduction of `ParseScheduler` with a debounced `schedule` and a synchronous `flush`. Original phases below for historical context, with current status.

### Phase 1 (done): introduce the scheduler

- `ParseScheduler` owns the parse cache. Exposes `schedule(version, source)`, `current()`, `flush()`.
- Lives in `parse-scheduler.ts`. Constructed eagerly in `EditorModel` with the initial source.

### Phase 2 (done): split consumers

- Snapshot-tolerant: `isMarkable`, `markableLines`, `toggleMarker` all read `scheduler.current()` — possibly stale, silently no-op on click during the lag window.
- Version-strict: `parseProgram` calls `scheduler.flush()` first, then `current()`. The runner always gets the latest parse.

Originally framed as `parsedFor(version)` returning a Promise. Turned out unnecessary — `flush()` is synchronous, and the version-strict consumers (run/step) are deliberate user actions that don't need async coordination at our scale.

### Phase 3 (done): defer the parse

- `schedule` cancels and re-arms a 200ms timer rather than parsing inline.
- During the debounce window, `current()` returns the previous committed result.
- React renders rebuild hint decorations from stale `markableLines()` — invisible because the user is still typing.
- `flush()` short-circuits the timer when a runner consumer needs freshness.

### Phase 4 (optional, far future): worker-side parser

- The only structural change left. If parse cost grows enough to matter, move parsing to a worker.
- `flush` becomes async (`await flushAsync()` at call sites that need fresh data). Snapshot-tolerant consumers don't change.
- For startlang's scale this is speculative — main-thread parsing is currently sub-ms.

## Open Questions

- **Click handling during staleness.** Confirmed: silent no-op is fine. The click handler reads `markableLines` from the snapshot and only acts if the line is in it.
- **Diagnostics during staleness.** Currently the syntax validator runs independently; it can stay sync or move behind the scheduler in Phase 2. TBD whether diagnostics need their own pipeline or piggyback on the parse result.
- **`useDeferredValue` vs. explicit scheduler.** React 18's `useDeferredValue` solves the React-side defer for free. The async parse scheduler is a separate concern (decouples *parsing* from React entirely, not just rendering). Both are useful; the scheduler is the structural fix, `useDeferredValue` could layer on top.

## Non-Issues (verified)

- **`mapMarkers` identity across parses.** `parseProgram()` returns a matched `{program, markerMap}` pair. The interpreter resets in `prepareToRun` and only holds nodes from the currently-running program. A new parse committing mid-run updates what the *next* run picks up but doesn't touch the running interpreter — the matched pair invariant is preserved without explicit work.
- **Editor state holds no `Node` references.** As of the prep work for this refactor, `EditorHighlight` carries `lineNumber` (not `node`), and `highlightLine(lineNumber, kind?)` is the action. The only place `Node` flows in is at the call sites in `start-environment.ts`, which extract `.location.start.line` immediately and don't retain the reference. So nothing in editor state can outlive the parse it came from.

## Non-Goals

- Switching to a different parser. Peggy stays.
- Incremental parsing (tree-sitter-style). Full re-parse per version is fine for startlang's scale.
- Worker-side parsing in the initial implementation.

## Related

- `editor-model.ts` — primary site of change.
- `editor-context.tsx` — `useSyncExternalStore` already subscribes to model snapshots; only the snapshot shape changes.
- `editor.tsx` — hint decoration loop reads `markableLines` from snapshot, unchanged in spirit.
- `interpreter.ts` / `runProgram` path — needs the `parsedFor(version)` integration.
