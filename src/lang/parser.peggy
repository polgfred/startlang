{{
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
    WhileNode,
  } from './nodes/index.js';
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

start = EOL? block:Block { return block; }

// Top-level

Block
  = elems:(_ @BlockElement EOL)* {
      return elems.length === 1 ? elems[0] : new BlockNode(elems);
    }

BlockElement
  = ControlBlock
  / Statement

ControlBlock
  = IfBlock
  / RepeatBlock
  / ForBlock
  / WhileBlock
  / BeginBlock

IfBody = if _ cond:Value _ then EOL body:Block { return [cond, body]; }

IfBlock
  // one-line if/then[/else]
  = if _ cond:Value _ then _ tbody:Statement fbody:(_ else _ @Statement)? {
      return buildIfTree([[cond, tbody]], fbody);
    }
  // if/then[/else if/...][/else]
  / first:IfBody rest:(_ else _ @IfBody)* fbody:(_ else EOL @Block)? _ end {
      return buildIfTree([first, ...rest], fbody);
    }

DoBody
  = do _ statement:Statement { return statement; }
  / do EOL body:Block _ end { return body; }

RepeatBlock
  // repeat 10
  = repeat _ times:Value _ body:DoBody { return new RepeatNode(times, body); }
  // repeat (forever)
  / repeat _ body:DoBody { return new RepeatNode(null, body); }

Range
  = from _ initial:Value _ to _ limit:Value _ step:(_ by _ @Value)? {
      return [initial, limit, step];
    }

ForBlock
  // for i from a to b by c
  = for _ name:Symbol _ range:Range _ body:DoBody {
      const [initial, limit, step] = range;
      return new ForNode(name, initial, limit, step, body);
    }
  // for i in x
  / for _ name:Symbol _ in _ iterable:Value _ body:DoBody {
      return new ForInNode(name, iterable, body);
    }

WhileBlock
  = while _ cond:Value _ body:DoBody { return new WhileNode(cond, body); }

Params
  = first:Symbol rest:(_ "," _ EOL? _ @Symbol)* { return [first, ...rest]; }

BeginBlock
  = begin _ name:Symbol params:(_ "(" EOL? _ @Params? _ ")")? _ body:DoBody {
      return new BeginNode(name, params ?? [], body);
    }

Statement
  = FlowStatement
  / LetStatement
  / CallStatement

FlowStatement
  = exit { return new ExitNode(); }
  / break { return new BreakNode(); }
  / next { return new NextNode(); }
  / return result:(_ @Value)? { return new ReturnNode(result ?? null); }

LetStatement
  = let? _ name:Symbol _ indexes:Indexes? _ "=" _ value:Value {
      return indexes
        ? buildIndex(name, indexes, value)
        : new LetNode(name, value);
    }

CallStatement
  // if we match non-parenthesized args optionally right away, it will
  // never get past the first rule, so...
  //  1- try to match one or more non-parenthesized arguments first
  //      - this fixes the case of "print (1+2)/3"
  //  2- try to match zero or more parenthesized arguments
  //  3- match a bare call with no parens or args
  = name:Symbol _ args:Values { return new CallNode(name, args); }
  / name:Symbol "(" _ EOL? _ args:Values? _ ")" {
      return new CallNode(name, args ?? []);
    }
  / name:Symbol { return new CallNode(name, []); }

// Values

Values = first:Value rest:(_ "," _ EOL? _ @Value)* { return [first, ...rest]; }

Value "a value" = ConjExpr

// Conditions

ConjExpr
  = first:NotExpr rest:(_ @ConjOp _ @NotExpr)* {
      return buildLogicalExpr(first, rest);
    }

ConjOp
  = and { return 'and'; }
  / or { return 'or'; }

NotExpr
  = op:NotOp _ right:RelExpr { return new LogicalNotNode(right); }
  / RelExpr

NotOp = not { return 'not'; }

RelExpr
  = left:ConcatExpr _ operator:RelOp _ right:ConcatExpr {
      return new BinaryOpNode(operator, left, right);
    }
  / ConcatExpr

RelOp
  = "="
  / "!="
  / "<="
  / "<"
  / ">="
  / ">"

// Concatenation

ConcatExpr
  = first:AddExpr rest:(_ @ConcatOp _ @AddExpr)* {
      return buildBinaryExpr(first, rest);
    }

ConcatOp = "::"

// Math

AddExpr
  = first:MultExpr rest:(_ @AddOp _ @MultExpr)* {
      return buildBinaryExpr(first, rest);
    }

AddOp
  = "+"
  / "-"

MultExpr
  = first:PowExpr rest:(_ @MultOp _ @PowExpr)* {
      return buildBinaryExpr(first, rest);
    }

MultOp
  = "*"
  / "/"
  / "%"

PowExpr
  = first:UnaryExpr rest:(_ @PowOp _ @UnaryExpr)* {
      return buildBinaryExpr(first, rest);
    }

PowOp = "^"

UnaryExpr
  = ops:(_ @UnaryOp)* _ right:ListExpr { return buildUnaryExpr(ops, right); }

UnaryOp
  = "+"
  / "-"

// Lists and Tables

ListExpr
  = "[" _ values:Values? _ "]" { return new ListNode(values ?? []); }
  / TableExpr

Pair = key:Symbol _ "=" _ value:Value { return { key, value }; }

Pairs = first:Pair rest:(_ "," _ EOL? _ @Pair)* { return [first, ...rest]; }

TableExpr
  = "{" _ pairs:Pairs? _ "}" { return new TableNode(pairs ?? []); }
  / CallExpr

// Invocation

CallExpr
  = name:Symbol _ "(" _ EOL? _ args:Values? _ ")" {
      return new CallNode(name, args ?? []);
    }
  / IndexExpr

// Indexes

IndexExpr
  = name:Symbol _ indexes:Indexes? {
      return indexes ? buildIndex(name, indexes) : new VarNode(name);
    }
  / PrimaryExpr

Indexes
  = first:IndexSegment rest:(_ @IndexSegment)* {
      // flatten segments into a single chain of indexes
      return [first, ...rest].flat();
    }

IndexSegment
  // allow successive indexes separated by commas, e.g. lst[0,1,2]
  = "[" _ first:Value rest:(_ "," _ @Value)* _ "]" { return [first, ...rest]; }
  / "." _ index:Digits { return [new LiteralNode(Number(index))]; }
  / "." _ name:Symbol { return [new LiteralNode(name)]; }

// segment consisting of one literal node

PrimaryExpr
  = String
  / Literal
  / "(" _ val:Value _ ")" { return val; }

// Strings

String "a string"
  = "\"" segments:StringSegment* "\"" { return buildString(segments); }

StringSegment
  = chars:Char+ { return new LiteralNode(chars.join('')); }
  / "{" _ val:Value _ "}" { return val; }

// interpolation of value expressions

Char
  = "\"\"" { return '"'; }
  / "{{" { return '{' /*}*/; }
  / "}}" { return /*{*/ '}'; }
  / "{}" { return '{}'; }
  / [^"{}]

// Data

Literal
  = None
  / Boolean
  / Number

None = none { return new LiteralNode(null); }

Boolean
  = true { return new LiteralNode(true); }
  / false { return new LiteralNode(false); }

Number "a number"
  = infinity { return new LiteralNode(Infinity); }
  / num:NumberFormat { return new LiteralNode(parseFloat(num)); }

NumberFormat = $(Digits ("." Digits)? ([eE] [-+]? Digits)?)

Digits = $[0-9]+

// Symbols

Symbol "a name" = $(!Reserved [a-z_]i [a-z0-9_]i*)

// Keywords

none = "none" WB

true = "true" WB

false = "false" WB

infinity = "infinity" WB

if = "if" WB

then = "then" WB

else = "else" WB

end = "end" WB

repeat = "repeat" WB

do = "do" WB

for = "for" WB

from = "from" WB

to = "to" WB

by = "by" WB

in = "in" WB

while = "while" WB

begin = "begin" WB

exit = "exit" WB

break = "break" WB

next = "next" WB

return = "return" WB

let = "let" WB

and = "and" WB

or = "or" WB

not = "not" WB

Reserved
  = none
  / true
  / false
  / infinity
  / if
  / then
  / else
  / end
  / repeat
  / do
  / for
  / from
  / to
  / by
  / in
  / while
  / begin
  / exit
  / break
  / next
  / return
  / let
  / and
  / or
  / not

// Whitespace

WB = ![a-z_]i

_ "whitespace" = [ \t]* (";" [^\n]*)?

EOL "end of line" = (_ "\n")+
