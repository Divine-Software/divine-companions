/* eslint-disable @typescript-eslint/no-namespace */

export type Attributes = Record<string, string | number | bigint | boolean> | ChildAttr;
export type Child      = string | number | bigint | Element;

export interface Element {
    tagName:  string | null;
    props:    Attributes | null;
    children: Child[]
}

// Internals
const CHILDREN  = Symbol('children');
type  ChildAttr = { [CHILDREN]?: Children };
type  Children  = Child | Array<Children> | boolean | null | undefined;
type _Element   = Element;

export namespace JSX {
    export type Element = _Element;
    export type ElementChildrenAttribute = ChildAttr;

    export interface IntrinsicElements {
        [elementName: string]: Attributes;
    }
}

export function element<T extends Attributes>(tagName: string | ((props: T | null, children: Child[]) => JSX.Element), props: T | null, ..._children: Children[]): JSX.Element {
    const children = _children.flat().filter((e) => e !== null && e !== undefined && typeof e !== 'boolean') as Child[];

    if (typeof tagName === 'function') {
        return tagName(props, children);
    } else {
        return { tagName, props, children }
    }
}

export const fragment = null;
