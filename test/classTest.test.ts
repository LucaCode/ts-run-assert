import {assert, TypeAssertionError, ValidationErrorType} from '../lib';

enum Color {
    Black,
    White,
    Brown
}

class Animal {
    private name: string = '';
    private age: number = 0;
    private color: Color = Color.Black;
    private hobbies: string[] = [];
}

class Dog extends Animal {
    wasWalkingOutside: boolean = false;
}

describe('Class Tests (Class, Enum, Array)', () => {
    test('Animal 1 (Wrong (Missing property))', () =>
    {
        expect(() => {
            try {
                assert<Animal>({
                    name: 'Lucky',
                    age: 10,
                    color: Color.Black
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

    test('Animal 2 (Wrong (Unknown enum member))', () =>
    {
        expect(() => {
            try {
                assert<Animal>({
                    name: 'Lucky',
                    age: 10,
                    color: 33,
                    hobbies: []
                });
            }
            catch (err) {
                if(err instanceof TypeAssertionError) {
                    expect(err.errors.filter(e => e.type === ValidationErrorType.EnumMismatch).length).toEqual(1);
                }
                throw err;
            }
        }).toThrow(TypeAssertionError);
    });

    test('Animal 2 (Wrong (Array type))', () =>
    {
        expect(() => {
            try {
                assert<Animal>({
                    name: 'Lucky',
                    age: 10,
                    color: Color.Brown,
                    hobbies: [102,'Swim']
                });
            }
            catch (err) {
                if(err instanceof TypeAssertionError) {
                    expect(err.errors.filter(e => e.type === ValidationErrorType.ValueTypeMismatch).length).toEqual(1);
                }
                throw err;
            }
        }).toThrow(TypeAssertionError);
    });

    test('Animal 2 (Wrong value)', () =>
    {
        expect(() => {
            try {
                assert<Animal>(10);
            }
            catch (err) {
                if(err instanceof TypeAssertionError) {
                    expect(err.errors.filter(e => e.type === ValidationErrorType.ObjectMismatch).length).toEqual(1);
                }
                throw err;
            }
        }).toThrow(TypeAssertionError);
    });
});