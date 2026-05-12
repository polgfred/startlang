import type { Interpreter } from '../interpreter.js';
import type { CallNode, Frame } from '../nodes/index.js';
import type { ListType, RecordType, RuntimeFunction } from '../types.js';

export type TypeSpec<T = unknown> = {
  readonly name: string;
  readonly check: (value: unknown) => value is T;
  readonly optional?: boolean;
};

export type ValueOf<S> = S extends TypeSpec<infer T> ? T : never;

export type ValuesOf<S extends readonly TypeSpec[]> = {
  [K in keyof S]: ValueOf<S[K]>;
};

function make<T>(
  name: string,
  check: (value: unknown) => value is T
): TypeSpec<T> {
  return { name, check };
}

export const T = {
  number: make('number', (v): v is number => typeof v === 'number'),
  string: make('string', (v): v is string => typeof v === 'string'),
  boolean: make('boolean', (v): v is boolean => typeof v === 'boolean'),
  list: make('list', (v): v is ListType => Array.isArray(v)),
  record: make(
    'record',
    (v): v is RecordType =>
      typeof v === 'object' && v !== null && !Array.isArray(v)
  ),
  any: make('any', (_v): _v is unknown => true),
};

export function optional<T>(spec: TypeSpec<T>): TypeSpec<T | undefined> {
  return {
    name: spec.name,
    check: (v): v is T | undefined => v === undefined || spec.check(v),
    optional: true,
  };
}

export function oneOf<Specs extends readonly TypeSpec[]>(
  ...specs: Specs
): TypeSpec<ValueOf<Specs[number]>> {
  return make(
    specs.map((s) => s.name).join('|'),
    (v): v is ValueOf<Specs[number]> => specs.some((s) => s.check(v))
  );
}

export type Signature = {
  readonly params: readonly TypeSpec[];
  readonly impl: (
    interpreter: Interpreter,
    args: readonly unknown[]
  ) => Frame | void;
};

export function signature<const S extends readonly TypeSpec[]>(
  params: S,
  impl: (interpreter: Interpreter, args: ValuesOf<S>) => Frame | void
): Signature {
  return {
    params,
    impl: impl as Signature['impl'],
  };
}

function matchesSignature(
  signature: Signature,
  args: readonly unknown[]
): boolean {
  const required = signature.params.filter((s) => !s.optional).length;
  const max = signature.params.length;
  if (args.length < required || args.length > max) return false;
  for (let i = 0; i < args.length; i++) {
    if (!signature.params[i].check(args[i])) return false;
  }
  return true;
}

function describeSignature(signature: Signature): string {
  const parts = signature.params.map((s) =>
    s.optional ? `${s.name}?` : s.name
  );
  return `(${parts.join(', ')})`;
}

function describeArgs(
  interpreter: Interpreter,
  args: readonly unknown[]
): string {
  const parts = args.map((a) => interpreter.getHandler(a).typeName);
  return `(${parts.join(', ')})`;
}

function invoke(
  signature: Signature,
  interpreter: Interpreter,
  args: readonly unknown[]
): Frame | void {
  const required = signature.params.filter((s) => !s.optional).length;
  const max = signature.params.length;
  if (args.length < required || args.length > max) {
    const expected = required === max ? `${required}` : `${required}-${max}`;
    throw new Error(`expected ${expected} argument(s), got ${args.length}`);
  }
  for (let i = 0; i < args.length; i++) {
    const spec = signature.params[i];
    if (!spec.check(args[i])) {
      const actual = interpreter.getHandler(args[i]).typeName;
      throw new Error(
        `argument ${i + 1} should be ${spec.name}, got ${actual}`
      );
    }
  }
  return signature.impl(interpreter, args);
}

export function define<const S extends readonly TypeSpec[]>(
  params: S,
  impl: (interpreter: Interpreter, args: ValuesOf<S>) => Frame | void
): RuntimeFunction {
  return defineOverloads(signature(params, impl));
}

export function defineOverloads(...signatures: Signature[]): RuntimeFunction {
  if (signatures.length === 0) {
    throw new Error('defineOverloads requires at least one signature');
  }
  return (
    interpreter: Interpreter,
    args: readonly unknown[],
    _node: CallNode
  ) => {
    if (signatures.length === 1) {
      return invoke(signatures[0], interpreter, args);
    }
    for (const s of signatures) {
      if (matchesSignature(s, args)) {
        return s.impl(interpreter, args);
      }
    }
    const expected = signatures.map(describeSignature).join(' | ');
    const got = describeArgs(interpreter, args);
    throw new Error(`no matching signature, expected ${expected}, got ${got}`);
  };
}
