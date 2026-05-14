declare module '*.peggy' {
  import { Program } from '@startlang/lang-core/program';
  export function parse(source: string): Program;
}

declare module '*.start' {
  const source: string;
  export default source;
}
