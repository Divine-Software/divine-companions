/* @jsx     jsx.element */
/* @jsxFrag jsx.fragment */
import { Interpolated, translated } from '../src';
import * as jsx from './jsx';

describe('rich-text translation', () => {
    function Br(props: jsx.Attributes, children: jsx.Child[]) {
        return <br key={Object.keys(props).toString()} children={children.length}/>;
    }

    it('can produce JSX', () => {
        const base = {
            k1: 'v1',
            k2: () => 'v2',
            k3: () => <span class="v3">with <i>markup</i> and {[null, false, true, void 0, 'component']} <Br b="B" a="A"><br/> <a/></Br></span>,
            k4: () => <>v4 <is/> <a fragment/></>,
        }

        const tran = translated<string | Interpolated<string | jsx.Element>>(base) as typeof base;

        expect(tran.k1).toBe('v1');
        expect(tran.k2()).toBe('v2');
        expect(tran.k3()).toStrictEqual<jsx.Element>({
            tagName:  'span',
            props:    { class: 'v3'},
            children: [
                'with ', {
                    tagName:  'i',
                    props:    null,
                    children: [ 'markup' ]
                }, ' and ', 'component', ' ', {
                    tagName:  'br',
                    props:    { key: 'b,a', children: 3 },
                    children: [],
                }
            ]
        });
        expect(tran.k4()).toStrictEqual<jsx.Element>({
            tagName:  null,
            props:    null,
            children: [
                'v4 ', {
                    tagName:  'is',
                    props:    null,
                    children: [],
                }, ' ', {
                    tagName:  'a',
                    props:    { fragment: true },
                    children: [],
                },
            ]
        })
    });
});
