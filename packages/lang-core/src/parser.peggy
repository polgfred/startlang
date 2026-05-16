{{
  import {
    BeginNode,
    BinaryOpNode,
    BlockNode,
    BreakNode,
    CallExpressionNode,
    CallStatementNode,
    DeleteIndexNode,
    DeleteNode,
    ExitNode,
    ForInNode,
    ForNode,
    IfNode,
    InputNode,
    LetIndexNode,
    LetNode,
    ListNode,
    LiteralNode,
    LogicalOpNode,
    LogicalNotNode,
    NextNode,
    PauseNode,
    RecordNode,
    RepeatNode,
    ReturnNode,
    SetNode,
    SnapshotNode,
    TemplateStringNode,
    UnaryOpNode,
    VarIndexNode,
    VarNode,
    WhileNode,
  } from './nodes/index.js';
  import { Program } from './program.js';
}}

{
  // take a series of tests, and (optionally) a final else body, and construct an if-tree
  function buildIfTree(tests, elseBody) {
    const [condition, thenBody, loc] = tests.shift();
    if (tests.length > 0) {
      // insert the next-level tree into the false slot
      elseBody = buildIfTree(tests, elseBody);
    }
    return new IfNode(condition, thenBody, elseBody).at(loc);
  }

  // take a chain of equal-precedence exprs and construct a left-folding tree
  function buildBinaryExpr(left, rest) {
    if (rest.length === 0) {
      return left;
    } else {
      const [operator, right] = rest.shift();
      const node = new BinaryOpNode(operator, left, right).at(location());
      return buildBinaryExpr(node, rest);
    }
  }

  function buildLogicalExpr(left, rest) {
    if (rest.length === 0) {
      return left;
    } else {
      const [operator, right] = rest.shift();
      const node = new LogicalOpNode(operator, left, right).at(location());
      return buildLogicalExpr(node, rest);
    }
  }

  // take a chain of unary ops and construct a right-folding tree
  function buildUnaryExpr(ops, right) {
    if (ops.length === 0) {
      return right;
    } else {
      const operator = ops.pop();
      const node = new UnaryOpNode(operator, right).at(location());
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
      return new TemplateStringNode(segments).at(location());
    }
  }

  // take a base name, indexes, and (optionally) a value, and construct a
  // var-index or let-index node
  function buildIndex(name, indexes, value) {
    if (value === undefined) {
      return new VarIndexNode(name, indexes).at(location());
    } else {
      return new LetIndexNode(name, indexes, value).at(location());
    }
  }

  // partition top-level elements into a function table and a main block,
  // erroring on duplicate function names
  function buildProgram(elems) {
    const functions = Object.create(null);
    const mainElems = [];
    for (const elem of elems) {
      if (elem instanceof BeginNode) {
        if (functions[elem.name]) {
          error(`function '${elem.name}' is already defined`, elem.location);
        }
        functions[elem.name] = elem;
      } else {
        mainElems.push(elem);
      }
    }
    return new Program(functions, new BlockNode(mainElems).at(location()));
  }
}

// Grammar

start = EOL? @program:Program

// Top-level

Program
  = elems:(_ @ProgramElement EOL)* { return buildProgram(elems); }

ProgramElement
  = BeginBlock
  / BlockElement

Block
  = elems:(_ @BlockElement EOL)* { return new BlockNode(elems).at(location()); }

BlockElement
  = ControlBlock
  / Statement

ControlBlock
  = IfBlock
  / RepeatBlock
  / ForBlock
  / WhileBlock

IfBody = if __ cond:Value __ then EOL body:Block {
  // capture the location here so we're mapping to the right lines
  return [cond, body, location()];
}

IfBlock
  // one-line if/then[/else]
  = if __ cond:Value __ then __ tbody:Statement fbody:(__ else __ @Statement)? {
      return buildIfTree([[cond, tbody, location()]], fbody);
    }
  // if/then[/else if/...][/else]
  / cases:IfBody|1.., (_ else __)| fbody:(_ else EOL @Block)? _ end {
      return buildIfTree(cases, fbody);
    }

DoBody
  = do __ @statement:Statement
  / do EOL @body:Block _ end

RepeatBlock
  = repeat times:(__ @times:Value)? __ body:DoBody {
      return new RepeatNode(times, body).at(location());
    }

Range = @initial:Value __ to __ @limit:Value @step:(__ by __ @Value)?

ForBlock
  // for i from a to b by c
  = for __ name:Symbol _ "=" _ range:Range __ body:DoBody {
      const [initial, limit, step] = range;
      return new ForNode(name, initial, limit, step, body).at(location());
    }
  // for i in x
  / for __ name:Symbol __ in __ iterable:Value __ body:DoBody {
      return new ForInNode(name, iterable, body).at(location());
    }

WhileBlock
  = while __ cond:Value __ body:DoBody {
      return new WhileNode(cond, body).at(location());
    }

Params "parameter names" = Symbol|1.., (_ "," EOL? _)|

BeginBlock
  = begin __ name:Symbol params:(_ "(" EOL? _ @Params? EOL? ")")? __ body:DoBody {
      return new BeginNode(name, params ?? [], body).at(location());
    }

Statement
  = SetStatement
  / FlowStatement
  / InputStatement
  / LetStatement
  / DeleteStatement
  / CallStatement

ConfigOption = DottedSymbol

SetStatement
  = set __ option:ConfigOption _ "=" _ value:Value {
      return new SetNode(option, value).at(location());
    }

FlowStatement
  = exit { return new ExitNode().at(location()); }
  / break { return new BreakNode().at(location()); }
  / next { return new NextNode().at(location()); }
  / pause { return new PauseNode().at(location()); }
  / snapshot { return new SnapshotNode().at(location()); }
  / return result:(__ @Value)? { return new ReturnNode(result).at(location()); }

InputStatement
  = input __ name:Symbol __ prompt:StaticString initial:(__ @StaticString)? {
      return new InputNode(name, prompt, initial ?? '').at(location());
    }

LetStatement
  = (let __)? name:Symbol _ indexes:Indexes? _ "=" _ value:Value {
      return indexes
        ? buildIndex(name, indexes, value)
        : new LetNode(name, value).at(location());
    }

DeleteStatement
  = delete __ name:Symbol _ indexes:Indexes? {
      return indexes
        ? new DeleteIndexNode(name, indexes).at(location())
        : new DeleteNode(name).at(location());
    }

CallStatement
  // if we match non-parenthesized args optionally right away, it will
  // never get past the first rule, so...
  //  1- try to match one or more non-parenthesized arguments first
  //      - this fixes the case of "print (1+2)/3"
  //  2- try to match zero or more parenthesized arguments
  //  3- match a bare call with no parens or args
  = name:Symbol __ args:Values body:(__ @DoBody)? {
      return new CallStatementNode(name, args, body).at(location());
    }
  / name:Symbol _ "(" EOL? _ args:Values? EOL? _ ")" body:(__ @DoBody)? {
      return new CallStatementNode(name, args ?? [], body).at(location());
    }
  / name:Symbol body:(_ @DoBody)? {
      return new CallStatementNode(name, [], body).at(location());
    }

// Values

Values = Value|1.., (_ "," EOL? _)|

Value "a value" = ConjExpr

// Conditions

ConjExpr
  = first:NotExpr rest:(__ @ConjOp __ @NotExpr)* {
      return buildLogicalExpr(first, rest);
    }

ConjOp
  = and
  / or

NotExpr
  = not __ right:RelExpr { return new LogicalNotNode(right).at(location()); }
  / RelExpr

RelExpr
  = left:ConcatExpr _ operator:RelOp _ right:ConcatExpr {
      return new BinaryOpNode(operator, left, right).at(location());
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
  = "[" EOL? _ values:Values? EOL? _ "]" {
      return new ListNode(values ?? []).at(location());
    }
  / RecordExpr

Pair "a record field" = key:DottedSymbol _ "=" _ value:Value { return { key, value }; }

Pairs "record fields" = Pair|1.., (_ "," EOL? _)|

RecordExpr
  = "{" EOL? _ pairs:Pairs? EOL? _ "}" {
      return new RecordNode(pairs ?? []).at(location());
    }
  / CallExpr

// Invocation

CallExpr
  = name:Symbol _ "(" EOL? _ args:Values? EOL? _ ")" {
      return new CallExpressionNode(name, args ?? [], null).at(location());
    }
  / IndexExpr

// Indexes

IndexExpr
  = name:Symbol indexes:(_ @Indexes)? {
      return indexes
        ? buildIndex(name, indexes)
        : new VarNode(name).at(location());
    }
  / PrimaryExpr

Indexes
  = segments:IndexSegment|1..| {
      // flatten segments into a single chain of indexes
      return segments.flat();
    }

IndexSegment
  // allow successive indexes separated by commas, e.g. lst[0,1,2]
  = "[" _ @Value|1.., (_ "," _)| _ "]"
  / "." _ index:Digits { return new LiteralNode(Number(index)).at(location()); }
  / "." _ name:Symbol { return new LiteralNode(name).at(location()); }

// segment consisting of one literal node

PrimaryExpr
  = String
  / Literal
  / "(" _ @val:Value _ ")"

// Strings

String "a string"
  = "\"" segments:StringSegment* "\"" { return buildString(segments); }

StaticString "a static string"
  = "\"" chars:Char* "\"" { return chars.join(''); }

StringSegment
  = chars:Char+ { return new LiteralNode(chars.join('')).at(location()); }
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

None = none { return new LiteralNode(null).at(location()); }

Boolean
  = true { return new LiteralNode(true).at(location()); }
  / false { return new LiteralNode(false).at(location()); }

Number "a number"
  = infinity { return new LiteralNode(Infinity).at(location()); }
  / num:NumberFormat { return new LiteralNode(parseFloat(num)).at(location()); }

NumberFormat = $(Digits ("." Digits)? ([eE] [-+]? Digits)?)

Digits = $[0-9]+

// Symbols

DottedSymbol "a dotted name" = $(Name|1.., "."|)

Symbol "a name" = $(!Reserved Name)

Name = [a-z_]i [a-z0-9_]i*

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

delete = @"delete" WB

let = @"let" WB

input = @"input" WB

pause = @"pause" WB

snapshot = @"snapshot" WB

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
  / delete
  / let
  / input
  / pause
  / snapshot
  / and
  / or
  / not

// Whitespace

WB = ![a-z_]i

_ "whitespace" = [ \t]* (";" [^\n]*)?

__ "whitespace" = [ \t]+ (";" [^\n]*)?

EOL "end of line" = (_ "\n")+
