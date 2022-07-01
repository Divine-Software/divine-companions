module.exports = {
    'env': {
        'browser': true,
        'es6': true,
    },
    'extends': [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended',
        'plugin:import/errors',
        'plugin:import/warnings',
        'plugin:jest/recommended',
    ],
    'parser': '@typescript-eslint/parser',
    'plugins': [
        '@typescript-eslint',
    ],
    'rules': {
        'import/no-unresolved': 0,
        '@typescript-eslint/no-empty-interface': 0,
        '@typescript-eslint/no-explicit-any': 0,
        '@typescript-eslint/no-inferrable-types': 0,
        '@typescript-eslint/no-non-null-assertion': 0,
        '@typescript-eslint/explicit-module-boundary-types': [
            'warn', {
                'allowArgumentsExplicitlyTypedAsAny' : true
            }
        ],
        '@typescript-eslint/ban-types': [
            'error', {
                extendDefaults: true,
                types: {
                    'object': false
                }
            }
        ],
        '@typescript-eslint/no-unused-vars': [
            'warn', {
                'argsIgnorePattern': '^_',
                'varsIgnorePattern': '^_',
            }
        ],
        '@typescript-eslint/naming-convention': [
            'error', {
                'selector': 'memberLike',
                'modifiers': ['private'],
                'format': ['camelCase'],
                'leadingUnderscore': 'require'
            }, {
                'selector': 'memberLike',
                'modifiers': ['protected'],
                'format': ['camelCase'],
                'leadingUnderscore': 'require'
              }
          ],
    }
};
