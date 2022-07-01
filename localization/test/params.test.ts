import { Interpolated, translated, Translation } from '../src';

describe('parameterized translation', () => {
    it('handles plain arguments', () => {
        const base = {
            a0: () => `b0`,
            a1: (p: string) => `b1 ${p}`,
            a2: (p: string, i: number) => `b2 #${i} ${p}`,
            a3: ({p, i, d}: { p: string, i: number, d: Date}) => `b3 ${d.toISOString()} #${i} ${p}`,
        }

        const lang: Translation<typeof base> = {
            a0: () => `l0`,
            a1: (p) => `l1 ${p}`,
            a2: (p, i) => `l2 #${i} ${p}`,
            a3: ({p, i, d}) => `l3 ${d.toISOString()} #${i} ${p}`,
        }

        const tran1 = translated<string | Interpolated<string>>(base) as typeof base;
        const tran2 = translated<string | Interpolated<string>>(base, lang) as typeof base;

        expect(tran1.a0()).toBe('b0');
        expect(tran2.a0()).toBe('l0');
        expect(tran1.a1('s')).toBe('b1 s');
        expect(tran2.a1('s')).toBe('l1 s');
        expect(tran1.a2('s', 1)).toBe('b2 #1 s');
        expect(tran2.a2('s', 1)).toBe('l2 #1 s');
        expect(tran1.a3({p:'s', i: 1, d: new Date(0)})).toBe('b3 1970-01-01T00:00:00.000Z #1 s');
        expect(tran2.a3({p:'s', i: 1, d: new Date(0)})).toBe('l3 1970-01-01T00:00:00.000Z #1 s');
    });

    it('handles complex grammar', () => {
        type Things = 'book' | 'apple' | 'child' | 'son' | 'daughter';

        class Person {
            constructor(public name: string, public gender: 'm' | 'f' | 'n' | 'o') { }
        }

        function gNumber(count: number, noun: { s: string, p: string }) {
            return count === 1 ? noun.s : noun.p;
        }

        // *** English ***
        const enPronouns = { m: 'his', f: 'her', n: 'its', o: 'their' }
        const enThings = {
            book:      { s: 'book',     p: 'books'     },
            apple:     { s: 'apple',    p: 'apples'    },
            child:     { s: 'child',    p: 'children'  },
            son:       { s: 'son',      p: 'sons'      },
            daughter:  { s: 'daughter', p: 'daughters' },
        }

        const en = {
            loves: (who: Person, count: number, what: Things) =>
                `The gentle ${who.name} loves ${enPronouns[who.gender]} little ${gNumber(count, enThings[what])}`,
        }

        // *** Swedish ***
        const svThings = {
            book:      { s: 'bok',    p: 'böcker',  g: 'u' },
            apple:     { s: 'äpple',  p: 'äpplen',  g: 'n' },
            child:     { s: 'barn',   p: 'barn',    g: 'n' },
            son:       { s: 'son',    p: 'söner',   g: 'm' }, // Actually masculine sexus, not masculine grammatical genus
            daughter:  { s: 'dotter', p: 'döttrar', g: 'f' }, // Actually feminine sexus, not feminine grammatical genus
        }

        const sv: Translation<typeof en> = {
            loves: (who, count, what) =>
                `Den ${who.gender === 'm' ? 'vänlige' : 'vänliga'} ${who.name} älskar ${
                    count === 1 ? (svThings[what].g !== 'n' ? 'sin' : 'sitt') : 'sina'
                } ${count === 1 ? (svThings[what].g === 'm' ? 'lille' : 'lilla') : 'små'} ${gNumber(count, svThings[what])}`
        }

        // *** Spanish ***
        const esThings = {
            book:      { s: 'libro',    p: 'libros',   g: 'm' },
            child:     { s: 'hijo',     p: 'hijos',    g: 'n' },
            apple:     { s: 'manzana',  p: 'manzanas', g: 'f' },
            son:       { s: 'hijo',     p: 'hijos',    g: 'm' },
            daughter:  { s: 'hija',     p: 'hijas',    g: 'f' },
        }

        const es: Translation<typeof en> = {
            loves: (who, count, what) =>
                `${who.gender !== 'f' ? 'El buen' : 'La buena'} ${who.name} ama ${
                    count === 1 ? 'su' : 'sus'} ${
                    count === 1 ? (esThings[what].g !== 'f' ? 'pequeño' : 'pequeña') : (esThings[what].g !== 'f' ? 'pequeños' : 'pequeñas')
                } ${gNumber(count, esThings[what])}`
        }

        // Test it
        const english = translated(en) as typeof en;
        const swedish = translated(en, sv) as typeof en;
        const spanish = translated(en, es) as typeof en;

        expect(english.loves({ name: 'R2D2',   gender: 'n' }, 1, 'apple')).toBe('The gentle R2D2 loves its little apple');
        expect(english.loves({ name: 'Vilgot', gender: 'm' }, 2, 'book')).toBe('The gentle Vilgot loves his little books');
        expect(english.loves({ name: 'Nina',   gender: 'f' }, 3, 'child')).toBe('The gentle Nina loves her little children');
        expect(english.loves({ name: 'Adira',  gender: 'o' }, 2, 'daughter')).toBe('The gentle Adira loves their little daughters');
        expect(english.loves({ name: 'Martin', gender: 'm' }, 1, 'son')).toBe('The gentle Martin loves his little son');

        expect(swedish.loves(new Person('R2D2',   'n'), 1, 'apple')).toBe('Den vänliga R2D2 älskar sitt lilla äpple');
        expect(swedish.loves(new Person('Vilgot', 'm'), 2, 'book')).toBe('Den vänlige Vilgot älskar sina små böcker');
        expect(swedish.loves(new Person('Nina',   'f'), 3, 'child')).toBe('Den vänliga Nina älskar sina små barn');
        expect(swedish.loves(new Person('Adira',  'o'), 2, 'daughter')).toBe('Den vänliga Adira älskar sina små döttrar');
        expect(swedish.loves(new Person('Martin', 'm'), 1, 'son')).toBe('Den vänlige Martin älskar sin lille son');

        expect(spanish.loves({ name: 'R2D2',   gender: 'n' }, 1, 'apple')).toBe('El buen R2D2 ama su pequeña manzana');
        expect(spanish.loves({ name: 'Vilgot', gender: 'm' }, 2, 'book')).toBe('El buen Vilgot ama sus pequeños libros');
        expect(spanish.loves({ name: 'Nina',   gender: 'f' }, 3, 'child')).toBe('La buena Nina ama sus pequeños hijos');
        expect(spanish.loves({ name: 'Adira',  gender: 'o' }, 2, 'daughter')).toBe('El buen Adira ama sus pequeñas hijas');
        expect(spanish.loves({ name: 'Martin', gender: 'm' }, 1, 'son')).toBe('El buen Martin ama su pequeño hijo');
    });
});
