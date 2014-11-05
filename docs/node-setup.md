Setup for NodeJS Development
============================

- Install everything in the [Setup for Browser Development](browser-setup.md) doc
- sudo npm link requirejs

Now you have requirejs linked locally, so you can require it without any enviroment voodoo.

To execute one or two statements, invoke the node.js boostrap with:

    node runit.js 'print 1+2*3'

You'll see a dump of the program tree, followed by any program output, followed by a dump
of the program environment after exiting.

To execute a whole script file, pass a filename instead:

    node runit.js tests/data.start
