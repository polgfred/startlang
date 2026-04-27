export const propNamespaces = Object.freeze({
  shape: Object.freeze([
    'opacity',
    'anchor',
    'rotate',
    'fill.color',
    'stroke.color',
    'stroke.width',
    'scale.x',
    'scale.y',
  ]),
  text: Object.freeze(['font.name', 'font.size']),
  stack: Object.freeze(['direction', 'align', 'justify']),
  value: Object.freeze(['variant']),
});

export type PropNamespace = keyof typeof propNamespaces;

export type PropContext = readonly PropNamespace[];

export const propContexts = Object.freeze({
  none: Object.freeze([]),
  shape: Object.freeze(['shape']),
  text: Object.freeze(['shape', 'text']),
  stack: Object.freeze(['stack']),
  value: Object.freeze(['value']),
  graphics: Object.freeze(['shape', 'text']),
  cells: Object.freeze(['stack', 'value']),
  root: Object.freeze(['shape', 'text', 'stack', 'value']),
} satisfies Record<string, PropContext>);

export type CanonicalProps = Readonly<Record<string, unknown>>;

function getNamespaceKeySet(namespace: PropNamespace) {
  return new Set<string>(propNamespaces[namespace]);
}

const propKeySets = Object.freeze({
  shape: getNamespaceKeySet('shape'),
  text: getNamespaceKeySet('text'),
  stack: getNamespaceKeySet('stack'),
  value: getNamespaceKeySet('value'),
} satisfies Record<PropNamespace, ReadonlySet<string>>);

function getExplicitNamespace(key: string) {
  const [namespace, ...rest] = key.split('.');
  if (namespace in propNamespaces && rest.length > 0) {
    return [namespace as PropNamespace, rest.join('.')] as const;
  }
  return null;
}

export function resolvePropKey(key: string, context: PropContext) {
  const explicit = getExplicitNamespace(key);

  if (explicit) {
    const [namespace, propName] = explicit;
    if (!context.includes(namespace)) {
      throw new Error(`unknown property "${key}"`);
    }
    if (!propKeySets[namespace].has(propName)) {
      throw new Error(`invalid ${namespace} property: ${propName}`);
    }
    return key;
  }

  const matches = context.filter((namespace) =>
    propKeySets[namespace].has(key)
  );

  if (matches.length === 1) {
    return `${matches[0]}.${key}`;
  }

  if (matches.length > 1) {
    const choices = matches.map((namespace) => `"${namespace}.${key}"`);
    throw new Error(
      `ambiguous property "${key}"; use ${choices.join(' or ')}`
    );
  }

  throw new Error(`unknown property "${key}"`);
}

export function normalizeProps(
  props: Readonly<Record<string, unknown>>,
  context: PropContext
): CanonicalProps {
  return Object.fromEntries(
    Object.entries(props).map(([key, value]) => [
      resolvePropKey(key, context),
      value,
    ])
  );
}

export function selectProps(
  props: CanonicalProps,
  namespace: PropNamespace
) {
  const prefix = `${namespace}.`;
  return Object.fromEntries(
    Object.entries(props)
      .filter(([key]) => key.startsWith(prefix))
      .map(([key, value]) => [key.slice(prefix.length), value])
  );
}
