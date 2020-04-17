parser grammar StartlangParser;

options { tokenVocab = StartlangLexer; }

prog : EOL? block ;

block : ( statement EOL )* ;

statement
  : ifStatement
  | ifBlock
  | repeatLoop
  | forLoop
  | forInLoop
  | whileLoop
  | beginBlock
  | assignment
  | localAssignment
  | functionCall
  | flowStatement
  ;

ifStatement : IF value THEN statement ( ELSE statement )? ;

ifBlock
  : IF value THEN ifBody
    ( ELSE IF value THEN ifBody )*
    ( ELSE ifBody )?
    END
  ;

ifBody : statement EOL | EOL block ;

repeatLoop : REPEAT value? loopBody ;

forLoop : FOR SYMBOL FROM value TO value ( BY value )? loopBody ;

forInLoop : FOR SYMBOL IN value loopBody ;

whileLoop : WHILE value loopBody ;

beginBlock : BEGIN SYMBOL ( LPAREN EOL? params? RPAREN )? loopBody ;

loopBody : DO ( statement | EOL block END ) ;

params : SYMBOL ( COMMA EOL? SYMBOL )* ;

assignment : LET? SYMBOL indexes? EQ value ;

localAssignment : LOCAL SYMBOL ( EQ value )? ;

functionCall
  // if we match non-parenthesized args optionally right away, it will
  // never get past the first rule, so...
  //  1- try to match non-parenthesized arguments first *if present*
  //      - this fixes the case of "print (1+2)/3"
  //  2- try to match zero or more parenthesized arguments
  //  3- match a bare call with no parens or args
  : SYMBOL values
  | SYMBOL LPAREN EOL? values? RPAREN
  | SYMBOL
  ;

flowStatement : EXIT | BREAK | NEXT | RETURN value? ;

values : value ( COMMA EOL? value )* ;

value
  : LPAREN value RPAREN #nestValue
  | SYMBOL indexes? #varValue
  | SYMBOL LPAREN EOL? values? RPAREN #callValue
  | op=(ADD|SUB) value #unaryOpValue
  | op=BITNOT value #unaryOpValue
  | value op=(MUL|DIV|MOD) value #binaryOpValue
  | value op=(ADD|SUB) value #binaryOpValue
  | value op=(BITAND|BITOR|BITXOR) value #binaryOpValue
  | value op=CONCAT value #binaryOpValue
  | value op=(EQ|NE|LE|LT|GE|GT) value #binaryOpValue
  | op=NOT value #logicalOpValue
  | value op=(AND|OR) value #logicalOpValue
  | string #stringValue
  | literal #literalValue
  ;

indexes : indexSegment+ ;

indexSegment
  : LBRACK value ( COMMA value )* RBRACK
  | DOT SYMBOL
  ;

string : LQUOT stringSegment* RQUOT ;

stringSegment
  : LTICK value RTICK
  | CHAR+
  ;

literal : NONE | TRUE | FALSE | INFINITY | NUMBER ;
