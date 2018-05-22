module.exports = {
  "parser": "babel-eslint",
  "parserOptions": {
    "ecmaVersion": 6,
    "sourceType": "module",
    "ecmaFeatures": {
      "jsx": true,
    }
  },
  "env": {
    "es6": true,
    "browser": true,
    "node": true,
  },
  "globals": {
    "Blockly": false,
  },
  "plugins": [
    "import",
    "react",
  ],
  "settings": {
    "import/resolver": {
      "node": {
        "extensions": [ ".js", ".jsx" ],
      }
    },
  },
  "rules": {
    "no-unused-vars": "warn",
    "no-undef": "error",
    "no-unreachable": "error",
    "no-debugger": "error",
    "no-alert": "error",
    "react/jsx-uses-react": "error",
    "react/jsx-uses-vars": "error",
    "react/jsx-no-undef": "error",
    "react/jsx-no-target-blank": "error",
    "import/no-unresolved": "error",
    "import/named": "error",
    "import/default": "error",
  },
};
