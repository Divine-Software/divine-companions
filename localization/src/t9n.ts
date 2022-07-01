type DeepPartialOrNull<T> =
    // eslint-disable-next-line @typescript-eslint/ban-types
    T extends Function ? T :
    T extends object ? { [P in keyof T]?: DeepPartialOrNull<T[P]> | null } :
    T;

export interface BaseTranslation<T> extends Record<string, T | BaseTranslation<T>> { }
export type Translation<Base extends BaseTranslation<unknown>> = DeepPartialOrNull<Base>;
export type Interpolated<T> = (...params: any[]) => T

export function translated<T>(base: BaseTranslation<T>, ...translations: Translation<typeof base>[]): typeof base {
    return new Proxy(base as any, new T9NProxyHandler([base, ...translations]));
}

class T9NProxyHandler<T, Tr extends Translation<BaseTranslation<T>> & object> implements ProxyHandler<Tr> {
    constructor(private _candidates: Tr[]) { }

    get<K extends keyof Tr>(target: Tr, _pname: string | symbol): Tr[K] | undefined {
        const pname = _pname as K;
        const cands = this._candidates.map((c) => c[pname]).filter((v) => v != undefined /* [sic] not null/undefined */);
        const value = this._candidates[0][pname] == undefined /* [sic] if base prop is null/undefined */ ? undefined : cands[cands.length - 1];

        return typeof value === 'object' && value && Object.getPrototypeOf(value) === Object.prototype
            ? new Proxy(cands[0] as unknown as object, new T9NProxyHandler(cands as any[]))
            : value;
    }
}
