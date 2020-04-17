import antlr4 from 'antlr4';

import { StartlangLexer } from './StartlangLexer';
import { StartlangParser } from './StartlangParser';
import { StartlangVisitor } from './StartlangVisitor';

export function parse(input) {
  const chars = new antlr4.InputStream(input);
  const lexer = new StartlangLexer(chars);
  const tokens = new antlr4.CommonTokenStream(lexer);

  const parser = new StartlangParser(tokens);
  parser.buildParseTrees = true;

  return parser.prog().accept(new StartlangVisitor());
}
