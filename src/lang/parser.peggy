{{
/* eslint-disable */
import {
  BeginNode,
  BinaryOpNode,
  BlockNode,
  BreakNode,
  CallNode,
  ExitNode,
  ForInNode,
  ForNode,
  IfNode,
  LetIndexNode,
  LetNode,
  ListNode,
  LiteralNode,
  LogicalOpNode,
  LogicalNotNode,
  NextNode,
  RepeatNode,
  ReturnNode,
  TableNode,
  TemplateStringNode,
  UnaryOpNode,
  VarIndexNode,
  VarNode,
  WhileNode
} from './nodes';
}}

{
  // take a series of tests, and (optionally) a final else body, and construct an if-tree
  function buildIfTree(tests, elseBody) {
    const [condition, thenBody] = tests.shift();
    if (tests.length > 0) {
      // insert the next-level tree into the false slot
      elseBody = buildIfTree(tests, elseBody);
    }
    return new IfNode(condition, thenBody, elseBody);
  }

  // take a chain of equal-precedence exprs and construct a left-folding tree
  function buildBinaryExpr(left, rest) {
    if (rest.length === 0) {
      return left;
    } else {
      const [operator, right] = rest.shift();
      const node = new BinaryOpNode(operator, left, right);
      return buildBinaryExpr(node, rest);
    }
  }

  function buildLogicalExpr(left, rest) {
    if (rest.length === 0) {
      return left;
    } else {
      const [operator, right] = rest.shift();
      const node = new LogicalOpNode(operator, [left, right]);
      return buildLogicalExpr(node, rest);
    }
  }

  // take a chain of unary ops and construct a right-folding tree
  function buildUnaryExpr(ops, right) {
    if (ops.length === 0) {
      return right;
    } else {
      const operator = ops.pop();
      const node = new UnaryOpNode(operator, right);
      return buildUnaryExpr(ops, node);
    }
  }

  // take a series of string segments and construct a template string node
  // (or a literal node if there's just a single string segment)
  function buildString(segments) {
    if (
      segments.length === 1 &&
      segments[0] instanceof LiteralNode &&
      typeof segments[0].value === 'string'
    ) {
      return segments[0];
    } else {
      return new TemplateStringNode(segments);
    }
  }

  // take a base name, indexes, and (optionally) a value, and construct a
  // var-index or let-index node
  function buildIndex(name, indexes, value) {
    if (value === undefined) {
      return new VarIndexNode(name, indexes);
    } else {
      return new LetIndexNode(name, indexes, value);
    }
  }
}

// Grammar

start
  = EOL?
    block:Block
    { return block }

// Top-level

Block
  = elems:(__ @BlockElement EOL)*
    { return elems.length === 1 ? elems[0] : new BlockNode(elems) }

BlockElement
  = Control
  / Statement

Control
  = If
  / Repeat
  / For
  / While
  / Begin

If
  // one-line if/then[/else]
  = 'if' WB __ cond:Value __ 'then' WB __ tbody:Statement
      fbody:(__ 'else' WB __ @Statement)?
    { return buildIfTree([[cond, tbody]], fbody) }
  // multi-line if/then[/else if/...][/else]
  / 'if' WB __ cond:Value __ 'then' WB __ EOL tbody:Block
      tests:(__ 'else' WB __ 'if' WB __ @Value __ 'then' WB __ EOL @Block)*
      fbody:(__ 'else' WB __ EOL @Block)?
      __ 'end'
    { return buildIfTree([[cond, tbody], ...tests], fbody) }

Repeat
  // repeat 10
  = 'repeat' WB __ times:Value __ 'do' WB __ body:EndBody
    { return new RepeatNode(times, body) }
  // repeat (forever)
  / 'repeat' WB __ 'do' WB __ body:EndBody
    { return new RepeatNode(null, body) }

For
  // for i from a to b by c
  = 'for' WB __ name:Symbol __ 'from' WB __ initial:Value __ 'to' WB __ limit:Value
      step:(__ 'by' WB __ @Value)? __ 'do' WB __ body:EndBody
    { return new ForNode(name, initial, limit, step, body) }
  // for i in x
  / 'for' WB __ name:Symbol __ 'in' WB __ iterable:Value __ 'do' WB __ body:EndBody
    { return new ForInNode(name, iterable, body) }

While
  = 'while' WB __ condition:Value __ 'do' WB __ body:EndBody
    { return new WhileNode(condition, body) }

Begin
  = 'begin' WB __ name:Symbol
      params:(__ '(' EOL? __ @Params? __ ')')? __ 'do' WB __ body:EndBody
    { return new BeginNode(name, params ?? [], body) }

EndBody
  = Statement
  / EOL block:Block __ 'end'
    { return block }

Params
  = first:Symbol rest:(__ ',' __ EOL? __ @Symbol)*
    { return [first, ...rest] }

Statement
  = Flow
  / Let
  / Call

Flow
  = 'exit' WB
    { return new ExitNode() }
  / 'break' WB
    { return new BreakNode() }
  / 'next' WB
    { return new NextNode() }
  / 'return' WB result:(__ @Value)?
    { return new ReturnNode(result ?? null) }

Let
  = 'local' WB __ name:Symbol __ '=' __ value:Value
    { return new LetNode(name, value, true) }
  / ('let' WB)? __ name:Symbol __ indexes:Indexes? __ '=' __ value:Value
    {
      return (
        indexes
          ? buildIndex(name, indexes, value)
          : new LetNode(name, value, false)
        )
    }

Call
  // if we match non-parenthesized args optionally right away, it will
  // never get past the first rule, so...
  //  1- try to match one or more non-parenthesized arguments first
  //      - this fixes the case of "print (1+2)/3"
  //  2- try to match zero or more parenthesized arguments
  //  3- match a bare call with no parens or args
  = name:Symbol __ args:Values
    { return new CallNode(name, args) }
  / name:Symbol __ '(' __ EOL? __ args:Values? __ ')'
    { return new CallNode(name, args ?? []) }
  / name:Symbol
    { return new CallNode(name, []) }

// Values

Values
  = first:Value rest:(__ ',' __ EOL? __ @Value)*
    { return [first, ...rest] }

Value 'a value'
  = ConjExpr

// Conditions

ConjExpr
  = first:NotExpr rest:(__ @ConjOp __ @NotExpr)*
    { return buildLogicalExpr(first, rest) }

ConjOp
  = 'and' WB
    { return 'and' }
  / 'or' WB
    { return 'or' }

NotExpr
  = op:NotOp __ right:RelExpr
    { return new LogicalNotNode(right) }
  / RelExpr

NotOp
  = 'not' WB
    { return 'not' }

RelExpr
  = left:ConcatExpr __ operator:RelOp __ right:ConcatExpr
    { return new BinaryOpNode(operator, left, right) }
  / ConcatExpr

RelOp
  = '='
  / '!='
  / '<='
  / '<'
  / '>='
  / '>'

// Concatenation

ConcatExpr
  = first:AddExpr rest:(__ @ConcatOp __ @AddExpr)*
    { return buildBinaryExpr(first, rest) }

ConcatOp
  = '::'

// Math

AddExpr
  = first:MultExpr rest:(__ @AddOp __ @MultExpr)*
    { return buildBinaryExpr(first, rest) }

AddOp
  = '+'
  / '-'

MultExpr
  = first:PowExpr rest:(__ @MultOp __ @PowExpr)*
    { return buildBinaryExpr(first, rest) }

MultOp
  = '*'
  / '/'
  / '%'

PowExpr
  = first:UnaryExpr rest:(__ @PowOp __ @UnaryExpr)*
    { return buildBinaryExpr(first, rest) }

PowOp
  = '^'

UnaryExpr
  = ops:(__ @UnaryOp)* __ right:ListExpr
    { return buildUnaryExpr(ops, right) }

UnaryOp
  = '+'
  / '-'

// Lists and Tables

ListExpr
  = '[' __ values:Values? __ ']'
    { return new ListNode(values ?? []) }
  / TableExpr

Pair = key:Symbol __ '=' __ value:Value
  { return { key, value } }

Pairs = first:Pair rest:(__ ',' __ EOL? __ @Pair)*
  { return [first, ...rest] }

TableExpr
  = '{' __ pairs:Pairs? __ '}'
    { return new TableNode(pairs ?? []) }
  / CallExpr

// Invocation

CallExpr
  = name:Symbol __ '(' __ EOL? __ args:Values? __ ')'
    { return new CallNode(name, args ?? []) }
  / IndexExpr

// Indexes

IndexExpr
  = name:Symbol __ indexes:Indexes?
    {
      return (
        indexes
          ? buildIndex(name, indexes)
          : new VarNode(name)
      )
    }
  / PrimaryExpr

Indexes
  = first:IndexSegment rest:(__ @IndexSegment)*
    // flatten segments into a single chain of indexes
    { return [first, ...rest].flat() }

IndexSegment
  = '[' __ first:Value rest:(__ ',' __ @Value)* __ ']'
    // allow successive indexes separated by commas, e.g. lst[0,1,2]
    { return [first, ...rest] }
  / '.' __ name:Symbol
    // segment consisting of one literal node
    { return [new LiteralNode(name)] }

PrimaryExpr
  = String
  / Literal
  / '(' __ val:Value __ ')'
    { return val }

// Strings

String 'a string'
  = '"' segments:StringSegment* '"'
    {
      return buildString(segments);
    }

StringSegment
  = chars:Char+
    { return new LiteralNode(chars.join('')) }
  / "{" __ val:Value __ "}"
    // interpolation of value expressions
    { return val }

Char
  = '""'
    { return '"' }
  / '{{'
    { return "{" /*}*/ }
  / '}}'
    { return /*{*/ '}' }
  / '{}'
    { return '{}' }
  / [^"{}]

// Data

Literal
  = None
  / Boolean
  / Number

None
  = 'none' WB
    { return new LiteralNode(null) }

Boolean
  = 'true'  WB
    { return new LiteralNode(true) }
  / 'false' WB
    { return new LiteralNode(false) }

Number 'a number'
  = 'infinity' WB
    { return new LiteralNode(Infinity) }
  / num:NumberFormat
    { return new LiteralNode(parseFloat(num)) }

NumberFormat
  = $(Digits ('.' Digits)? ([eE] [-+]? Digits)?)

Digits
  = $[0-9]+

// Symbols

Symbol 'a name'
  = $(!Reserved [a-z_]i [a-z0-9_]i*)

Reserved
  = 'none'     WB
  / 'true'     WB
  / 'false'    WB
  / 'infinity' WB
  / 'if'       WB
  / 'then'     WB
  / 'else'     WB
  / 'end'      WB
  / 'repeat'   WB
  / 'do'       WB
  / 'for'      WB
  / 'from'     WB
  / 'to'       WB
  / 'by'       WB
  / 'in'       WB
  / 'while'    WB
  / 'begin'    WB
  / 'exit'     WB
  / 'break'    WB
  / 'next'     WB
  / 'return'   WB
  / 'let'      WB
  / 'and'      WB
  / 'or'       WB
  / 'not'      WB

// Whitespace

WB
  = ![a-z_]i

__ 'whitespace'
  = [ \t]* (';' [^\n]*)?

EOL 'end of line'
  = (__ '\n')+
