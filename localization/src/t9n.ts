type DeepPartialOrNull<T> =
    // eslint-disable-next-line @typescript-eslint/ban-types
    T extends Function ? T :
    T extends object ? { [P in keyof T]?: DeepPartialOrNull<T[P]> | null } :
    T;

/**
 * The base/canonical translation must adhere to this interface.
 *
 * @template T The allowed key types.
 */
export interface BaseTranslation<T> extends Record<string, T | BaseTranslation<T>> { }

/**
 * The type of all translations except the base/canonical translation.
 *
 * @template Base The type of the base/canonical translation.
 */
export type Translation<Base extends BaseTranslation<unknown>> = DeepPartialOrNull<Base>;

/**
 * A dictionary of translations.
 *
 * @template Base The type of the base/canonical translation.
 */
export type Translations<Base extends BaseTranslation<unknown>> = { [lang: string]: Translation<Base> | undefined | null };

/**
 * A translation key function. Useful when specifying the {@link translated} type argument.
 */
export type Interpolated<T> = (...params: any[]) => T

/**
 * A function that builds a merged view of all translations. The merging is done on-demand using a Proxy wrapper.
 *
 * @template T             The allowed key types. Force this type parameter to ensure your translations are what you
 *                         expect.
 * @param    base          The base translation, which defines what keys are available.
 * @param    translations  A dictionary of translations, where the keys are (usually) an RFC 5646 language code, just
 *                         like `Navigator.language` in browsers.
 * @param    languages     Either an exact array of language codes to look up from `translations` (in *increasing* order
 *                         of priority), or a single language tag, which will be transformed into a `[ language,
 *                         language-COUNTRY ]` tuple.
 * @returns                A Proxy-based merged view of the translations.
 */
export function translated<T>(base: BaseTranslation<T>, translations: Translations<typeof base>, languages: string | string[]): typeof base;
/**
 * A function that builds a merged view of all translations. The merging is done on-demand using a Proxy wrapper.
 *
 * @template T             The allowed key types. Force this type parameter to ensure your translations are what you
 *                         expect.
 * @param    base          The base translation, which defines what keys are available.
 * @param    translations  Additional — possibly partial — translations, in *increasing* order of priority, ignoring
 *                         `null`/`undefined` values.
 * @returns                A Proxy-based merged view of the translations.
 */
export function translated<T>(base: BaseTranslation<T>, ...translations: Array<Translation<typeof base> | undefined | null>): typeof base;
export function translated<T>(base: BaseTranslation<T>, ...args: Array<Translation<typeof base> | undefined | null> | [translations: Translations<typeof base>, languages: string | string[]]): typeof base {
    const [ _translations, languages ] = args;

    if (typeof languages === 'string') {
        const [ language, country ] = languages.toLowerCase().split('-'); // Normalize to pre-iOS 10.2 Safari format
        const translations = _translations as Translations<typeof base>;

        return new Proxy(base as any, new T9NProxyHandler([base, ...[language, `${language}-${country?.toUpperCase()}`].map((lang) => translations[lang])]));
    } else if (languages instanceof Array) {
        const translations = _translations as Translations<typeof base>;

        return new Proxy(base as any, new T9NProxyHandler([base, ...languages.map((lang) => translations[lang])]));
    } else {
        return new Proxy(base as any, new T9NProxyHandler([base, ...args as Array<Translation<typeof base> | undefined | null>]));
    }
}

class T9NProxyHandler<T, Tr extends Translation<BaseTranslation<T>> & object> implements ProxyHandler<Tr> {
    constructor(private _candidates: Array<Tr | null | undefined>) { }

    get<K extends keyof Tr>(target: Tr, _pname: string | symbol): Tr[K] | undefined {
        const pname = _pname as K;
        const cands = this._candidates.map((c) => c?.[pname]).filter((v) => v != undefined /* [sic] not null/undefined */);
        const value = this._candidates[0]![pname] == undefined /* [sic] if base prop is null/undefined */ ? undefined : cands[cands.length - 1];

        return typeof value === 'object' && value && Object.getPrototypeOf(value) === Object.prototype
            ? new Proxy(cands[0] as unknown as object, new T9NProxyHandler(cands as any[]))
            : value;
    }
}
