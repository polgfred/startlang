// Language Nodes

{
  var runtime = require('./runtime');

  function mixin(object, properties) {
    Object.keys(properties).forEach(function(prop) {
      object[prop] = properties[prop];
    });
  }

  function Node() {}

  Node.extend = function(options) {
    var delegate = options.constructor,
        ctor = function() {
          // grab the info about where we are in the source
          this.meta = {
            node: this.node,
            text: text(),
            offset: offset(),
            line: line(),
            column: column()
          };

          delegate.apply(this, arguments);
        };

    ctor.prototype = Object.create(Node.prototype);
    options.constructor = ctor;
    mixin(ctor.prototype, options);
    return ctor;
  };

  var BlockNode = Node.extend({
    node: 'BlockNode',

    constructor: function(elems) {
      this.elems = elems || [];
    }
  });

  var IfElseNode = Node.extend({
    node: 'IfElseNode',

    constructor: function(cond, tbody, fbody) {
      this.cond = cond;
      this.tbody = tbody;
      this.fbody = fbody;
    }
  });

  var ForInNode = Node.extend({
    node: 'ForInNode',

    constructor: function(name, range, body) {
      this.name = name;
      this.range = range;
      this.body = body;
    }
  });

  var WhileNode = Node.extend({
    node: 'WhileNode',

    constructor: function(cond, body) {
      this.cond = cond;
      this.body = body;
    }
  });

  var BeginNode = Node.extend({
    node: 'BeginNode',

    constructor: function(name, body) {
      this.name = name;
      this.body = body;
    }
  });

  var FuncallNode = Node.extend({
    node: 'FuncallNode',

    constructor: function(target, args) {
      this.target = target;
      this.args = args || [];
    }
  });

  var BreakNode = Node.extend({
    node: 'BreakNode'
  });

  var NextNode = Node.extend({
    node: 'NextNode'
  });

  var ReturnNode = Node.extend({
    node: 'ReturnNode',

    constructor: function(result) {
      this.result = result;
    }
  });

  var VariableNode = Node.extend({
    node: 'VariableNode',

    constructor: function(name) {
      this.name = name;
    }
  });

  var AssignNode = Node.extend({
    node: 'AssignNode',

    constructor: function(name, value) {
      this.name = name;
      this.value = value;
    }
  });

  var DeleteNode = Node.extend({
    node: 'DeleteNode',

    constructor: function(name) {
      this.name = name;
    }
  });

  var IndexNode = Node.extend({
    node: 'IndexNode',

    constructor: function(base, index) {
      this.base = base;
      this.index = index;
    }
  });

  var AssignIndexNode = Node.extend({
    node: 'AssignIndexNode',

    constructor: function(base, index, value) {
      this.base = base;
      this.index = index;
      this.value = value;
    }
  });

  var DeleteIndexNode = Node.extend({
    node: 'DeleteIndexNode',

    constructor: function(base, index) {
      this.base = base;
      this.index = index;
    }
  });

  // special token to signal buildIndex that we have a DeleteIndex call
  var $remove = {};

  // take a base, dimensions, and (optionally) a value, and construct a
  // left-folding tree that terminates in an index lookup, assign, or delete
  function buildIndex(base, dims, value) {
    var next, last = dims.pop();

    while (next = dims.shift()) {
      base = new IndexNode(base, next);
    }

    if (value === undefined) {
      return new IndexNode(base, last);
    } else if (value === $remove) {
      return new DeleteIndexNode(base, last);
    } else {
      return new AssignIndexNode(base, last, value);
    }
  }

  var LiteralNode = Node.extend({
    node: 'LiteralNode',

    constructor: function(value) {
      this.value = value;
    }
  });

  var CommentNode = Node.extend({
    node: 'CommentNode',

    constructor: function(text) {
      this.text = text;
    }
  });

  var LogicalOpNode = Node.extend({
    node: 'LogicalOpNode',

    constructor: function(op, left, right) {
      this.op = op;
      this.left = left;
      this.right = right;
    }
  });

  // take a chain of equal-precedence logical exprs and construct a left-folding tree
  function buildLogicalOp(first, rest) {
    if (rest.length == 0) {
      return first;
    } else {
      var next = rest.shift();
      return buildLogicalOp(new LogicalOpNode(next[0], first, next[1]), rest);
    }
  }

  var BinaryOpNode = Node.extend({
    node: 'BinaryOpNode',

    constructor: function(op, left, right) {
      this.op = op;
      this.left = left;
      this.right = right;
    }
  });

  // take a chain of equal-precedence binary exprs and construct a left-folding tree
  function buildBinaryOp(first, rest) {
    if (rest.length == 0) {
      return first;
    } else {
      var next = rest.shift();
      return buildBinaryOp(new BinaryOpNode(next[0], first, next[1]), rest);
    }
  }

  // same, but fold right
  function buildBinaryOpRight(rest, last) {
    if (rest.length == 0) {
      return last;
    } else {
      var next = rest.pop();
      return buildBinaryOpRight(rest, new BinaryOpNode(next[0], next[1], last));
    }
  }

  var UnaryOpNode = Node.extend({
    node: 'UnaryOpNode',

    constructor: function(op, right) {
      this.op = op;
      this.right = right;
    }
  });
}

// Grammar

start
  = Block

// Top-level

Block
  = elems:( __ elem:BlockElement EOL { return elem; } )* {
      return new BlockNode(elems);
    }

BlockElement
  = Control
  / Statement
  / Comment

Control
  = IfElse
  / ForIn
  / While
  / Begin

// Control structures each have a single-line form and a block form

IfElse
  = __ 'if' WB __ cond:Value __ 'then' WB __ tbody:Statement __ 'else' WB __ fbody:Statement {
      return new IfElseNode(cond, tbody, fbody);
    }
  / __ 'if' WB __ cond:Value __ 'then' WB __ tbody:Statement {
      return new IfElseNode(cond, tbody);
    }
  / __ 'if' WB __ cond:Value __ 'then' EOL
    tbody:Block
    __ 'else' EOL
    fbody:Block
    __ 'end' {
      return new IfElseNode(cond, tbody, fbody);
    }
  / __ 'if' WB __ cond:Value __ 'then' EOL
    tbody:Block
    __ 'end' {
      return new IfElseNode(cond, tbody);
    }

ForIn
  = __ 'for' WB __ sym:Symbol __ 'in' WB __ range:Value __ 'do' WB __ body:Statement {
      return new ForInNode(sym, range, body);
    }
  / __ 'for' WB __ sym:Symbol __ 'in' WB __ range:Value __ 'do' EOL
    body:Block
    __ 'end' {
      return new ForInNode(sym, range, body);
    }

While
  = __ 'while' WB __ cond:Value __ 'do' WB __ body:Statement {
      return new WhileNode(cond, body);
    }
  / __ 'while' WB __ cond:Value __ 'do' EOL
    body:Block
    __ 'end' {
      return new WhileNode(cond, body);
    }

Begin
  = __ 'begin' WB __ sym:Symbol __ 'do' WB __ body:Statement {
      return new BeginNode(sym, body);
    }
  / __ 'begin' WB __ sym:Symbol __ 'do' EOL
    body:Block
    __ 'end' {
      return new BeginNode(sym, body);
    }

Statement
  = Assign
  / Delete
  / Call
  / Flow

Assign
  = __ 'let' WB __ sym:Symbol __ dims:Dimensions? __ '=' __ value:Value {
      if (!dims) {
        return new AssignNode(sym, value);
      } else {
        return buildIndex(new VariableNode(sym), dims, value);
      }
    }

Delete
  = __ 'delete' WB __ sym:Symbol __ dims:Dimensions? {
      if (!dims) {
        return new DeleteNode(sym);
      } else {
        return buildIndex(new VariableNode(sym), dims, $remove);
      }
    }

Call
  = 'call' WB __ expr:IndexExpr __ args:Values? {
      return new FuncallNode(expr, args);
    }
  / sym:Symbol __ args:Values? {
      return new FuncallNode(new VariableNode(sym), args);
    }

Flow
  = __ 'break' WB {
      return new BreakNode;
    }
  / __ 'next' WB {
      return new NextNode;
    }
  / __ 'return' WB __ result:Value? {
      return new ReturnNode(result);
    }

Comment
  = __ '--' __ text:$[^\n]* {
      return new CommentNode(text);
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
      return new LogicalOpNode('not', null, comp);
    }
  / RelExpr

RelExpr
  = left:AddExpr __ op:RelOp __ right:AddExpr {
      return new BinaryOpNode(op, left, right);
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
  = op:AddOp __ num:Number {
      // handle +/- number in the parser
      return new LiteralNode(runtime.handle(num).unaryops[op](num));
    }
  / op:AddOp __ right:CallExpr {
      return new UnaryOpNode(op, right);
    }
  / CallExpr

// Invocation

CallExpr
  = target:IndexExpr __ '(' __ args:Values? __ ')' {
      return new FuncallNode(target, args);
    }
  / IndexExpr

// Indexes

IndexExpr
  = sym:Symbol __ dims:Dimensions? {
      if (!dims) {
        return new VariableNode(sym);
      } else {
        return buildIndex(new VariableNode(sym), dims);
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
      return new LiteralNode(sym);
    }

PrimaryExpr
  = lit:Literal {
      return new LiteralNode(lit);
    }
  / '(' __ val:Value __ ')' {
      return val;
    }

// Data

Literal
  = None
  / Boolean
  / Number
  / String

None
  = 'none' WB { return null; }

Boolean
  = 'true'  WB { return true; }
  / 'false' WB { return false; }

Number
  = 'infinity' WB { return Infinity; }
  / num:$( Digits ( '.' Digits )? ( [eE] [-+]? Digits )? ) {
      return parseFloat(num);
    }

Digits
  = $[0-9]+

String
  = '"' chars:Char* '"' { return chars.join(''); }

Char
  = '""' { return '"'; }
  / [^"]

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
