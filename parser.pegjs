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
    node.meta = {
      text: text(),
      offset: offset(),
      line: line(),
      column: column()
    };

    return node;
  }

  // special token to signal buildIndex that we have a DeleteIndex call
  var $remove = {};

  // take a base, dimensions, and (optionally) a value, and construct a
  // left-folding tree that terminates in an index lookup, assign, or delete
  function buildIndex(base, dims, value) {
    var first = dims.shift();

    if (dims.length == 0) {
      if (value === undefined) {
        return buildNode('index', { base: base, index: first });
      } else if (value === $remove) {
        return buildNode('deleteIndex', { base: base, index: first });
      } else {
        return buildNode('letIndex', { base: base, index: first, value: value });
      }
    } else {
      var node = buildNode('index', { base: base, index: first });
      return buildIndex(node, dims, value);
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

  function buildString(first, rest) {
    if (rest.length == 0) {
      return first;
    } else {
      var next = rest.shift(),
          node = buildNode('binaryOp', { op: '&', left: first, right: next });
      return buildString(node, rest);
    }
  }
}

// Grammar

start
  = Block

// Top-level

Block
  = elems:( __ elem:BlockElement EOL { return elem; } )* {
      return buildNode('block', { elems: elems });
    }

BlockElement
  = Control
  / Statement
  / Comment

Control
  = If
  / For
  / While
  / Begin

// Control structures each have a single-line form and a block form

If
  = __ 'if' WB __ cond:Value __ 'then' WB __ tbody:Statement __ 'else' WB __ fbody:Statement {
      return buildNode('if', { cond: cond, tbody: tbody, fbody: fbody });
    }
  / __ 'if' WB __ cond:Value __ 'then' WB __ tbody:Statement {
      return buildNode('if', { cond: cond, tbody: tbody });
    }
  / __ 'if' WB __ cond:Value __ 'then' EOL
    tbody:Block
    __ 'else' EOL
    fbody:Block
    __ 'end' {
      return buildNode('if', { cond: cond, tbody: tbody, fbody: fbody });
    }
  / __ 'if' WB __ cond:Value __ 'then' EOL
    tbody:Block
    __ 'end' {
      return buildNode('if', { cond: cond, tbody: tbody });
    }

For
  = __ 'for' WB __ sym:Symbol __ 'in' WB __ range:Value __ 'do' WB __ body:Statement {
      return buildNode('for', { name: sym, range: range, body: body });
    }
  / __ 'for' WB __ sym:Symbol __ 'in' WB __ range:Value __ 'do' EOL
    body:Block
    __ 'end' {
      return buildNode('for', { name: sym, range: range, body: body });
    }

While
  = __ 'while' WB __ cond:Value __ 'do' WB __ body:Statement {
      return buildNode('while', { cond: cond, body: body });
    }
  / __ 'while' WB __ cond:Value __ 'do' EOL
    body:Block
    __ 'end' {
      return buildNode('while', { cond: cond, body: body });
    }

Begin
  = __ 'begin' WB __ sym:Symbol __ params:Params? __ 'do' WB __ body:Statement {
      return buildNode('begin', { name: sym, params: params, body: body });
    }
  / __ 'begin' WB __ sym:Symbol __ params:Params? __ 'do' EOL
    body:Block
    __ 'end' {
      return buildNode('begin', { name: sym, params: params, body: body });
    }

Params
  = '(' __ first:Symbol rest:( __ ',' __ sym:Symbol { return sym; } )* __ ')' {
      return [first].concat(rest);
    }

Statement
  = Let
  / Delete
  / Call
  / Flow

Let
  = __ 'let' WB __ sym:Symbol __ dims:Dimensions? __ '=' __ value:Value {
      if (!dims) {
        return buildNode('let', { name: sym, value: value });
      } else {
        return buildIndex(buildNode('var', { name: sym }), dims, value);
      }
    }

Delete
  = __ 'delete' WB __ sym:Symbol __ dims:Dimensions? {
      if (!dims) {
        return buildNode('delete', { name: sym });
      } else {
        return buildIndex(buildNode('var', { name: sym }), dims, $remove);
      }
    }

Call
  = 'call' WB __ expr:IndexExpr __ args:Values? {
      return buildNode('call', { target: expr, args: args });
    }
  / sym:Symbol __ args:Values? {
      return buildNode('call', { target: buildNode('var', { name: sym }), args: args });
    }

Flow
  = __ 'break' WB {
      return buildNode('break');
    }
  / __ 'next' WB {
      return buildNode('next');
    }
  / __ 'return' WB __ result:Value? {
      return buildNode('return', { result: result });
    }

Comment
  = __ '--' __ text:$[^\n]* {
      return buildNode('comment', { text: text });
    }

// Values

Values
  = first:Value rest:( __ ',' __ val:Value { return val; } )* {
      return [first].concat(rest);
    }

Value
  = CondExpr
  / AddExpr

// Conditions

CondExpr
  = first:NotExpr rest:( __ op:CondOp __ e:NotExpr { return [op, e]; } )* {
      return buildLogicalOp(first, rest);
    }

CondOp
  = 'and' WB { return 'and'; }
  / 'or'  WB { return 'or';  }

NotExpr
  = 'not' WB __ comp:RelExpr {
      return buildNode('logicalOp', { op: 'not', right: comp });
    }
  / RelExpr

RelExpr
  = left:AddExpr __ op:RelOp __ right:AddExpr {
      return buildNode('binaryOp', { op: op, left: left, right: right });
    }
  / '(' __ cond:CondExpr __ ')' {
      return cond;
    }

RelOp
  = '='
  / '!='
  / '<='
  / '<'
  / '>='
  / '>'

// Arithmetic

AddExpr
  = first:MultExpr rest:( __ op:AddOp __ e:MultExpr { return [op, e]; } )* {
      return buildBinaryOp(first, rest);
    }

AddOp
  = '+'
  / '-'
  / '&'

MultExpr
  = first:PowExpr rest:( __ op:MultOp __ e:PowExpr { return [op, e]; } )* {
      return buildBinaryOp(first, rest);
    }

MultOp
  = '*'
  / '/'
  / '%'

PowExpr
  = rest:(e:UnaryExpr __ op:PowOp __ { return [op, e]; } )* last:UnaryExpr {
      return buildBinaryOpRight(rest, last);
    }

PowOp
  = '^'

UnaryExpr
  = op:AddOp __ right:NumberFormat {
      // handle +/- number in the parser
      return buildNode('literal', { value: parseFloat(op + right) });
    }
  / op:AddOp __ right:CallExpr {
      return buildNode('unaryOp', { op: op, right: right });
    }
  / CallExpr

// Invocation

CallExpr
  = target:IndexExpr __ '(' __ args:Values? __ ')' {
      return buildNode('call', { target: target, args: args });
    }
  / IndexExpr

// Indexes

IndexExpr
  = sym:Symbol __ dims:Dimensions? {
      if (!dims) {
        return buildNode('var', { name: sym });
      } else {
        return buildIndex(buildNode('var', { name: sym }), dims);
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
      var first = (rest.length > 0 && rest[0].type == 'literal') ?
                    rest.shift() :
                    buildNode('literal', { value: '' });

      return buildString(first, rest);
    }

StringSegment
  = "`" val:Value "`" {
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
  / 'delete'   WB
  / 'call'     WB
  / 'and'      WB
  / 'or'       WB
  / 'not'      WB

// Whitespace

WB
  = ![a-z_]i

__
  = [ \t]*

EOL
  = ( __ [\n;] )+
