import type { Interpreter } from '../interpreter.js';
import type { CallNode, Frame } from '../nodes/index.js';
import type {
  ArgsType,
  ListType,
  RecordType,
  RuntimeFunction,
} from '../types.js';

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

type Literal = string | number | boolean | null;

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

  literal<const Values extends readonly Literal[]>(
    ...values: Values
  ): TypeSpec<Values[number]> {
    const allowed = new Set<Literal>(values);
    return make(values.map(String).join('|'), (v): v is Values[number] =>
      allowed.has(v as Literal)
    );
  },

  optional<U>(spec: TypeSpec<U>): TypeSpec<U | undefined> {
    return {
      name: spec.name,
      check: (v): v is U | undefined => v === undefined || spec.check(v),
      optional: true,
    };
  },

  oneOf<Specs extends readonly TypeSpec[]>(
    ...specs: Specs
  ): TypeSpec<ValueOf<Specs[number]>> {
    return make(
      specs.map((s) => s.name).join('|'),
      (v): v is ValueOf<Specs[number]> => specs.some((s) => s.check(v))
    );
  },
};

export type Signature = {
  readonly params: readonly TypeSpec[];
  readonly impl: (
    interpreter: Interpreter,
    args: ArgsType,
    node: CallNode
  ) => Frame | void;
};

export function signature<const S extends readonly TypeSpec[]>(
  params: S,
  impl: (
    interpreter: Interpreter,
    args: ValuesOf<S>,
    node: CallNode
  ) => Frame | void
): Signature {
  return {
    params,
    impl: impl as Signature['impl'],
  };
}

function matchesSignature(
  signature: Signature,
  args: ArgsType
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
  args: ArgsType
): string {
  const parts = args.map((a) => interpreter.getHandler(a).typeName);
  return `(${parts.join(', ')})`;
}

function validateSignature(
  signature: Signature,
  interpreter: Interpreter,
  args: ArgsType
): void {
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
}

export function define<const S extends readonly TypeSpec[]>(
  params: S,
  impl: (
    interpreter: Interpreter,
    args: ValuesOf<S>,
    node: CallNode
  ) => Frame | void
): RuntimeFunction {
  return defineOverloads(signature(params, impl));
}

const emptyRecord: RecordType = Object.freeze(Object.create(null));

export function defineWithProps<const S extends readonly TypeSpec[]>(
  positional: S,
  impl: (
    interpreter: Interpreter,
    props: RecordType,
    args: ValuesOf<S>,
    node: CallNode
  ) => Frame | void
): RuntimeFunction {
  return defineOverloads(
    signature(positional, (interp, args, node) =>
      impl(interp, emptyRecord, args, node)
    ),
    signature([T.record, ...positional], (interp, [props, ...args], node) =>
      impl(interp, props, args, node)
    )
  );
}

export function defineOverloads(...signatures: Signature[]): RuntimeFunction {
  if (signatures.length === 0) {
    throw new Error('defineOverloads requires at least one signature');
  }
  return (interpreter, args, node) => {
    for (const s of signatures) {
      if (matchesSignature(s, args)) {
        return s.impl(interpreter, args, node);
      }
    }
    if (signatures.length === 1) {
      validateSignature(signatures[0], interpreter, args);
    } else {
      const expected = signatures.map(describeSignature).join(' | ');
      const got = describeArgs(interpreter, args);
      throw new Error(
        `no matching signature, expected ${expected}, got ${got}`
      );
    }
  };
}
