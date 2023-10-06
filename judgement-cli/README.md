# The Divine Judgement

Divine Judgement is a simple, yet powerful tool for enforcing TypeScript types at runtime. It:

1. Reads and parses interfaces, enums and other types directly from your TypeScript source files.
2. Generates a single file that contains a JSON schema, a type map and two utility functions, `as` and `is`. You should
   include this file in your project.
3. You may then use those utilities to validate untrusted data at runtime, according to the TypeScript types defined in
   your project.

## Installation

Add `@divine/judgement` to `dependencies` and `@divine/judgement-cli` to `devDependencies`:

```sh
npm install @divine/judgement
npm install --save-dev @divine/judgement-cli
```

## Usage

Generate the schema and validation utilities:

```sh
npm exec -- judgement-cli -p 'types/*.ts' -o schema.ts
```

Then, in your code:

```ts
import { as, is } from './schema';
import { readFileSync } from 'fs';

const configName = './config.json';
const configFile = as('MyConfigFile',
                      JSON.parse(readFileSync(configName, 'utf8')),
                      configName);

// configFile is typed as MyConfigFile and is guaranteed to be valid,
// or else a SchemaError would have been thrown.

const config: unknown = configFile;

if (is('MyConfigFile', config)) {
    // config is now typed as MyConfigFile and guaranteed to be valid.
}
```

## Acknowledgements

This project is based on [ts-json-schema-generator](https://github.com/vega/ts-json-schema-generator) and uses
[Ajv](https://ajv.js.org/) for validation.
