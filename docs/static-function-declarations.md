# Static Function Declarations

## Goal

`begin` statements should be extracted at parse time into a static global
function map, not registered at runtime as a side effect of execution. This
removes runtime function redefinition (and the parts of the interpreter that
support it) and makes the program's function table a property of the parse
tree rather than a property of execution history.

## Why

Previously, `begin foo do … end` was a regular statement in the `BlockElement`
union. At runtime, `BeginFrame.visit()` mutated `interpreter.globalFunctions`
via `defineGlobalFunction`. This meant:

- Functions could appear anywhere a statement could (inside `if`, `while`,
  `for`, even inside other `begin` bodies).
- Re-executing a `begin` statement (e.g. inside a loop) silently redefined the
  function.
- The set of available functions was a function of execution order, not source
  structure.

The language is meant to be a beginner language with a simple mental model:
"functions are declared at the top, statements below." The runtime-registration
shape didn't match that mental model, and the carve-out below makes the model
the literal grammar shape.

## Design

`begin` was lifted out of the inner statement union into a top-level-only
production. The parser produces a new `Program` type (not a `Node`) with the
shape:

```ts
class Program {
  readonly functions: Readonly<Record<string, BeginNode>>;
  readonly main: BlockNode;
}
```

Grammar:

```
start = EOL? @Program

Program
  = elems:(_ @ProgramElement EOL)* { return buildProgram(elems); }

ProgramElement
  = BeginBlock
  / BlockElement

ControlBlock = IfBlock / RepeatBlock / ForBlock / WhileBlock  // BeginBlock removed
```

`buildProgram` (in the parser initializer block) partitions elements into the
function map and main block, erroring at parse time on duplicate names with
the offending `begin`'s source location.

Consequences:

- Nested `begin` is a parse error — `BeginBlock` no longer appears anywhere
  inside `BlockElement`, so it can't form. No post-parse validation needed.
- Duplicate `begin foo` inside one source is a parse error with a precise
  location.
- Top-level order is free: `begin`s and statements can intermix in source, and
  the parser sorts them. A call to `foo` before its `begin` works.
- `Interpreter.run(program)` seeds `globalFunctions` from `program.functions`
  in one step, then runs `program.main`. `runIncremental` merges (last-write-
  wins) so REPL incremental compilation still composes.
- `BeginFrame`, `defineGlobalFunction`, and the immer-`produce` machinery
  around globalFunctions are deleted.

Related: see `feedback_grammar_enforces_structure` memory.

## Files Touched

- New: `packages/lang-core/src/program.ts`
- Grammar: `packages/lang-core/src/parser.peggy`
- Runtime: `packages/lang-core/src/interpreter.ts`,
  `packages/lang-core/src/nodes/begin.ts` (BeginFrame removed)
- Editor: `packages/lang-core/src/editor-markers.ts`,
  `packages/lang-core/src/editor-model.ts`
- Type declarations: three `global.d.ts` files updated for `parse(): Program`
- Tool & test call sites: lang-core/lang-browser `tools/script.ts`,
  `tests/markers.test.ts`, `apps/web/src/start-environment.ts`

## Warts to Revisit

### 1. `BeginNode.makeFrame()` throws

`BeginNode` no longer participates in execution — it lives only in
`Program.functions`. But `Node` declares `makeFrame()` abstract, so the only
way to keep `BeginNode` as a `Node` is to override it with a throw:

```ts
makeFrame(): Frame {
  throw new Error(
    'BeginNode is a static declaration and cannot be executed as a frame'
  );
}
```

The underlying issue is that `Node` overloads two concepts: "data the parser
emits" and "something the interpreter executes." Most nodes satisfy both;
`BeginNode` only satisfies the first. Today that misalignment lives as a
defensive throw in one subclass.

**Status: deferred, defensive throw is fine.** There's no way to reach the
throw — nothing pushes a `BeginNode` as a frame — so it's purely a
type-system seam.

**When this is worth revisiting:** the next time we add another parser-emitted
construct that isn't executable (top-level constants, type declarations,
imports, etc.). At that point introduce a `Declaration` base:

```ts
abstract class Declaration extends Node {
  makeFrame(): Frame {
    throw new Error(`${this.constructor.name} is a declaration, not executable`);
  }
}

class BeginNode extends Declaration { … }
```

This formalizes the category — the throw becomes a property of "this is a
declaration," not boilerplate on each subclass. New declaration types
inherit it for free. Until there's a second declaration, introducing
`Declaration` would just be ceremony.

See memory `declaration-vs-executable-nodes` for the guiding heuristic.

### 2. Duplicated reset sequence in `run` / `runToNextStatement` / `runIncremental`

**Resolved.** Factored to a private `prepareToRun(program, { incremental })`
helper. The three public entry points now read as one-liners:

```ts
run(program):                this.prepareToRun(program, { incremental: false }); return this.runLoop();
runToNextStatement(program): this.prepareToRun(program, { incremental: false }); return this.runStepping();
runIncremental(program):     this.prepareToRun(program, { incremental: true  }); return this.runLoop();
```

The `incremental` flag bundles two co-occurring behaviors: merge-vs-replace
the function table, and keep-vs-reset the namespace. Both flip together
because they describe the same compilation-unit boundary semantics.

Companion change: `runToNextStatement` and `stepToNextStatement` dropped
their `async`/`try/finally` shape. The flag-toggle/try-finally pattern lives
in a single private `runStepping()` helper, which can be `async` without
rippling — the public callers just return its promise without awaiting.
All four public entry points now have identical
`(...) => Promise<RunResult>` shapes, no `async` sugar at the public level.

### 3. `globalFunctions` field is still mutable

**Resolved.** `globalFunctions` removed from `RuntimeState` —
`captureState`/`restoreState` no longer touch it.

Snapshots are within-run constructs: rewinding to a snapshot from a *previous*
run doesn't make sense because that previous run had a different `Program`
with potentially different functions. The function table is program-level
state, seeded once by `run()` (or merged once by `runIncremental()`), and
restoring the executing program's snapshots never needs to roll it back.

The field stays reassignable on the `Interpreter` (because `runIncremental`
merges across calls), but the snapshot machinery is no longer tangled with it.

### 4. Editor marker walker missed function bodies (fixed post-spike)

**Resolved.** When the parser's top-level changed from `BlockNode` to
`Program`, `buildMarkerLineMap`'s walker bailed out of `visit` on anything
not a `BlockNode` — so function bodies (now reached via `program.functions`,
not as `BeginNode` children of a block) never got their lines claimed.
Breakpoints and snapshots on lines inside a `begin` block silently mapped to
nothing, or got stolen by `program.main`'s line-claim spillover.

Fix: at the end of `buildMarkerLineMap`, iterate `program.functions` and
`visit(fn.body, ...)` for each before visiting `program.main`. Order matters
— `claimedLines` short-circuits later visits, so function bodies must claim
their inner lines first or `main`'s outer span steals them.

Regression covered by a new test in
[markers.test.ts](../packages/lang-core/tests/markers.test.ts) — "maps
marker lines inside a top-level function body to the body statements."

### 5. REPL behavior not interactively verified

The REPL ([packages/lang-core/tools/repl.ts](../packages/lang-core/tools/repl.ts))
was not touched. Its call shape is:

```ts
const node = parse(line);              // now returns Program
await interp.runIncremental(node);     // now takes Program
```

Types line up, and `runIncremental`'s merge semantics give the right
behavior: a `begin foo` typed at a fresh prompt adds `foo` to the existing
function table; a second `begin foo` at a later prompt shadows the first
(last-write-wins). This is a deliberate carve-out from "no runtime
redefinition," justified by "each REPL line is its own compilation unit."

**What's untested:**

- Multi-line `begin … end` continuations across REPL prompts (the REPL
  buffers until parse succeeds; should work, but unexercised).
- That `getGlobalFunctionNames()` (used by `.dump`) returns the merged set,
  not just the most recent line's set. Should — it reads `globalFunctions`
  which is the merged state.

**Action:** spend 5 minutes at the REPL once we care about CLI workflows.

## Open Question: Is `Program` Node-ish Enough To Belong In `nodes/`?

`Program` is produced by the parser and walked by `editor-markers`, which
makes it look like every other AST type. But it doesn't have a `location`,
can't `makeFrame()`, doesn't participate in execution. It currently lives at
`src/program.ts`, exported via `@startlang/lang-core/program`, deliberately
out of `src/nodes/`.

The argument for moving it back into `nodes/` is purely organizational
("everything the parser produces lives here"). The argument for leaving it
out is structural: the `nodes/` directory holds things that extend `Node` and
have `makeFrame`/`location`/etc., and `Program` has none of that. The current
shape preserves the invariant that everything in `nodes/` is an executable
or expression AST node.

No action needed; documented here so the next person to wonder has the
context.
