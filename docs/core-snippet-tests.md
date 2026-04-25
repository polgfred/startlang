# Core Snippet Tests

The core interpreter should get a broad set of behavior tests written as small START programs. These tests should assert observable outcomes instead of inspecting frame internals.

## Goal

Exercise the real language pipeline:

1. Parse a short source snippet.
2. Run it through `Interpreter`.
3. Assert final variables, `lastResult`, suspensions, or calls into test globals.

This protects the frame stack, `swapFrame()` transitions, namespace behavior, control flow, runtime dispatch, and parser wiring without tying tests to frame state numbers.

## Test Harness Shape

Create a core test helper that registers normal runtime globals and optional test globals:

```ts
async function runSnippet(
  source: string,
  globals: RuntimeFunctions = {}
) {
  const interpreter = new Interpreter();
  interpreter.registerGlobals(runtimeGlobals);
  interpreter.registerGlobals(globals);

  const result = await interpreter.run(parse(`${source}\n`));

  if (result.status !== 'completed') {
    throw new Error(`unexpected suspension: ${result.suspension.kind}`);
  }

  return interpreter;
}
```

For output-style assertions, bind a spy function directly into the interpreter:

```ts
const calls: unknown[][] = [];

await runSnippet(
  `
  spy 1
  spy 2 + 3
  repeat 2 do spy "hi"
  `,
  {
    spy(_interpreter, args) {
      calls.push(args);
    },
  }
);

expect(calls).toEqual([[1], [5], ['hi'], ['hi']]);
```

This is the preferred pattern: a tiny program interacts with a tiny host function, and the test asserts that interaction.

## First Test Categories

- Literals and arithmetic:
  - unary/binary operators
  - precedence
  - string interpolation

- Variables and namespaces:
  - `let`
  - assignment inside loops
  - global vs local function scope

- Lists and records:
  - construction
  - index get/set
  - method dispatch: `len`, `keys`, `range`, `join`, `split`

- Control flow:
  - `if` / `else if` / `else`
  - `repeat`
  - `while`
  - numeric `for`
  - `for in`
  - `break`
  - `next`
  - `exit`

- Functions:
  - `begin`
  - parameters
  - `return`
  - local namespace cleanup after calls
  - nested calls

- Suspensions and resume:
  - `input`
  - breakpoint suspension
  - resume into the correct expression/frame

- Snapshots:
  - explicit `snapshot`
  - marker-triggered snapshots
  - restore during/after loops

## Example Tests

```ts
it('runs numeric for loops', async () => {
  const interpreter = await runSnippet(`
    let total = 0
    for i = 1 to 3 do
      let total = total + i
    end
  `);

  expect(interpreter.getVariable('total')).toBe(6);
});
```

```ts
it('handles next', async () => {
  const calls: unknown[][] = [];

  await runSnippet(
    `
    for i = 1 to 4 do
      if i = 2 then next
      spy i
    end
    `,
    {
      spy(_interpreter, args) {
        calls.push(args);
      },
    }
  );

  expect(calls).toEqual([[1], [3], [4]]);
});
```

```ts
it('cleans up local function namespaces', async () => {
  const interpreter = await runSnippet(`
    begin setLocal()
      let x = 2
    end

    let x = 1
    setLocal
  `);

  expect(interpreter.getVariable('x')).toBe(1);
});
```

## Notes

- Prefer observable language behavior over direct frame inspection.
- Keep snippets short. Each test should teach one behavior.
- Use custom test globals instead of browser host behavior for core tests.
- Add browser-host tests only when the behavior depends on presentation output.
