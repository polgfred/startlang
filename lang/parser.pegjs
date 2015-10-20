// Language Nodes

{
  // build an object for this node
  function buildNode(type, attrs) {
    // if we're a block with one statement, just return the statement itself
    if (type == 'block' && attrs.elems.length == 1) {
      return attrs.elems[0];
    }

    // show the type first
    let node = { type: type };

    // then the passed-in attributes
    Object.assign(node, attrs);

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

  // take a series of tests, and (optionally) a final else body, and construct an if-tree
  function buildIf(tests, fbody) {
    let [ cond, tbody ] = tests.shift();
    if (tests.length > 0) {
      // insert the next-level tree into the false slot
      fbody = buildIf(tests, fbody);
    }
    return buildNode('if', { cond, tbody, fbody });
  }

  // take a base name, dimensions, and (optionally) a value, and construct an indexish node
  function buildIndex(name, indexes, value) {
    if (value === undefined) {
      return buildNode('index', { name, indexes });
    } else {
      return buildNode('letIndex', { name, indexes, value });
    }
  }

  // take a chain of equal-precedence logical exprs and construct a left-folding tree
  function buildLogicalOp(left, rest) {
    if (rest.length == 0) {
      return left;
    } else {
      let [ op, right ] = rest.shift(),
          node = buildNode('logicalOp', { op, left, right });
      return buildLogicalOp(node, rest);
    }
  }

  // take a chain of equal-precedence binary exprs and construct a left-folding tree
  function buildBinaryOp(left, rest) {
    if (rest.length == 0) {
      return left;
    } else {
      let [ op, right ] = rest.shift(),
          node = buildNode('binaryOp', { op, left, right });
      return buildBinaryOp(node, rest);
    }
  }

  // same, but fold right
  function buildBinaryOpRight(rest, right) {
    if (rest.length == 0) {
      return right;
    } else {
      let [ op, left ] = rest.pop(),
          node = buildNode('binaryOp', { op, left, right });
      return buildBinaryOpRight(rest, node);
    }
  }

  function buildUnaryOpRight(ops, right) {
    if (ops.length == 0) {
      return right;
    } else {
      let op = ops.pop(),
          node = buildNode('unaryOp', { op, right });
      return buildUnaryOpRight(ops, node);
    }
  }

  function buildString(left, rest) {
    if (rest.length == 0) {
      return left;
    } else {
      let right = rest.shift(),
          node = buildNode('binaryOp', { op: '$', left, right });
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
      return buildNode('block', { elems });
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
  // one-line if/then[/else]
  = 'if' WB __ cond:Value __ 'then' WB __ tbody:Statement fbody:( __ 'else' WB __ s:Statement { return s; } )? {
      return buildIf([[ cond, tbody ]], fbody);
    }
  // multi-line if/then[/else if/...][/else]
  / 'if' WB __ cond:Value __ 'then' WB __ EOL tbody:Block
      tests:( __ 'else' WB __ 'if' WB __ v:Value __ 'then' WB __ EOL b:Block { return [ v, b ]; } )*
      fbody:( __ 'else' WB __ EOL b:Block { return b; } )?
      __ 'end' {
      return buildIf([[ cond, tbody ]].concat(tests), fbody);
    }

Repeat
  = 'repeat' WB __ times:Value __ 'do' WB __ body:EndBody {
      return buildNode('repeat', { times, body });
    }

Count
  = 'count' WB __ name:Symbol __ 'from' WB __ from:Value __ 'to' WB __ to:Value __ 'by' WB __ by:Value __ 'do' WB __ body:EndBody {
      return buildNode('count', { name, from, to, by, body });
    }
  / 'count' WB __ name:Symbol __ 'from' WB __ from:Value __ 'to' WB __ to:Value __ 'do' WB __ body:EndBody {
      return buildNode('count', { name, from, to, body });
    }

For
  = 'for' WB __ name:Symbol __ 'in' WB __ range:Value __ 'do' WB __ body:EndBody {
      return buildNode('for', { name, range, body });
    }

While
  = 'while' WB __ cond:Value __ 'do' WB __ body:EndBody {
      return buildNode('while', { cond, body });
    }

With
  = 'with' WB __ name:Symbol __ indexes:Dimensions? __ '=' __ value:Value __ 'do' WB __ body:EndBody {
      return buildNode('with', { name, indexes, value, body });
    }
  / 'with' WB __ value:Value __ 'do' WB __ body:EndBody {
      return buildNode('with', { name: null, value, body });
    }

Begin
  = 'begin' WB __ name:Symbol __ 'do' WB __ body:EndBody {
      return buildNode('begin', { name, params: null, body });
    }
  / 'begin' WB __ name:Symbol __ '(' EOL? __ params:Params? __ ')' __ 'do' WB __ body:EndBody {
      return buildNode('begin', { name, params, body });
    }

EndBody
  = Statement
  / EOL b:Block __ 'end' {
      return b;
    }

Params
  = first:Symbol rest:( __ ',' __ EOL? __ name:Symbol { return name; } )* {
      return [first].concat(rest);
    }

Statement
  = Flow
  / Let
  / Call

Flow
  = 'exit' WB {
      return buildNode('exit');
    }
  / 'break' WB {
      return buildNode('break');
    }
  / 'next' WB {
      return buildNode('next');
    }
  / 'return' WB __ result:Value? {
      return buildNode('return', { result });
    }

Let
  = ( 'let' WB __ )? name:Symbol __ indexes:Dimensions? __ '=' __ value:Value {
      if (!indexes) {
        return buildNode('let', { name, value });
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
      return buildNode('call', { name, args });
    }
  / name:Symbol __ '(' __ EOL? __ args:Values? __ ')' {
      return buildNode('call', { name, args });
    }
  / name:Symbol {
      return buildNode('call', { name, args: null });
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
  = first:NotExpr rest:( __ op:ConjOp __ e:NotExpr { return [ op, e ]; } )* {
      return buildLogicalOp(first, rest);
    }

ConjOp
  = 'and' WB { return 'and'; }
  / 'or'  WB { return 'or';  }

NotExpr
  = op:NotOp __ right:RelExpr {
      return buildNode('logicalOp', { op, right });
    }
  / RelExpr

NotOp
  = 'not' WB { return 'not'; }

RelExpr
  = left:ConcatExpr __ op:RelOp __ right:ConcatExpr {
      return buildNode('binaryOp', { op, left, right });
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
  = first:BitExpr rest:( __ op:ConcatOp __ e:BitExpr { return [ op, e ]; } )* {
      return buildBinaryOp(first, rest);
    }

ConcatOp
  = '$'

// Math

BitExpr
  = first:AddExpr rest:( __ op:BitOp __ e:AddExpr { return [ op, e ]; } )* {
      return buildBinaryOp(first, rest);
    }

BitOp
  = '&'
  / '|'
  / '^'

AddExpr
  = first:MultExpr rest:( __ op:AddOp __ e:MultExpr { return [ op, e ]; } )* {
      return buildBinaryOp(first, rest);
    }

AddOp
  = '+'
  / '-'

MultExpr
  = first:UnaryExpr rest:( __ op:MultOp __ e:UnaryExpr { return [ op, e ]; } )* {
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
      return buildNode('call', { name, args });
    }
  / IndexExpr

// Indexes

IndexExpr
  = name:Symbol __ indexes:Dimensions? {
      if (!indexes) {
        return buildNode('var', { name });
      } else {
        return buildIndex(name, indexes);
      }
    }
  / PrimaryExpr

Dimensions
  = first:Dimension rest:( __ dim:Dimension { return dim; } )* {
      return [first].concat(rest);
    }

Dimension
  = '[' __ val:Value __ ']' {
      return val;
    }
  / '.' __ name:Symbol {
      return buildNode('literal', { value: name });
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
      let first = (rest.length > 0 && rest[0].type == 'literal' && typeof rest[0].value == 'string') ?
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
  / 'repeat'   WB
  / 'do'       WB
  / 'count'    WB
  / 'from'     WB
  / 'to'       WB
  / 'by'       WB
  / 'for'      WB
  / 'in'       WB
  / 'while'    WB
  / 'with'     WB
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
  = [ \t]* ( ';' [^\n]* )?

EOL 'end of line'
  = ( __ '\n' )+
