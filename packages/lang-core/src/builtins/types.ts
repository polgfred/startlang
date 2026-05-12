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

export function define<const S extends readonly TypeSpec[]>(
  params: S,
  impl: (interpreter: Interpreter, args: ValuesOf<S>) => Frame | void
): RuntimeFunction {
  const required = params.filter((s) => !s.optional).length;
  const max = params.length;
  return (
    interpreter: Interpreter,
    args: readonly unknown[],
    _node: CallNode
  ) => {
    if (args.length < required || args.length > max) {
      const expected = required === max ? `${required}` : `${required}-${max}`;
      throw new Error(`expected ${expected} argument(s), got ${args.length}`);
    }
    for (let i = 0; i < args.length; i++) {
      const spec = params[i];
      if (!spec.check(args[i])) {
        const actual = interpreter.getHandler(args[i]).typeName;
        throw new Error(
          `argument ${i + 1} should be ${spec.name}, got ${actual}`
        );
      }
    }
    return impl(interpreter, args as ValuesOf<S>);
  };
}
