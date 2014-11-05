Setup for Browser Development
=============================

- Install Node + NPM: http://nodejs.org/download/
- sudo npm install -g pegjs requirejs watchy

To manually generate the start-lang.js file, run:

    pegjs start-lang.peg start-lang.js

But PEGjs generates a CommonJS module, so it has to be converted to use RequireJS. The
easiest way to do this is to send the parser to a cjs directory, and run the r.js conversion
tool:

    pegjs start-lang.peg cjs/start-lang.js
    r.js -convert cjs js

The following watchy command will watch the PEG file for changes, and do the above:

    watchy -w start-lang.peg -- 'pegjs start-lang.peg cjs/start-lang.js ; r.js -convert cjs js'
