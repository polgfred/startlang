// Language Nodes

{
  // build an object for this node
  function buildNode(type, attrs) {
    // if we're a block with one statement, just return the statement itself
    if (type == 'block' && attrs.elems.length == 1) {
      return attrs.elems[0];
    }

    // show the type first
    var node = { type: type };

    // then the passed-in attributes
    for (var p in attrs) {
      node[p] = attrs[p];
    }

    // then the source metadata
    if (options.meta) {
      node.meta = {
        text: text(),
        offset: offset(),
        line: line(),
        column: column()
      };
    }

    return node;
  }

  // take a base name, dimensions, and (optionally) a value, and construct an indexish node
  function buildIndex(name, indexes, value) {
    if (value === undefined) {
      return buildNode('index', { name: name, indexes: indexes });
    } else {
      return buildNode('letIndex', { name: name, indexes: indexes, value: value });
    }
  }

  // take a chain of equal-precedence logical exprs and construct a left-folding tree
  function buildLogicalOp(first, rest) {
    if (rest.length == 0) {
      return first;
    } else {
      var next = rest.shift(),
          node = buildNode('logicalOp', { op: next[0], left: first, right: next[1] });
      return buildLogicalOp(node, rest);
    }
  }

  // take a chain of equal-precedence binary exprs and construct a left-folding tree
  function buildBinaryOp(first, rest) {
    if (rest.length == 0) {
      return first;
    } else {
      var next = rest.shift(),
          node = buildNode('binaryOp', { op: next[0], left: first, right: next[1] });
      return buildBinaryOp(node, rest);
    }
  }

  // same, but fold right
  function buildBinaryOpRight(rest, last) {
    if (rest.length == 0) {
      return last;
    } else {
      var next = rest.pop(),
          node = buildNode('binaryOp', { op: next[0], left: next[1], right: last });
      return buildBinaryOpRight(rest, node);
    }
  }

  function buildUnaryOpRight(ops, last) {
    if (ops.length == 0) {
      return last;
    } else {
      var next = ops.pop(),
          node = buildNode('unaryOp', { op: next, right: last });
      return buildUnaryOpRight(ops, node);
    }
  }

  function buildString(first, rest) {
    if (rest.length == 0) {
      return first;
    } else {
      var next = rest.shift(),
          node = buildNode('binaryOp', { op: '$', left: first, right: next });
      return buildString(node, rest);
    }
  }
}

// Grammar

start
  = EOL?
    block:Block {
      return block;
    }

// Top-level

Block
  = elems:( __ elem:BlockElement EOL { return elem; } )* {
      return buildNode('block', { elems: elems });
    }

BlockElement
  = Control
  / Statement

Control
  = If
  / Repeat
  / Count
  / For
  / While
  / With
  / Begin

If
  = 'if' WB __ cond:Value __ 'then' WB __ tbody:MiddleBody __ 'else' WB __ fbody:EndBody {
      return buildNode('if', { cond: cond, tbody: tbody, fbody: fbody });
    }
  / 'if' WB __ cond:Value __ 'then' WB __ tbody:EndBody {
      return buildNode('if', { cond: cond, tbody: tbody });
    }

Repeat
  = 'repeat' WB __ times:Value __ 'do' WB __ body:EndBody {
      return buildNode('repeat', { times: times, body: body });
    }

Count
  = 'count' WB __ sym:Symbol __ 'from' WB __ from:Value __ 'to' WB __ to:Value __ 'by' WB __ by:Value __ 'do' WB __ body:EndBody {
      return buildNode('count', { name: sym, from: from, to: to, by: by, body: body });
    }
  / 'count' WB __ sym:Symbol __ 'from' WB __ from:Value __ 'to' WB __ to:Value __ 'do' WB __ body:EndBody {
      return buildNode('count', { name: sym, from: from, to: to, body: body });
    }

For
  = 'for' WB __ sym:Symbol __ 'in' WB __ range:Value __ 'do' WB __ body:EndBody {
      return buildNode('for', { name: sym, range: range, body: body });
    }

While
  = 'while' WB __ cond:Value __ 'do' WB __ body:EndBody {
      return buildNode('while', { cond: cond, body: body });
    }

With
  = 'with' WB __ sym:Symbol __ indexes:Dimensions? __ '=' __ value:Value __ 'do' WB __ body:EndBody {
      return buildNode('with', { name: sym, indexes: indexes, value: value, body: body });
    }
  / 'with' WB __ value:Value __ 'do' WB __ body:EndBody {
      return buildNode('with', { name: null, value: value, body: body });
    }

Begin
  = 'begin' WB __ sym:Symbol __ 'do' WB __ body:EndBody {
      return buildNode('begin', { name: sym, params: null, body: body });
    }
  / 'begin' WB __ sym:Symbol __ '(' EOL? __ params:Params? __ ')' __ 'do' WB __ body:EndBody {
      return buildNode('begin', { name: sym, params: params, body: body });
    }

MiddleBody
  = Statement
  / EOL b:Block {
      return b;
    }

EndBody
  = Statement
  / EOL b:Block __ 'end' {
      return b;
    }

Params
  = first:Symbol rest:( __ ',' __ EOL? __ sym:Symbol { return sym; } )* {
      return [first].concat(rest);
    }

Statement
  = Flow
  / Let
  / Call

Flow
  = 'break' WB {
      return buildNode('break');
    }
  / 'next' WB {
      return buildNode('next');
    }
  / 'return' WB __ result:Value? {
      return buildNode('return', { result: result });
    }

Let
  = ( 'let' WB __ )? name:Symbol __ indexes:Dimensions? __ '=' __ value:Value {
      if (!indexes) {
        return buildNode('let', { name: name, value: value });
      } else {
        return buildIndex(name, indexes, value);
      }
    }

Call
  // if we match non-parenthesized args optionally right away, it will
  // never get past the first rule, so...
  //  1- try to match non-parenthesized arguments first *if present*
  //      - this fixes the case of "print (1+2)/3"
  //  2- try to match zero or more parenthesized arguments
  //  3- match a bare call with no parens or args
  = name:Symbol __ args:Values {
      return buildNode('call', { name: name, args: args });
    }
  / name:Symbol __ '(' __ EOL? __ args:Values? __ ')' {
      return buildNode('call', { name: name, args: args });
    }
  / name:Symbol {
      return buildNode('call', { name: name, args: null });
    }

// Values

Values
  = first:Value rest:( __ ',' __ EOL? __ val:Value { return val; } )* {
      return [first].concat(rest);
    }

Value 'a value'
  = ConjExpr

// Conditions

ConjExpr
  = first:NotExpr rest:( __ op:ConjOp __ e:NotExpr { return [op, e]; } )* {
      return buildLogicalOp(first, rest);
    }

ConjOp
  = 'and' WB { return 'and'; }
  / 'or'  WB { return 'or';  }

NotExpr
  = op:NotOp __ right:RelExpr {
      return buildNode('logicalOp', { op: op, right: right });
    }
  / RelExpr

NotOp
  = 'not' WB { return 'not'; }

RelExpr
  = left:ConcatExpr __ op:RelOp __ right:ConcatExpr {
      return buildNode('binaryOp', { op: op, left: left, right: right });
    }
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
  = first:BitExpr rest:( __ op:ConcatOp __ e:BitExpr { return [op, e]; } )* {
      return buildBinaryOp(first, rest);
    }

ConcatOp
  = '$'

// Math

BitExpr
  = first:AddExpr rest:( __ op:BitOp __ e:AddExpr { return [op, e]; } )* {
      return buildBinaryOp(first, rest);
    }

BitOp
  = '&'
  / '|'
  / '^'

AddExpr
  = first:MultExpr rest:( __ op:AddOp __ e:MultExpr { return [op, e]; } )* {
      return buildBinaryOp(first, rest);
    }

AddOp
  = '+'
  / '-'

MultExpr
  = first:UnaryExpr rest:( __ op:MultOp __ e:UnaryExpr { return [op, e]; } )* {
      return buildBinaryOp(first, rest);
    }

MultOp
  = '*'
  / '/'
  / '%'

UnaryExpr
  = ops:( op:UnaryOp __ { return op; } )* right:CallExpr {
      return buildUnaryOpRight(ops, right);
    }
  / CallExpr

UnaryOp
  = '+'
  / '-'
  / '~'

// Invocation

CallExpr
  = name:Symbol __ '(' __ EOL? __ args:Values? __ ')' {
      return buildNode('call', { name: name, args: args });
    }
  / IndexExpr

// Indexes

IndexExpr
  = sym:Symbol __ indexes:Dimensions? {
      if (!indexes) {
        return buildNode('var', { name: sym });
      } else {
        return buildIndex(sym, indexes);
      }
    }
  / PrimaryExpr

Dimensions
  = first:Dimension rest:( __ dim:Dimension { return dim; } )* {
      return [first].concat(rest);
    }

Dimension
  = '[' __ v:Value __ ']' {
      return v;
    }
  / '.' __ sym:Symbol {
      return buildNode('literal', { value: sym });
    }

PrimaryExpr
  = String
  / Literal
  / '(' __ val:Value __ ')' {
      return val;
    }

// Strings

String 'a string'
  = '"' rest:StringSegment* '"' {
      // if the first segment isn't a string literal, make it one
      var first = (rest.length > 0 && rest[0].type == 'literal' && typeof rest[0].value == 'string') ?
                    rest.shift() :
                    buildNode('literal', { value: '' });

      return buildString(first, rest);
    }

StringSegment
  = "`" __ val:Value __ "`" {
      // interpolation of value expressions
      return val;
    }
  / chars:Char+ {
      return buildNode('literal', { value: chars.join('') });
    }

Char
  = '""' { return '"'; }
  / '``' { return '`'; }
  / [^"`]

// Data

Literal
  = None
  / Boolean
  / Number

None
  = 'none' WB {
      return buildNode('literal', { value: null });
    }

Boolean
  = 'true'  WB {
      return buildNode('literal', { value: true });
    }
  / 'false' WB {
      return buildNode('literal', { value: false });
    }

Number 'a number'
  = 'infinity' WB {
      return buildNode('literal', { value: Infinity });
    }
  / num:NumberFormat {
      return buildNode('literal', { value: parseFloat(num) });
    }

NumberFormat
  = $( Digits ( '.' Digits )? ( [eE] [-+]? Digits )? )

Digits
  = $[0-9]+

// Symbols

Symbol 'a name'
  = $( !Reserved [a-z_]i [a-z0-9_]i* )

Reserved
  = 'none'     WB
  / 'true'     WB
  / 'false'    WB
  / 'infinity' WB
  / 'if'       WB
  / 'then'     WB
  / 'else'     WB
  / 'end'      WB
  / 'for'      WB
  / 'in'       WB
  / 'do'       WB
  / 'while'    WB
  / 'begin'    WB
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
  = [ \t]* ( ';' [^\n]* )?

EOL 'end of line'
  = ( __ '\n' )+
