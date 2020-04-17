lexer grammar StartlangLexer;

NONE : 'none';
TRUE : 'true';
FALSE : 'false';
INFINITY : 'infinity';

IF : 'if';
THEN : 'then';
ELSE : 'else';
END : 'end';
REPEAT : 'repeat';
DO : 'do';
FOR : 'for';
FROM : 'from';
TO : 'to';
BY : 'by';
IN : 'in';
WHILE : 'while';
BEGIN : 'begin';

EXIT : 'exit';
BREAK : 'break';
NEXT : 'next';
RETURN : 'return';

LET : 'let';
LOCAL : 'local' ;

LPAREN : '(' ;
RPAREN : ')' ;
LBRACK : '[' ;
RBRACK : ']' ;
COMMA : ',' ;
DOT : '.' ;

AND : 'and';
OR : 'or';
NOT : 'not';

EQ : '=' ;
NE : '!=' ;
GE : '>=' ;
GT : '>' ;
LE : '<=' ;
LT : '<' ;

ADD : '+' ;
SUB : '-' ;
MUL : '*' ;
DIV : '/' ;
MOD : '%' ;

BITNOT : '~' ;
BITAND : '&' ;
BITOR : '|' ;
BITXOR : '^' ;

CONCAT: '$' ;

LQUOT : '"' -> pushMode(STRING) ;

RTICK : '`' -> popMode ;

SYMBOL : [A-Za-z] [A-Za-z0-9_]* ;

NUMBER : DIGIT+ ( '.' DIGIT+ )? ( [Ee] [-+]? DIGIT+ )? ;

DIGIT : [0-9] ;

EOL : '\n'+ ;

WS : [ \t]+ -> skip ;

mode STRING;

CHAR : '""' | '``' | ~["`] ;

RQUOT : '"' -> popMode ;

LTICK : '`' -> pushMode(DEFAULT_MODE) ;
