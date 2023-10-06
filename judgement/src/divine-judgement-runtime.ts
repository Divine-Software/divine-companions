import Ajv, { ErrorObject, Options, ValidateFunction } from 'ajv';

export class SchemaError extends TypeError {
    constructor(public errors: ErrorObject[] = [], public data: unknown, source = '') {
        super((() => {
            const err = { instancePath: '', message: 'Unknown schema error', ...(errors?.[0] ?? {}) };
            return `${source}#${err.instancePath}: ${err.message}`;
        })());
    }

    override toString(): string {
        return `[${this.constructor.name}: ${this.message}]`;
    }
}

export interface SchemaValidators<TypeMap extends object> {
    as<K extends keyof TypeMap>(type: K, data: TypeMap[K], source?: string): TypeMap[K];
    is<K extends keyof TypeMap>(type: K, data: unknown): data is TypeMap[K];
}

export function createSchemaValidators<TypeMap extends object>(options?: Options): SchemaValidators<TypeMap> {
    const ajv = new Ajv(options);
    const validators: { [K in keyof TypeMap]?: ValidateFunction } = {};

    const as = <K extends keyof TypeMap>(type: K, data: unknown, source?: string) => {
        const validate = validators[type] ??= ajv.getSchema(`#/definitions/${String(type)}`);

        if (!validate) {
            throw new TypeError(`Invalid schema type: ${String(type)}`);
        } else if (validate(data) !== true) {
            throw new SchemaError(validate.errors ?? undefined, data, source);
        } else {
            return data as TypeMap[K];
        }
    };

    const is = <K extends keyof TypeMap>(type: K, data: unknown): data is TypeMap[K] => {
        try {
            return as(type, data) === data;
        } catch (err) {
            if (err instanceof SchemaError) {
                return false;
            } else {
                throw err;
            }
        }
    }

    return { as, is }
}
