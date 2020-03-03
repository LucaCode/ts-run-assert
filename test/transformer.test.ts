import {assert, structure} from '../lib';

interface Car {
  name: 'Lambo' | 'Vw',
  color: 'Red' | 'Black'
}

enum Color {
  Green,
  Red= 10,
  Black,
}

interface Dog {
  name: string,
  color: Color,
  age?: number,
  hobbies: [string,string,number],
  car: Car,
  ['yo']: number,
  a: () => void,
  l: Date
}

interface I {
  foo: string
}

interface Looping extends I {
  loop: Loop2;
}

interface Loop2 {
  m : Looping;
}

type A = string;

describe('Tests', () => {
  /*
  test('Validate test', () => {
    const errors = createValidator({
      t: TokenType.ValueType,
      v: ValueType.String
    })(10);

    expect(errors.length).toEqual(1);
  });

  test('Validate test 2', () => {
    const errors = createValidator({
      t: TokenType.Union,
      v: [{
        t: TokenType.Object,
        v: {
          name: {
            d: {
              t: TokenType.ValueType,
              v: ValueType.String
            }
          }
        }
      },{
        t: TokenType.Object,
        v: {
          name: {
            d: {
              t: TokenType.ValueType,
              v: ValueType.String
            }
          },
          age: {
            d: {
              t: TokenType.ValueType,
              v: ValueType.Number
            }
          }
        }
      }]
    })({
      name: 'Max',
      age: 100
    });

    expect(errors.length).toEqual(0);
  });
   */
  test('Validate test 2', () => {

    structure<A>();

    //createValidator(structure<Looping>());

    //createValidator(structure<Dog>());
    const data = {
      name: 'Example',
      age: 10,
      hobbies: [],
      car: {
        name: 'Lambo',
        color: 'Pink'
      }
    };

    assert<Dog>(data);
  });
});