export const plugins = {
  'postcss-preset-env': {
    stage: 4,
    autoprefixer: true,
    preserve: false,
    features: {
      'nesting-rules': true,
    },
  },
  'postcss-mixins': {},
};
