import babelParser from '@babel/eslint-parser';
import globals from 'globals';

/** @type {import('xo').FlatXoConfig} */
const xoConfig = [
  {
    languageOptions: {
      globals: globals.mocha,
      parser: babelParser,
    },
  },
  {
    ignores: [
      'dist/**',
      'lib/graveyard/*',
    ],
  },
  {
    space: true,
    rules: {
      'capitalized-comments': 'off',
      'no-unused-expressions': [
        2,
        {
          allowShortCircuit: true,
        },
      ],
      'new-cap': [
        'error',
        {
          capIsNewExceptions: [
            'ActionClient',
            'Service',
            'Topic',
          ],
        },
      ],
    },
  },
  {
    files: 'test/*.js',
    rules: {
      'import/extensions': 'off',
    },
  },
];

export default xoConfig;
