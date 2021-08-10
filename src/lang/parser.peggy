{{
  const flowMarker = {
    repeat: 'loop',
    for: 'loop',
    forIn: 'loop',
    while: 'loop',
    call: 'call'
  };

  const inspectMarker = {
    repeat: 'loop',
    for: 'loop',
    forIn: 'loop',
    while: 'loop',
    if: 'stmt',
    begin: 'stmt',
    call: 'stmt',
    exit: 'stmt',
    break: 'stmt',
    next: 'stmt',
    return: 'stmt',
    literal: 'expr',
    var: 'expr',
    let: 'stmt',
    index: 'expr',
    letIndex: 'stmt',
    logicalOp: 'expr',
    binaryOp: 'expr',
    unaryOp: 'expr'
  };

  // build an object for this node
  function buildNode(type, attrs) {
    // if we're a block with one statement, just return the statement itself
    if (type === 'block' && attrs.elems.length === 1) {
      return attrs.elems[0];
    }

    // show the type first
    const node = { type };

    // then the flow marker
    if (flowMarker[type]) {
      node.flow = flowMarker[type];
    }

    // then the inspect marker
    if (inspectMarker[type]) {
      node.inspect = inspectMarker[type];
    }

    // then the passed-in attributes
    Object.assign(node, attrs);

    // then the source metadata
    if (options.meta) {
      node.meta = {
        text: text(),
        location: location()
      };
    }

    return node;
  }

  // take a series of tests, and (optionally) a final else body, and construct an if-tree
  function buildIfTree(tests, fbody) {
    const [cond, tbody] = tests.shift();
    if (tests.length > 0) {
      // insert the next-level tree into the false slot
      fbody = buildIfTree(tests, fbody);
    }
    return buildNode('if', { cond, tbody, fbody });
  }

  // take a chain of equal-precedence exprs and construct a left-folding tree
  function buildBinaryExpr(type, left, rest) {
    if (rest.length === 0) {
      return left;
    } else {
      const [op, right] = rest.shift();
      const node = buildNode(type, { op, left, right });
      return buildBinaryExpr(type, node, rest);
    }
  }

  // take a chain of unary ops and construct a right-folding tree
  function buildUnaryExpr(type, ops, right) {
    if (ops.length === 0) {
      return right;
    } else {
      const op = ops.pop();
      const node = buildNode(type, { op, right });
      return buildUnaryExpr(type, ops, node);
    }
  }

  // take a chain of string segments and construct a concatenation expression
  function buildString(left, rest) {
    if (rest.length === 0) {
      return left;
    } else {
      const right = rest.shift();
      const node = buildNode('binaryOp', { op: '$', left, right });
      return buildString(node, rest);
    }
  }

  // take a base name, indexes, and (optionally) a value, and construct an indexish node
  function buildIndex(name, indexes, value) {
    if (value === undefined) {
      return buildNode('index', { name, indexes });
    } else {
      return buildNode('letIndex', { name, indexes, value });
    }
  }
}}

// Grammar

start
  = EOL?
    block:Block
    { return block }

// Top-level

Block
  = elems:(__ @BlockElement EOL)*
    { return buildNode('block', { elems }) }

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
    { return buildNode('repeat', { times, body }) }
  // repeat (forever)
  / 'repeat' WB __ 'do' WB __ body:EndBody
    { return buildNode('repeat', { body }) }

For
  // for i from a to b by c
  = 'for' WB __ name:Symbol __ 'from' WB __ from:Value __ 'to' WB __ to:Value
      by:(__ 'by' WB __ @Value)? __ 'do' WB __ body:EndBody
    { return buildNode('for', { name, from, to, by, body }) }
  // for i in x
  / 'for' WB __ name:Symbol __ 'in' WB __ range:Value __ 'do' WB __ body:EndBody
    { return buildNode('forIn', { name, range, body }) }

While
  = 'while' WB __ cond:Value __ 'do' WB __ body:EndBody
    { return buildNode('while', { cond, body }) }

Begin
  = 'begin' WB __ name:Symbol
      params:(__ '(' EOL? __ @Params? __ ')')? __ 'do' WB __ body:EndBody
    { return buildNode('begin', { name, params, body }) }

EndBody
  = Statement
  / EOL b:Block __ 'end'
    { return b }

Params
  = first:Symbol rest:(__ ',' __ EOL? __ @Symbol)*
    { return [first, ...rest] }

Statement
  = Flow
  / Let
  / Local
  / Call

Flow
  = 'exit' WB
    { return buildNode('exit') }
  / 'break' WB
    { return buildNode('break') }
  / 'next' WB
    { return buildNode('next') }
  / 'return' WB result:(__ @Value)?
    { return buildNode('return', { result }) }

Let
  = ('let' WB)? __ name:Symbol __ indexes:Indexes? __ '=' __ value:Value
    {
      return (
        indexes
          ? buildIndex(name, indexes, value)
          : buildNode('let', { name, value })
        )
    }

Local
  = 'local' WB __ name:Symbol value:(__ '=' __ @Value)?
    {
      value = value || buildNode('literal', { value: undefined });
      return buildNode('let', { name, value, top: true });
    }

Call
  // if we match non-parenthesized args optionally right away, it will
  // never get past the first rule, so...
  //  1- try to match one or more non-parenthesized arguments first
  //      - this fixes the case of "print (1+2)/3"
  //  2- try to match zero or more parenthesized arguments
  //  3- match a bare call with no parens or args
  = name:Symbol __ args:Values
    { return buildNode('call', { name, args }) }
  / name:Symbol __ '(' __ EOL? __ args:Values? __ ')'
    { return buildNode('call', { name, args }) }
  / name:Symbol
    { return buildNode('call', { name, args: null }) }

// Values

Values
  = first:Value rest:(__ ',' __ EOL? __ @Value)*
    { return [first, ...rest] }

Value 'a value'
  = ConjExpr

// Conditions

ConjExpr
  = first:NotExpr rest:(__ @ConjOp __ @NotExpr)*
    { return buildBinaryExpr('logicalOp', first, rest) }

ConjOp
  = 'and' WB
    { return 'and' }
  / 'or' WB
    { return 'or' }

NotExpr
  = op:NotOp __ right:RelExpr
    { return buildNode('logicalOp', { op, right }) }
  / RelExpr

NotOp
  = 'not' WB
    { return 'not' }

RelExpr
  = left:ConcatExpr __ op:RelOp __ right:ConcatExpr
    { return buildNode('binaryOp', { op, left, right }) }
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
  = first:BitExpr rest:(__ @ConcatOp __ @BitExpr)*
    { return buildBinaryExpr('binaryOp', first, rest) }

ConcatOp
  = '$'

// Math

BitExpr
  = first:AddExpr rest:(__ @BitOp __ @AddExpr)*
    { return buildBinaryExpr('binaryOp', first, rest) }

BitOp
  = '&'
  / '|'
  / '^'

AddExpr
  = first:MultExpr rest:(__ @AddOp __ @MultExpr)*
    { return buildBinaryExpr('binaryOp', first, rest) }

AddOp
  = '+'
  / '-'

MultExpr
  = first:UnaryExpr rest:(__ @MultOp __ @UnaryExpr)*
    { return buildBinaryExpr('binaryOp', first, rest) }

MultOp
  = '*'
  / '/'
  / '%'

UnaryExpr
  = ops:(__ @UnaryOp)* __ right:CallExpr
    { return buildUnaryExpr('unaryOp', ops, right) }

UnaryOp
  = '+'
  / '-'
  / '~'

// Invocation

CallExpr
  = name:Symbol __ '(' __ EOL? __ args:Values? __ ')'
    { return buildNode('call', { name, args }) }
  / IndexExpr

// Indexes

IndexExpr
  = name:Symbol __ indexes:Indexes?
    {
      return (
        indexes
          ? buildIndex(name, indexes)
          : buildNode('var', { name })
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
    { return [buildNode('literal', { value: name })] }

PrimaryExpr
  = String
  / Literal
  / '(' __ val:Value __ ')'
    { return val }

// Strings

String 'a string'
  = '"' rest:StringSegment* '"'
    {
      // if the first segment isn't a string literal, prepend an empty string
      const first = (rest.length > 0
                      && rest[0].type === 'literal'
                      && typeof rest[0].value === 'string')
                        ? rest.shift()
                        : buildNode('literal', { value: '' })
      return buildString(first, rest);
    }

StringSegment
  = "`" __ val:Value __ "`"
    // interpolation of value expressions
    { return val }
  / chars:Char+
    { return buildNode('literal', { value: chars.join('') }) }

Char
  = '""'
    { return '"' }
  / '``'
    { return '`' }
  / [^"`]

// Data

Literal
  = None
  / Boolean
  / Number

None
  = 'none' WB
    { return buildNode('literal', { value: null }) }

Boolean
  = 'true'  WB
    { return buildNode('literal', { value: true }) }
  / 'false' WB
    { return buildNode('literal', { value: false }) }

Number 'a number'
  = 'infinity' WB
    { return buildNode('literal', { value: Infinity }) }
  / num:NumberFormat
    { return buildNode('literal', { value: parseFloat(num) }) }

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
