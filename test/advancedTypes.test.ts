import {assert, TypeAssertionError, ValidationErrorType} from '../lib';

interface Foo1 {
    bar: string
}

type Foo2 = {bar2: string};

describe('Advanced types Tests', () => {
    test('Union test with match', () =>
    {
        expect(() => {
            assert<Foo1 | Foo2>({
                bar: 'hello'
            });
        }).not.toThrow();
    });

    test('Union test (Wrong (No match))', () =>
    {
        expect(() => {
            try {
                assert<Foo1 | Foo2>({
                    data: 'hello'
                });
            }
            catch (err) {
                if(err instanceof TypeAssertionError) {
                    expect(err.errors.filter(e => e.type === ValidationErrorType.UnionMismatch).length).toEqual(1);
                }
                throw err;
            }
        }).toThrow(TypeAssertionError);
    });

    test('Intersection test with match', () =>
    {
        expect(() => {
            assert<Foo1 & Foo2>({
                bar: 'hello',
                bar2: 'hi'
            });
        }).not.toThrow();
    });

    test('Intersection test (Wrong (Missing))', () =>
    {
        expect(() => {
            try {
                assert<Foo1 & Foo2>({
                    bar2: 'hello'
                });
            }
            catch (err) {
                if(err instanceof TypeAssertionError) {
                    expect(err.errors.filter(e => e.type === ValidationErrorType.PropertyMismatch).length).toEqual(1);
                }
                throw err;
            }
        }).toThrow(TypeAssertionError);
    });
});