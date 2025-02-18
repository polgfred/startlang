# Language Reference

This is not comprehensive, but it should be enough to get started.

_Start_ is a beginning programming language loosely inspired by BASIC and LOGO.

## Values

Numbers (including decimals, scientific notation, and infinity), strings, lists, records (key -> value), and literals for `none`, `true`, and `false`. Lists and records can contain any other values, including other lists and records.

```
none
true
false
1
1.23
1.2345e+6
infinity
"Hello, world!"
[10, 20, 30]
{ name = "Fred", year = 1973, likes = ["philosophy", "computers"] }
```

## Expressions

Values can be combined using operators. Operators have precedence: when an expression contains multiple operators, those that are higher in the list will be peformed first. Use parentheses to force lower-precedence subexpressions to be evaluated first.

- unary `+` and `-`
- exponentiation `^`
- multiplication `*`, division `/`, and modulo `%`
- addition `+` and subtraction `-`
- concatenation `::`
- comparison `=`, `!=`, `<`, `>`, `<=`, `>=`
- logical `and`, `or`, and `not`

```
1 + 2 -> 3
1 + 2 * 3 -> 7
1 + 2 * 3 ^ 4 -> 163
(((1 + 2) * 3) ^ 4) -> 6561
[1, 2] :: [3, 4] -> [1, 2, 3, 4]
1 + 2 > 5 -> false
1 + 2 > 5 or 3 + 4 < 10 -> true
```

Values can also be the result of calling functions, or of combining functions and operators. There are a number of functions built in, and you can even define your own (see Functions below).

```
sqrt(64) -> 8
sin(33) ^ 2 + cos(33) ^ 2 -> 1
rand(1, 100) -> 42 (maybe!)
```

## Variables

The `let` statement assigns variables to values. The word _let_ is optional.

```
let x = 1
a = b + c * d
```

## Indexes

Variables can be indexed if their value is a string, list, or record.

```
a = [10, 20, 30]
a[2] -> 20

crew = ["Kirk", "Spock", "Bones", "Uhura", "Scotty", "Chekov", "Sulu"]
crew[3] -> "Bones"
crew[3][1] -> "B"
```

Indexes can be other variables or expressions.

```
i = 3
crew[i] -> "Bones"
```

Dot-notation can be used when indexes are literal numbers or strings.

```
crew = ["Kirk", "Spock", "Bones", "Uhura", "Scotty", "Chekov", "Sulu"]
crew.2 -> "Spock"

person = { name = "Lily", age = 17 }
person.name -> "Lily"
person.name.1 -> "L"
```

## Commands

Commands are typically built-in behaviors provided by the system (like printing a value), but they can also execute functions you have defined yourself (see Functions below). Depending on the host where the language is running, some commands may or may not be available, or may behave in different ways.

```
print 1 + 2 * 3
> 6
```

## Loops

The `repeat`, `while`, and `for` statements allow you to evaluate a statement or block of code multiple times, based on certain criteria:

- `repeat` evaluates the body a given number of times, or forever if no value is provided
- `while` evaluates the body as long as the condition evaluates to `true`. If it is initially `false`, the body will never be evaluated
- `for` works in two different ways:
  - with `=`, it evaluates the code for each number in a numeric sequence
  - with `in`, it evaluates the code for each member of a list or record

```
repeat 10 do print "Hello, world!"

i = 1
repeat 10 do
  print "i is " :: i
  i = i + 1
end

i = 1
while i <= 10 do
  print "i is " :: i
  i = i + 1
end

for i = 1 to 10 by 2 do
  print "i is " :: i
end

crew = ["Kirk", "Spock", "Bones", "Uhura", "Scotty", "Chekov", "Sulu"]
for i in crew
  print "i is " :: i
end
```

## Branching

The `if`/`then`/`else` statement expresses conditional branching. The first case that evaluates to `true` is evaluated. If no cases are `true`, it will evaluate the `else` block if one is provided.

```
if i < 5 then
  print "i is less than 5"
else if i > 5 then
  print "i is greater than 5"
else
  print "i equals 5"
end
```

## Functions

The `begin` statement defines a new function with custom behavior. If parameters are provided, any values that are passed to the function when it is invoked, are assiged to those variable names inside the body of the function, in the order that they appear. If a `return` statement is encountered, the returned value becomes the value of the expression that called the function.

```
begin hypotenuse(a, b) do
  return sqrt(a ^ 2 + b ^ 2)
end

print hypotenuse(3, 4)
> 5
```

A function can also be used as a command. In this case, the parentheses can be omitted, and the return value is ignored.

```
begin greet do
  print "Hello, world!"
  return 123
end

greet
> Hello, world!
(the 123 is ignored)
```

Within the body of a function, any assigned variables (including parameters) take on a _temporary_ value for the duration of that function, overriding whatever value it might have outside (called its _global_ value). This is referred to as the function's _scope_, and it prevents functions from tempering with outside data, and creating hard-to-track-down bugs.

```
a = 10

begin hypotenuse(a, b) do
  return sqrt(a ^ 2 + b ^ 2)
end

print hypotenuse(3, 4)
> 5

print a
> 10
(a is still 10!)
```
