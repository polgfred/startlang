chunk
  = block //EOF

block
  = statement* retstat?

statement
  = ';'
  / varList '=' expList
  / functionCall
  / label
  / 'break'
  / 'goto' NAME
  / 'do' block 'end'
  / 'while' exp 'do' block 'end'
  / 'repeat' block 'until' exp
  / 'if' exp 'then' block ('elseif' exp 'then' block)* ('else' block)? 'end'
  / 'for' NAME '=' exp ',' exp (',' exp)? 'do' block 'end'
  / 'for' nameList 'in' expList 'do' block 'end'
  / 'function' funcName funcBody
  / 'local' 'function' NAME funcBody
  / 'local' attNameList ('=' expList)?

attNameList
  = NAME attrib (',' NAME attrib)*

attrib
  = ('<' NAME '>')?

retstat
  = 'return' expList? ';'?

label
  = '::' NAME '::'

funcName
  = NAME ('.' NAME)* (':' NAME)?

varList
  = var_ (',' var_)*

nameList
  = NAME (',' NAME)*

expList
  = exp (',' exp)*

exp
  = 'nil'
	/ 'false'
	/ 'true'
  / number
  / string
  / '...'
  / functionDef
  / tableConstructor
	/ powerExp
  // / prefixExp
  // / <assoc=right> exp operatorPower exp
  // / operatorUnary exp
  // / exp operatorMulDivMod exp
  // / exp operatorAddSub exp
  // / <assoc=right> exp operatorStrcat exp
  // / exp operatorComparison exp
  // / exp operatorAnd exp
  // / exp operatorOr exp
  // / exp operatorBitwise exp

powerExp
	= unaryExp operatorPower unaryExp

unaryExp
	= operatorUnary mulDivExp

mulDivExp
	= addSubExp operatorMulDivMod addSubExp

addSubExp
	= strcatExp operatorAddSub strcatExp

strcatExp
	= comparisonExp operatorStrcat comparisonExp

comparisonExp
	= andExp operatorComparison andExp

andExp
	= orExp operatorAnd orExp

orExp
	= bitwiseExp operatorOr bitwiseExp

bitwiseExp
	= prefixExp operatorBitwise prefixExp

prefixExp
  = varOrExp nameAndArgs*

functionCall
  = varOrExp nameAndArgs+

varOrExp
  = var_
	/ '(' exp ')'

var_
  = (NAME / '(' exp ')' varSuffix) varSuffix*

varSuffix
  = nameAndArgs* ('[' exp ']' / '.' NAME)

nameAndArgs
  = (':' NAME)? args

args
  = '(' expList? ')'
	/ tableConstructor
	/ string

functionDef
  = 'function' funcBody

funcBody
  = '(' parList? ')' block 'end'

parList
  = nameList (',' '...')?
	/ '...'

tableConstructor
  = '{' fieldList? '}'

fieldList
  = field (fieldSep field)* fieldSep?

field
  = '[' exp ']' '=' exp
	/ NAME '=' exp
	/ exp

fieldSep
  = ',' / ';'

operatorOr
  = 'or'

operatorAnd
  = 'and'

operatorComparison
  = '<' / '>' / '<=' / '>=' / '~=' / '=='

operatorStrcat
  = '..'

operatorAddSub
  = '+' / '-'

operatorMulDivMod
  = '*' / '/' / '%' / '//'

operatorBitwise
  = '&' / '|' / '~' / '<<' / '>>'

operatorUnary
  = 'not' / '#' / '-' / '~'

operatorPower
  = '^'

number
  = INT / HEX / FLOAT / HEX_FLOAT

string
  = NORMALSTRING / CHARSTRING / LONGSTRING

NAME
  = [a-zA-Z_][a-zA-Z_0-9]*

NORMALSTRING
  = '"' ( EscapeSequence / [^\\"] )* '"'

CHARSTRING
  = '\'' ( EscapeSequence / [~\\'] )* '\''

LONGSTRING
  = '[' NESTED_STR ']'

NESTED_STR
  = '=' NESTED_STR '='
  // / '[' .*? ']'
  / '[' [^\]]* ']'

INT
  = Digit+

HEX
  = '0' [xX] HexDigit+

FLOAT
  = Digit+ '.' Digit* ExponentPart?
  / '.' Digit+ ExponentPart?
  / Digit+ ExponentPart

HEX_FLOAT
  = '0' [xX] HexDigit+ '.' HexDigit* HexExponentPart?
  / '0' [xX] '.' HexDigit+ HexExponentPart?
  / '0' [xX] HexDigit+ HexExponentPart

ExponentPart
  = [eE] [+-]? Digit+

HexExponentPart
  = [pP] [+-]? Digit+

EscapeSequence
  = '\\' [abfnrtvz"'\\]
  / '\\' '\n'
  / DecimalEscape
  / HexEscape
  / UtfEscape

DecimalEscape
  = '\\' Digit
  / '\\' Digit Digit
  / '\\' [0-2] Digit Digit

HexEscape
  = '\\' 'x' HexDigit HexDigit

UtfEscape
  = '\\' 'u{' HexDigit+ '}'

Digit
  = [0-9]

HexDigit
  = [0-9a-fA-F]

COMMENT
  = '--[' NESTED_STR ']' //-> channel(HIDDEN)

LINE_COMMENT
  = '--'
		(                           // --
			'[' '='*                  // --[==
		/ '[' '='* [^=\[\n] [^\n]*  // --[==AA
		/ [^\[\n] [^\n]*             // --AAA
		) '\n' // -> channel(HIDDEN)

__
  = [ \t\u000C\n]+ //-> skip
