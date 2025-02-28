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
    RecordNode,
    RepeatNode,
    ReturnNode,
    SetNode,
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
    return new IfNode(location(), condition, thenBody, elseBody);
  }

  // take a chain of equal-precedence exprs and construct a left-folding tree
  function buildBinaryExpr(left, rest) {
    if (rest.length === 0) {
      return left;
    } else {
      const [operator, right] = rest.shift();
      const node = new BinaryOpNode(location(), operator, left, right);
      return buildBinaryExpr(node, rest);
    }
  }

  function buildLogicalExpr(left, rest) {
    if (rest.length === 0) {
      return left;
    } else {
      const [operator, right] = rest.shift();
      const node = new LogicalOpNode(location(), operator, [left, right]);
      return buildLogicalExpr(node, rest);
    }
  }

  // take a chain of unary ops and construct a right-folding tree
  function buildUnaryExpr(ops, right) {
    if (ops.length === 0) {
      return right;
    } else {
      const operator = ops.pop();
      const node = new UnaryOpNode(location(), operator, right);
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
      return new TemplateStringNode(location(), segments);
    }
  }

  // take a base name, indexes, and (optionally) a value, and construct a
  // var-index or let-index node
  function buildIndex(name, indexes, value) {
    if (value === undefined) {
      return new VarIndexNode(location(), name, indexes);
    } else {
      return new LetIndexNode(location(), name, indexes, value);
    }
  }
}

// Grammar

start = EOL? @block:Block

// Top-level

Block
  = elems:(_ @BlockElement EOL)* {
      return elems.length === 1 ? elems[0] : new BlockNode(location(), elems);
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

IfBody = if _ @cond:Value _ then EOL @body:Block

IfBlock
  // one-line if/then[/else]
  = if _ cond:Value _ then _ tbody:Statement fbody:(_ else _ @Statement)? {
      return buildIfTree([[cond, tbody]], fbody);
    }
  // if/then[/else if/...][/else]
  / cases:IfBody|1.., (_ else _)| fbody:(_ else EOL @Block)? _ end {
      return buildIfTree(cases, fbody);
    }

DoBody
  = do _ @statement:Statement
  / do EOL @body:Block _ end

RepeatBlock
  = repeat times:(_ @times:Value)? _ body:DoBody {
      return new RepeatNode(location(), times, body);
    }

Range = @initial:Value _ to _ @limit:Value @step:(_ by _ @Value)?

ForBlock
  // for i from a to b by c
  = for _ name:Symbol _ "=" _ range:Range _ body:DoBody {
      const [initial, limit, step] = range;
      return new ForNode(location(), name, initial, limit, step, body);
    }
  // for i in x
  / for _ name:Symbol _ in _ iterable:Value _ body:DoBody {
      return new ForInNode(location(), name, iterable, body);
    }

WhileBlock
  = while _ cond:Value _ body:DoBody {
      return new WhileNode(location(), cond, body);
    }

Params = Symbol|.., (_ "," EOL? _)|

BeginBlock
  = begin _ name:Symbol _ params:("(" EOL? _ @Params EOL? ")")? _ body:DoBody {
      return new BeginNode(location(), name, params ?? [], body);
    }

Statement
  = SetStatement
  / FlowStatement
  / LetStatement
  / CallStatement

ConfigOption = $(!Reserved [a-z]i+)|.., "."|

SetStatement
  = set _ option:ConfigOption _ "=" _ value:Value {
      return new SetNode(location(), option, value);
    }

FlowStatement
  = exit { return new ExitNode(location()); }
  / break { return new BreakNode(location()); }
  / next { return new NextNode(location()); }
  / return result:(_ @Value)? { return new ReturnNode(location(), result); }

LetStatement
  = (let _)? name:Symbol _ indexes:Indexes _ "=" _ value:Value {
      return indexes.length > 0
        ? buildIndex(name, indexes, value)
        : new LetNode(location(), name, value);
    }

CallStatement
  // if we match non-parenthesized args optionally right away, it will
  // never get past the first rule, so...
  //  1- try to match one or more non-parenthesized arguments first
  //      - this fixes the case of "print (1+2)/3"
  //  2- try to match zero or more parenthesized arguments
  //  3- match a bare call with no parens or args
  = name:Symbol _ args:Values & { return args.length > 0; } body:(_ @DoBody)? {
      return new CallNode(location(), name, args, body);
    }
  / name:Symbol _ "(" EOL? _ args:Values EOL? _ ")" body:(_ @DoBody)? {
      return new CallNode(location(), name, args, body);
    }
  / name:Symbol body:(_ @DoBody)? {
      return new CallNode(location(), name, [], body);
    }

// Values

Values = Value|.., (_ "," EOL? _)|

Value "a value" = ConjExpr

// Conditions

ConjExpr
  = first:NotExpr rest:(_ @ConjOp _ @NotExpr)* {
      return buildLogicalExpr(first, rest);
    }

ConjOp
  = and
  / or

NotExpr
  = not _ right:RelExpr { return new LogicalNotNode(location(), right); }
  / RelExpr

RelExpr
  = left:ConcatExpr _ operator:RelOp _ right:ConcatExpr {
      return new BinaryOpNode(location(), operator, left, right);
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
  = ops:UnaryOp|.., _| _ right:ListExpr { return buildUnaryExpr(ops, right); }

UnaryOp
  = "+"
  / "-"

// Lists and Records

ListExpr
  = "[" EOL? _ values:Values EOL? _ "]" {
      return new ListNode(location(), values);
    }
  / RecordExpr

Pair = key:Symbol _ "=" _ value:Value { return { key, value }; }

Pairs = Pair|.., (_ "," EOL? _)|

RecordExpr
  = "{" EOL? _ pairs:Pairs EOL? _ "}" {
      return new RecordNode(location(), pairs);
    }
  / CallExpr

// Invocation

CallExpr
  = name:Symbol _ "(" EOL? _ args:Values EOL? _ ")" {
      return new CallNode(location(), name, args, null);
    }
  / IndexExpr

// Indexes

IndexExpr
  = name:Symbol _ indexes:Indexes {
      return indexes.length > 0
        ? buildIndex(name, indexes)
        : new VarNode(location(), name);
    }
  / PrimaryExpr

Indexes
  = segments:IndexSegment* {
      // flatten segments into a single chain of indexes
      return segments.flat();
    }

IndexSegment
  // allow successive indexes separated by commas, e.g. lst[0,1,2]
  = "[" _ @Value|.., (_ "," _)| _ "]"
  / "." _ index:Digits { return new LiteralNode(location(), Number(index)); }
  / "." _ name:Symbol { return new LiteralNode(location(), name); }

// segment consisting of one literal node

PrimaryExpr
  = String
  / Literal
  / "(" _ @val:Value _ ")"

// Strings

String "a string"
  = "\"" segments:StringSegment* "\"" { return buildString(segments); }

StringSegment
  = chars:Char+ { return new LiteralNode(location(), chars.join('')); }
  / "{" _ @val:Value _ "}"

// interpolation of value expressions

Char
  = "\"\"" { return '"'; }
  / "{{" { return '{' /*}*/; }
  / "}}" { return /*{*/ '}'; }
  / "{}"
  / [^"{}]

// Data

Literal
  = None
  / Boolean
  / Number

None = none { return new LiteralNode(location(), null); }

Boolean
  = true { return new LiteralNode(location(), true); }
  / false { return new LiteralNode(location(), false); }

Number "a number"
  = infinity { return new LiteralNode(location(), Infinity); }
  / num:NumberFormat { return new LiteralNode(location(), parseFloat(num)); }

NumberFormat = $(Digits ("." Digits)? ([eE] [-+]? Digits)?)

Digits = $[0-9]+

// Symbols

Symbol "a name" = $(!Reserved [a-z_]i [a-z0-9_]i*)

// Keywords

none = @"none" WB

true = @"true" WB

false = @"false" WB

infinity = @"infinity" WB

if = @"if" WB

then = @"then" WB

else = @"else" WB

end = @"end" WB

repeat = @"repeat" WB

do = @"do" WB

for = @"for" WB

from = @"from" WB

to = @"to" WB

by = @"by" WB

in = @"in" WB

while = @"while" WB

begin = @"begin" WB

set = @"set" WB

exit = @"exit" WB

break = @"break" WB

next = @"next" WB

return = @"return" WB

let = @"let" WB

and = @"and" WB

or = @"or" WB

not = @"not" WB

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
  / set
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
