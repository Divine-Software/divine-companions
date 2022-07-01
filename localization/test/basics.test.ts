import { translated, Translation } from '../src';

describe('plain string translation', () => {
    it('returns props as-is', () => {
        const base = {
            k1: 'v1',
            gr: {
                k2: 'v2',
            },
        }

        const tran = translated(base) as typeof base;

        expect(tran).toStrictEqual(base);
        expect(tran.k1).toBe(base.k1);
        expect(tran.gr).toStrictEqual(base.gr);
        expect(tran.gr.k2).toBe(base.gr.k2);
    });

    it('handles fallbacks', () => {
        const base = {
            k1: 'v1',
            k2: 'v2',
            k3: 'v3',
            gr: {
                k4: 'v4',
                k5: 'v5',
                k6: 'v6',
            },
        };

        const lang1: Translation<typeof base> = {
            k2: '1v1',
            k3: '1v2',
            gr: {
                k5: '1v5',
                k6: '1v6',
            }
        }

        const lang2: Translation<typeof base> = {
            k3: '2v2',
            gr: {
                k6: '2v6',
            }
        }

        const lang3: Translation<typeof base> = {
            k3: null,
            gr: null,
        }

        const tran = translated(base, lang1, lang2, lang3) as typeof base;

        expect(tran.k1).toBe(base.k1);
        expect(tran.k2).toBe(lang1.k2);
        expect(tran.k3).toBe(lang2.k3);
        expect(tran.gr.k4).toBe(base.gr.k4);
        expect(tran.gr.k5).toBe(lang1.gr?.k5);
        expect(tran.gr.k6).toBe(lang2.gr?.k6);
    });

    it('respects base object structure', () => {
        const base = {
            g1: {
                k1: 'v1',
            }
        };

        const lang: Translation<typeof base & { g2: any}> = {
            g2: {
                k2: 'v2',
            }
        };

        const tran = translated(base, lang) as typeof base & { g2: any};

        expect(tran.g1.k1).toBe(base.g1.k1);
        expect(tran.g2).toBeUndefined()
        expect(tran.g2?.k2).toBeUndefined();
        expect(lang.g2?.k2).toBe('v2');
    });
});
