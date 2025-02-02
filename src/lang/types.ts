interface BlockNode {
  type: 'block';
  elems: StatementNode[];
}

interface BlockFrame {
  node: BlockNode;
  count: number;
}

interface RepeatNode {
  type: 'repeat';
  times?: ExpressionNode;
  body: StatementNode;
}

interface RepeatFrame {
  node: RepeatNode;
  state: number;
  times?: number;
  count: number;
}

interface ForNode {
  type: 'for';
  name: string;
  from: ExpressionNode;
  to: ExpressionNode;
  by: ExpressionNode;
  body: StatementNode;
}

interface ForFrame {
  node: ForNode;
  state: number;
  name: string;
  from: number;
  to: number;
  by: number;
  count: number;
}

interface ForInNode {
  type: 'forIn';
  name: string;
  range: ExpressionNode;
  body: StatementNode;
}

interface ForInFrame {
  node: ForInNode;
  state: number;
  iter: Iterable<any>;
}

interface WhileNode {
  type: 'while';
  cond: ExpressionNode;
  body: StatementNode;
}

interface WhileFrame {
  node: WhileNode;
  state: number;
}

interface IfNode {
  type: 'if';
  cond: ExpressionNode;
  tbody: StatementNode;
  fbody?: StatementNode;
}

interface IfFrame {
  node: IfNode;
  state: number;
}

interface BeginNode {
  type: 'begin';
  name: string;
  body: StatementNode;
}

interface BeginFrame {
  node: BeginNode;
}

interface CallNode {
  type: 'call';
  name: string;
  args: ExpressionNode[];
}

interface CallFrame {
  node: CallNode;
  state: number;
  args: any[];
  refs: Array<
    | {
        name: string;
        indexes: (number | string)[];
      }
    | undefined
  >;
  count: number;
  ns: boolean;
}

interface ExitNode {
  type: 'exit';
}

interface ExitFrame {
  node: ExitNode;
}

interface BreakNode {
  type: 'break';
}

interface BreakFrame {
  node: BreakNode;
}

interface NextNode {
  type: 'next';
}

interface NextFrame {
  node: NextNode;
}

interface ReturnNode {
  type: 'return';
  result?: ExpressionNode;
}

interface ReturnFrame {
  node: ReturnNode;
  state: number;
}

interface LetNode {
  type: 'let';
  name: string;
  value: ExpressionNode;
  local: boolean;
}

interface LetFrame {
  node: LetNode;
  state: number;
}

interface LetIndexNode {
  type: 'letIndex';
  name: string;
  indexes: ExpressionNode[];
  value: ExpressionNode;
}

interface LetIndexFrame {
  node: LetIndexNode;
  state: number;
  indexes: any[];
  count: number;
}

interface LiteralNode {
  type: 'literal';
  value: any;
}

interface VarNode {
  type: 'var';
  name: string;
}

interface IndexNode {
  type: 'index';
  name: string;
  indexes: ExpressionNode[];
}

interface IndexFrame {
  node: IndexNode;
  state: number;
  indexes: (number | string)[];
  count: number;
}

interface LogicalOpNode {
  type: 'logicalOp';
  op: 'and' | 'or' | 'not';
  left: ExpressionNode;
  right: ExpressionNode;
}

interface LogicalOpFrame {
  node: LogicalOpNode;
  state: number;
}

interface BinaryOpNode {
  type: 'binaryOp';
  op:
    | '+'
    | '-'
    | '*'
    | '/'
    | '%'
    | '&'
    | '|'
    | '~'
    | '='
    | '!='
    | '<'
    | '<='
    | '>'
    | '>=';
  left: ExpressionNode;
  right: ExpressionNode;
}

interface BinaryOpFrame {
  node: BinaryOpNode;
  state: number;
  left: any;
}

interface UnaryOpNode {
  type: 'binaryOp';
  op: '+' | '-' | '~';
  right: ExpressionNode;
}

interface UnaryOpFrame {
  node: UnaryOpNode;
  state: number;
}

type StatementNode =
  | BlockNode
  | RepeatNode
  | ForNode
  | ForInNode
  | WhileNode
  | IfNode
  | BeginNode
  | CallNode
  | ExitNode
  | BreakNode
  | NextNode
  | ReturnNode
  | LetNode
  | LetIndexNode;

type ExpressionNode =
  | LiteralNode
  | VarNode
  | IndexNode
  | LogicalOpNode
  | BinaryOpNode
  | UnaryOpNode;
