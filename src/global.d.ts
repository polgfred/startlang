declare module '*.peggy' {
  import { Node } from './lang/nodes/base.js';
  export function parse(source: string): Node;
}

declare module '*.start' {
  const source: string;
  export default source;
}

type UncheckedProps<T> = {
  [K in keyof T]?: unknown;
};
