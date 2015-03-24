// Language Nodes

{
  // build an object for this node
  function buildNode(type, attrs) {
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
  / For
  / While
  / Begin

// Control structures each have a single-line form and a block form

If
  = 'if' WB __ cond:Value __ 'then' WB __ tbody:Statement __ 'else' WB __ fbody:Statement {
      return buildNode('if', { cond: cond, tbody: tbody, fbody: fbody });
    }
  / 'if' WB __ cond:Value __ 'then' WB __ tbody:Statement {
      return buildNode('if', { cond: cond, tbody: tbody });
    }
  / 'if' WB __ cond:Value __ 'then' EOL
    tbody:Block
    __ 'else' EOL
    fbody:Block
    __ 'end' {
      return buildNode('if', { cond: cond, tbody: tbody, fbody: fbody });
    }
  / 'if' WB __ cond:Value __ 'then' EOL
    tbody:Block
    __ 'end' {
      return buildNode('if', { cond: cond, tbody: tbody });
    }

For
  = 'for' WB __ sym:Symbol __ 'in' WB __ range:Range __ 'do' WB __ body:Statement {
      return buildNode('for', { name: sym, range: range, body: body });
    }
  / 'for' WB __ sym:Symbol __ 'in' WB __ range:Range __ 'do' EOL
    body:Block
    __ 'end' {
      return buildNode('for', { name: sym, range: range, body: body });
    }

Range
  = from:Value __ ',' __ to:Value by:( __ ',' __ v:Value { return v; } )? {
      // handle 'for i in 1,10,2' as a shorthand for range(...)
      var args = [ from, to ];
      if (by != null) {
        args.push(by);
      }
      return buildNode('call', { name: 'range', args: args });
    }
  / Value

While
  = 'while' WB __ cond:Value __ 'do' WB __ body:Statement {
      return buildNode('while', { cond: cond, body: body });
    }
  / 'while' WB __ cond:Value __ 'do' EOL
    body:Block
    __ 'end' {
      return buildNode('while', { cond: cond, body: body });
    }

Begin
  = 'begin' WB __ sym:Symbol __ params:Params? __ 'do' WB __ body:Statement {
      return buildNode('begin', { name: sym, params: params, body: body });
    }
  / 'begin' WB __ sym:Symbol __ params:Params? __ 'do' EOL
    body:Block
    __ 'end' {
      return buildNode('begin', { name: sym, params: params, body: body });
    }

Params
  = '(' __ first:Symbol rest:( __ ',' __ EOL? __ sym:Symbol { return sym; } )* __ ')' {
      return [first].concat(rest);
    }

Statement
  = Let
  / Call
  / Flow

Let
  = 'let' WB __ name:Symbol __ indexes:Dimensions? __ '=' __ value:Value {
      if (!indexes) {
        return buildNode('let', { name: name, value: value });
      } else {
        return buildIndex(name, indexes, value);
      }
    }

Call
  = name:Symbol __ '(' __ EOL? __ args:Values? __ ')' {
      return buildNode('call', { name: name, args: args });
    }
  / name:Symbol __ args:Values? {
      return buildNode('call', { name: name, args: args });
    }

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

// Values

Values
  = first:Value rest:( __ ',' __ EOL? __ val:Value { return val; } )* {
      return [first].concat(rest);
    }

Value
  = CondExpr

// Conditions

CondExpr
  = NotExpr
  / ConjExpr

NotExpr
  = op:NotOp __ right:RelExpr {
      return buildNode('logicalOp', { op: op, right: right });
    }

NotOp
  = 'not' WB { return 'not'; }

ConjExpr
  = first:RelExpr rest:( __ op:ConjOp __ e:RelExpr { return [op, e]; } )* {
      return buildLogicalOp(first, rest);
    }

ConjOp
  = 'and' WB { return 'and'; }
  / 'or'  WB { return 'or';  }

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
  = first:PowExpr rest:( __ op:MultOp __ e:PowExpr { return [op, e]; } )* {
      return buildBinaryOp(first, rest);
    }

MultOp
  = '*' !'*' { return '*'; } // don't match **
  / '/'
  / '%'

PowExpr
  = rest:( e:UnaryExpr __ op:PowOp __ { return [op, e]; } )* last:UnaryExpr {
      return buildBinaryOpRight(rest, last);
    }

PowOp
  = '**'

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
  / '.' sym:Symbol {
      return buildNode('literal', { value: sym });
    }

PrimaryExpr
  = String
  / Literal
  / '(' __ val:Value __ ')' {
      return val;
    }

// Strings

String
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

Number
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

Symbol
  = $( !Reserved [a-z_]i [a-z0-9_]i* )

Reserved
  = 'none'     WB
  / 'true'     WB
  / 'false'    WB
  / 'infinity' WB
  / 'if'       WB
  / 'else'     WB
  / 'end'      WB
  / 'for'      WB
  / 'in'       WB
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

__
  = [ \t]* ( ';' [^\n]* )?

EOL
  = ( __ '\n' )+
