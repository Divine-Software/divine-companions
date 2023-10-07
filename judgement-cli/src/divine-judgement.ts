import { Command, Option } from 'commander';
import { mkdirSync, writeFileSync } from 'fs';
import { dirname, relative } from 'path';
import stableStringify from 'safe-stable-stringify';
import { Config, DEFAULT_CONFIG, Definition, TypeMap, createGenerator } from 'ts-json-schema-generator';
import * as pkg from '../package.json';

export async function main(): Promise<number> {
    const args = new Command()
        .requiredOption('-p, --path <path>', 'Source file path')
        .option('-t, --type <name>', 'Type name')
        .option('-i, --id <name>', '$id for generated schema')
        .option('-f, --tsconfig <path>', 'Custom tsconfig.json path')
        .addOption(
            new Option('-j, --jsDoc <extended>', 'Read JsDoc annotations')
                .choices(['none', 'basic', 'extended'])
                .default('extended')
        )
        .option('--no-type-check', 'Skip type checks to improve performance')
        .option('-o, --out <file>', 'Set the output file (default: stdout)')
        .option(
            '--validation-keywords [value]',
            'Provide additional validation keywords to include',
            (value: string, list: string[]) => list.concat(value),
            []
        )
        .option(
            '--additional-properties',
            'Allow additional properties for objects with no index signature (default: false)',
            false
        )
        .name(pkg.name)
        .version(pkg.version)
        .parse(process.argv)
        .opts();

    const config: Config = {
        ...DEFAULT_CONFIG,
        path: args['path'],
        tsconfig: args['tsconfig'],
        type: args['type'],
        schemaId: args['id'],
        jsDoc: args['jsDoc'],
        skipTypeCheck: !args['typeCheck'],
        extraTags: args['validationKeywords'],
        additionalProperties: args['additionalProperties'],
    };

    const typeMaps: TypeMap[] = [];
    const schema = createGenerator(config).createSchema(args['type'], typeMaps);

    const outDir = args['out'] ? dirname(args['out']) : process.cwd();
    const script = createModule(schema, typeMaps, outDir)

    if (args['out']) {
        mkdirSync(outDir, { recursive: true });
        writeFileSync(args['out'], script);
    } else {
        process.stdout.write(script);
    }

    return 0;
}

export function createModule(schema: Definition, typeMaps: TypeMap[], cwd: string): string {
    let code = `import { createSchemaValidators as $createSchemaValidators } from '@divine/judgement';\n`;

    for (const typeMap of typeMaps) {
        const fileName = relative(cwd, typeMap.fileName);

        if (typeMap.exports) {
            code += `import type { ${typeMap.exports.join(`, `)} } from './${fileName}';\n`;
        } else {
            code += `import './${fileName}';\n`;
        }
    }

    code += `\n`;
    code += `export const $schema = ${stableStringify(schema, null, 4)};\n`;
    code += `\n`;

    code += `export interface $TypeMap {\n`;

    for (const typeMap of typeMaps) {
        for (const typeName of typeMap.typeNames) {
            code += `    ['${typeName}']: ${typeName};\n`;
        }
    }

    code += `}\n`
    code += `\n`;
    code += `export const { as, is } = $createSchemaValidators<$TypeMap>({ allErrors: true, schemas: [ $schema ] });\n`

    return code;
}
