chunk
  = block __

block
  = (__ statement)* (__ retstat)?

statement
  = ';'
  / varList __ '=' __ expList
  / functionCall
  / label
  / 'break'
  / 'goto' __ NAME
  / 'do' __ block __ 'end'
  / 'while' __ exp __ 'do' block __ 'end'
  / 'repeat' __ block 'until' __ exp
  / 'if' __ exp __ 'then' __ block (__ 'elseif' __ exp __ 'then' __ block)* (__ 'else' __ block)? __'end'
  / 'for' __ NAME __ '=' __ exp __ ',' __ exp (__ ',' __ exp)? __ 'do' __ block __ 'end'
  / 'for' __ nameList __ 'in' __ expList __ 'do' __ block __ 'end'
  / 'function' __ funcName __ funcBody
  / 'local' __ 'function' __ NAME __ funcBody
  / 'local' __ attNameList (__ '=' __ expList)?

attNameList
  = NAME __ attrib (__ ',' __ NAME __ attrib)*

attrib
  = (__ '<' __ NAME __ '>')?

retstat
  = 'return' (__ expList)? (__ ';')?

label
  = '::' __ NAME __ '::'

funcName
  = NAME (__ '.' __ NAME)* (__ ':' __ NAME)?

varList
  = var_ (__ ',' __ var_)*

nameList
  = NAME (__ ',' __ NAME)*

expList
  = exp (__ ',' __ exp)*

exp
  = '...'
  / functionDef
  / tableConstructor
  / powerExp

powerExp
  = unaryExp __ operatorPower __ unaryExp
  / unaryExp

unaryExp
  = operatorUnary __ mulDivExp
  / mulDivExp

mulDivExp
  = addSubExp __ operatorMulDivMod __ addSubExp
  / addSubExp

addSubExp
  = strcatExp __ operatorAddSub __ strcatExp
  / strcatExp

strcatExp
  = comparisonExp __ operatorStrcat __ comparisonExp
  / comparisonExp

comparisonExp
  = andExp __ operatorComparison __ andExp
  / andExp

andExp
  = orExp __ operatorAnd __ orExp
  / orExp

orExp
  = bitwiseExp __ operatorOr __ bitwiseExp
  / bitwiseExp

bitwiseExp
  = functionCall __ operatorBitwise __ functionCall
  / functionCall

functionCall
  = baseExp (__ nameAndArgs)*

baseExp
  = 'nil'
  / 'false'
  / 'true'
  / number
  / string
  / var_
  / '(' __ exp __ ')'

var_
  = (NAME / '(' __ exp __ ')' __ varSuffix) (__ varSuffix)*

varSuffix
  = (__ nameAndArgs)* (__ '[' __ exp __ ']' / __ '.' __ NAME)

nameAndArgs
  = (':' __ NAME)? __ args

args
  = '(' (__ expList)? __ ')'
  / tableConstructor
  / string

functionDef
  = 'function' funcBody

funcBody
  = '(' (__ parList)? __ ')' __ block __ 'end'

parList
  = nameList (__ ',' __ '...')?
  / '...'

tableConstructor
  = '{' (__ fieldList)? __ '}'

fieldList
  = field (__ fieldSep __ field)* (__ fieldSep)?

field
  = '[' __ exp __ ']' __ '=' __ exp
  / NAME __ '=' __ exp
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
  = $([a-z_]i [a-z_0-9]i*)

NORMALSTRING
  = '"' ( EscapeSequence / [^\"] )* '"'

CHARSTRING
  = "'" ( EscapeSequence / [^\'] )* "'"

LONGSTRING
  = '[' NESTED_STR ']'

NESTED_STR
  = '=' NESTED_STR '='
  / '[' [^\]]* ']'

INT
  = $(Digit+)

HEX
  = '0' [x]i HexDigit+

FLOAT
  = Digit+ '.' Digit* ExponentPart?
  / '.' Digit+ ExponentPart?
  / Digit+ ExponentPart

HEX_FLOAT
  = '0' [x]i HexDigit+ '.' HexDigit* HexExponentPart?
  / '0' [x]i '.' HexDigit+ HexExponentPart?
  / '0' [x]i HexDigit+ HexExponentPart

ExponentPart
  = [e]i [+-]? Digit+

HexExponentPart
  = [p]i [+-]? Digit+

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
  = [0-9a-f]i

COMMENT
  = '--[' NESTED_STR ']' { return null }

LINE_COMMENT
  = '--'
    (
      '[' '='*
    / '[' '='* [^=\[\n] [^\n]*
    / [^\[\n] [^\n]*
    ) '\n' { return null }

__
  = $([ \t\n\u000C]*) { return null }
