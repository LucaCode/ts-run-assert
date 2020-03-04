import {assert, TypeAssertionError} from '../lib';
import {CircularDependencyLimitReachedError} from "../lib";

interface Node {
    content: any,
    next?: Node
}

describe('Node chain (Circular dependency) Tests', () => {
    test('Wrong object.', () =>
    {
        expect(() => {
            assert<Node>({name: 'Hello',content: undefined});
        }).toThrow(TypeAssertionError);
    });

    test('Deep node chain.', () =>
    {
        expect(() => {
            assert<Node>(
                {
                    content: 'Max', next: {
                        content: 'Luca', next: {
                            content: 'Tara'
                        }
                    }
                });
        }).not.toThrow(TypeAssertionError);
    });

    test('Deep node chain with missing content.', () =>
    {
        expect(() => {
            try {
                assert<Node>(
                    {
                        content: 'Max', next: {
                            content: 'Luca', next: {
                            }
                        }
                    });
            }
            catch (err) {
                expect((err.errorCount as TypeAssertionError)).toEqual(1);
                throw err;
            }
        }).toThrow(TypeAssertionError);
    });

    test('Deep node chain exceeded circular dependencies limit.', () =>
    {
        expect(() => {
            assert<Node>(
                {
                    content: 'Max', next: {
                        content: 'Luca', next: {
                            content: 'Yo', next: {
                                content: 'O', next: {
                                    content: 10, next: {
                                        content: 12
                                    }
                                }
                            }
                        }
                    }
                },3);
        }).toThrow(CircularDependencyLimitReachedError);
    });

    test('Deep node chain.', () =>
    {
        expect(() => {
            assert<Node>(
                {
                    content: 'Max', next: {
                        content: 'Luca', next: {
                            content: 'Yo', next: {
                                content: 'O', next: {
                                    content: 10, next: {
                                        content: 12
                                    }
                                }
                            }
                        }
                    }
                },20);
        }).not.toThrow();
    });
});